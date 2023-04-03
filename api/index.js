const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const SSE = require('express-sse');
const pgp = require('pg-promise')();
const QueryFile = pgp.QueryFile;
const path = require('path');


//ANCHOR - Express with middleware configurations
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

//ANCHOR - Database connection
const pool = new Pool({
	host: 'postgres', // This should match the service name in docker-compose.yml
	user: 'ucl2023',
	password: 'group3',
	database: 'movielens',
	port: 5432
});

//ANCHOR - API endpoints
app.get('/api/movies', async (req, res) => {
	try {
		const { rows } = await pool.query('SELECT * FROM movies;');
		console.log('FJL: hitting api endpoint /api/movies');
		res.status(200).json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/api/movies/search', async (req, res) => {
	try {
		const { search } = req.query;
		console.log('searching for movie: ', search);
		const { rows } = await pool.query('SELECT * FROM movies WHERE title ILIKE $1 LIMIT 10', [`%${search}%`]);
		res.status(200).json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/api/movies/:movieId/preview-max-count', async (req, res) => {
	console.log('FJL: hitting api endpoint /api/movies/:movieId/preview-max-count');
	try {
		const { movieId } = req.params;
		const { rows } = await pool.query('SELECT COUNT(*) as num_ratings FROM ratings WHERE movieId = $1', [movieId]);
		res.status(200).json(rows[0].num_ratings);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/api/movies/:movieId/predicted-rating/:previewSize', async (req, res) => {
	try {
		const { movieId, previewSize } = req.params;

		const queryFile = new QueryFile(path.join(__dirname, 'sql', '5_predicted_rating.sql'), { minify: true });

		const values = [movieId, previewSize];

		const { rows } = await pool.query(pgp.as.format(queryFile, values));
		res.status(200).json(rows[0]);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

app.get('/api/movies/:movieId/predicted-rating-with-steps/:previewSize', async (req, res) => {
	try {
		const { movieId, previewSize } = req.params;

		const sse = new SSE();

		// Initialize SSE stream and send partial results
		sse.init(req, res);

		const predictedRatingWithStepsQuery = `
		WITH      full_preview_audience AS (
			SELECT    userId,
					  TIMESTAMP
			FROM      ratings
			WHERE     movieId = $1
			),
			preview_audience AS (
			SELECT    *
			FROM      full_preview_audience
			ORDER BY  TIMESTAMP
			LIMIT     $2
			),
			user_averages AS (
			SELECT    userId,
					  AVG(rating) AS average_rating
			FROM      ratings
			GROUP BY  userId
			),
			preview_ratings AS (
			SELECT    DISTINCT r.userId,
					  r.movieId,
					  r.rating,
					  r.rating - ua.average_rating AS centered_rating
			FROM      ratings r
			JOIN      user_averages ua ON r.userId = ua.userId
			WHERE     r.userId IN (
					  SELECT    userId
					  FROM      preview_audience
					  )
			),
			broader_ratings AS (
			SELECT    DISTINCT r.userId,
					  r.movieId,
					  r.rating,
					  r.rating - ua.average_rating AS centered_rating
			FROM      ratings r
			JOIN      user_averages ua ON r.userId = ua.userId
			WHERE     r.userId NOT IN (
					  SELECT    userId
					  FROM      preview_audience
					  )
			AND       r.movieId <> $1
			),
			--     note: movieId=417 can't appear since broader ratings hasn't seen
			common_movies AS (
			SELECT    p.userId AS preview_user,
					  b.userId AS broader_user,
					  p.movieId,
					  p.centered_rating AS preview_centered_rating,
					  b.centered_rating AS broader_centered_rating
			FROM      preview_ratings p
			JOIN      broader_ratings b ON p.movieId = b.movieId
			AND       p.userId != b.userId
			),
			dot_product AS (
			SELECT    preview_user,
					  broader_user,
					  SUM(preview_centered_rating * broader_centered_rating) AS dot_product
			FROM      common_movies
			GROUP BY  preview_user,
					  broader_user
			),
			preview_norms AS (
			SELECT    userId,
					  SQRT(SUM(centered_rating * centered_rating)) AS norm
			FROM      preview_ratings
			GROUP BY  userId
			),
			broader_norms AS (
			SELECT    userId,
					  SQRT(SUM(centered_rating * centered_rating)) AS norm
			FROM      broader_ratings
			GROUP BY  userId
			),
			cosine_similarity AS (
			SELECT    dp.preview_user,
					  dp.broader_user,
					  CASE
								WHEN (p_norm.norm * b_norm.norm) = 0 THEN 0
								ELSE dot_product / (p_norm.norm * b_norm.norm)
					  END AS similarity,
					  ROW_NUMBER() OVER (
					  PARTITION BY dp.broader_user
					  ORDER BY  CASE
										  WHEN (p_norm.norm * b_norm.norm) = 0 THEN 0
										  ELSE dot_product / (p_norm.norm * b_norm.norm)
								END DESC
					  ) AS RANK
			FROM      dot_product dp
			JOIN      preview_norms p_norm ON dp.preview_user = p_norm.userId
			JOIN      broader_norms b_norm ON dp.broader_user = b_norm.userId
			),
			knn_for_broader_user AS (
			SELECT    preview_user,
					  broader_user,
					  similarity,
					  RANK
			FROM      cosine_similarity
			WHERE     RANK <= $2
			),

			weighted_movies_ratings AS (
			SELECT    knn.preview_user,
					  knn.broader_user,
					  knn.similarity * pa.rating AS weighted_movie_rating, -- note: doesn't have to be centred rating you multiply by
					  pa.movieId
			FROM      knn_for_broader_user knn
			JOIN      preview_ratings pa ON knn.preview_user = pa.userId
			WHERE     pa.movieId = $1
			),
			predicted_rating AS (
			SELECT    wmr.broader_user,
					  CASE
								WHEN SUM(knn.similarity) = 0 THEN 0
								WHEN SUM(wmr.weighted_movie_rating) < 0 THEN 0
								ELSE CASE
										  WHEN SUM(wmr.weighted_movie_rating) / SUM(knn.similarity) > 5 THEN 5
										  WHEN SUM(wmr.weighted_movie_rating) / SUM(knn.similarity) < 0 THEN 0
										  ELSE ROUND(
										  SUM(wmr.weighted_movie_rating) / SUM(knn.similarity),
										  3
										  )
								END
					  END AS predicteWITH      full_preview_audience AS (
			SELECT    userId,
					  TIMESTAMP
			FROM      ratings
			WHERE     movieId = $1
			),
			preview_audience AS (
			SELECT    *
			FROM      full_preview_audience
			ORDER BY  TIMESTAMP
			LIMIT     $2
			),
			user_averages AS (
			SELECT    userId,
					  AVG(rating) AS average_rating
			FROM      ratings
			GROUP BY  userId
			),
			preview_ratings AS (
			SELECT    DISTINCT r.userId,
					  r.movieId,
					  r.rating,
					  r.rating - ua.average_rating AS centered_rating
			FROM      ratings r
			JOIN      user_averages ua ON r.userId = ua.userId
			WHERE     r.userId IN (
					  SELECT    userId
					  FROM      preview_audience
					  )
			),
			broader_ratings AS (
			SELECT    DISTINCT r.userId,
					  r.movieId,
					  r.rating,
					  r.rating - ua.average_rating AS centered_rating
			FROM      ratings r
			JOIN      user_averages ua ON r.userId = ua.userId
			WHERE     r.userId NOT IN (
					  SELECT    userId
					  FROM      preview_audience
					  )
			AND       r.movieId <> $1
			),
			--     note: movieId=417 can't appear since broader ratings hasn't seen
			common_movies AS (
			SELECT    p.userId AS preview_user,
					  b.userId AS broader_user,
					  p.movieId,
					  p.centered_rating AS preview_centered_rating,
					  b.centered_rating AS broader_centered_rating
			FROM      preview_ratings p
			JOIN      broader_ratings b ON p.movieId = b.movieId
			AND       p.userId != b.userId
			),
			dot_product AS (
			SELECT    preview_user,
					  broader_user,
					  SUM(preview_centered_rating * broader_centered_rating) AS dot_product
			FROM      common_movies
			GROUP BY  preview_user,
					  broader_user
			),
			preview_norms AS (
			SELECT    userId,
					  SQRT(SUM(centered_rating * centered_rating)) AS norm
			FROM      preview_ratings
			GROUP BY  userId
			),
			broader_norms AS (
			SELECT    userId,
					  SQRT(SUM(centered_rating * centered_rating)) AS norm
			FROM      broader_ratings
			GROUP BY  userId
			),
			cosine_similarity AS (
			SELECT    dp.preview_user,
					  dp.broader_user,
					  CASE
								WHEN (p_norm.norm * b_norm.norm) = 0 THEN 0
								ELSE dot_product / (p_norm.norm * b_norm.norm)
					  END AS similarity,
					  ROW_NUMBER() OVER (
					  PARTITION BY dp.broader_user
					  ORDER BY  CASE
										  WHEN (p_norm.norm * b_norm.norm) = 0 THEN 0
										  ELSE dot_product / (p_norm.norm * b_norm.norm)
								END DESC
					  ) AS RANK
			FROM      dot_product dp
			JOIN      preview_norms p_norm ON dp.preview_user = p_norm.userId
			JOIN      broader_norms b_norm ON dp.broader_user = b_norm.userId
			),
			knn_for_broader_user AS (
			SELECT    preview_user,
					  broader_user,
					  similarity,
					  RANK
			FROM      cosine_similarity
			WHERE     RANK <= $2
			),

			weighted_movies_ratings AS (
			SELECT    knn.preview_user,
					  knn.broader_user,
					  knn.similarity * pa.rating AS weighted_movie_rating, -- note: doesn't have to be centred rating you multiply by
					  pa.movieId
			FROM      knn_for_broader_user knn
			JOIN      preview_ratings pa ON knn.preview_user = pa.userId
			WHERE     pa.movieId = $1
			),
			predicted_rating AS (
			SELECT    wmr.broader_user,
					  CASE
								WHEN SUM(knn.similarity) = 0 THEN 0
								WHEN SUM(wmr.weighted_movie_rating) < 0 THEN 0
								ELSE CASE
										  WHEN SUM(wmr.weighted_movie_rating) / SUM(knn.similarity) > 5 THEN 5
										  WHEN SUM(wmr.weighted_movie_rating) / SUM(knn.similarity) < 0 THEN 0
										  ELSE ROUND(
										  SUM(wmr.weighted_movie_rating) / SUM(knn.similarity),
										  3
										  )
								END
					  END AS predicted_rating
			FROM      weighted_movies_ratings wmr
			JOIN      knn_for_broader_user knn ON knn.preview_user = wmr.preview_user
			AND       knn.broader_user = wmr.broader_user
			GROUP BY  wmr.broader_user
			),
			overall_prediction AS (
			SELECT    ROUND(AVG(predicted_rating), 3) AS "Predicted average broader audience rating",
					  ROUND(STDDEV(predicted_rating), 3)
			FROM      predicted_rating
			),
		result_set AS (
		  SELECT 'preview_ratings' as step, row_to_json(preview_ratings.*) as data FROM preview_ratings
		  UNION ALL
		  SELECT 'cosine_similarity' as step, row_to_json(cosine_similarity.*) as data FROM cosine_similarity
		  UNION ALL
		  SELECT 'predicted_rating' as step, row_to_json(predicted_rating.*) as data FROM predicted_rating
		  UNION ALL
		  SELECT 'overall_prediction' as step, row_to_json(overall_prediction.*) as data FROM overall_prediction
		)
		SELECT
		  step,
		  json_agg(data) as data
		FROM result_set
		GROUP BY step;
	  `;

		// Execute the query and send the results via SSE
		const result = await pool.query(predictedRatingWithStepsQuery, [movieId, previewSize]);

		const batchedRows = result.rows.reduce((batches, row) => {
			const lastBatch = batches[batches.length - 1];

			if (!lastBatch || lastBatch.length >= BATCH_SIZE) {
				batches.push([row]);
			} else {
				lastBatch.push(row);
			}

			return batches;
		}, []);

		batchedRows.forEach((batch, index) => {
			setTimeout(() => {
				batch.forEach(row => {
					sse.send({ step: row.step, data: row.data }, row.step);
				});
			}, index * 1000); // Send each batch with a 1-second delay
		});

	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});




//ANCHOR - Start Express server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
