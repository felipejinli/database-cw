const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const SSE = require('express-sse');
const pgp = require('pg-promise')();
const QueryFile = pgp.QueryFile;
const path = require('path');
const compression = require('compression');

//ANCHOR - Settings
const BATCH_SIZE = 50;

//ANCHOR - Express with middleware configurations
const app = express();

app.use(compression());
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


//ANCHOR - Creation of QueryFile objects (prevents rereading of SQL files)
const predictRatingsQuery = new QueryFile(path.join(__dirname, 'sql', '5_predicted_rating.sql'), { minify: true });
const predictRatingsWithStepsQuery = new QueryFile(path.join(__dirname, 'sql', '5_predicted_rating_with_steps.sql'), { minify: true });


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
		const { rows } = await pool.query(pgp.as.format(predictRatingsQuery, [movieId, previewSize]));

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

		// Execute the query and send the results via SSE
		const result = await pool.query(pgp.as.format(predictRatingsWithStepsQuery, [movieId, previewSize]));

		const batchedRows = result.rows.reduce((batches, row) => {
			const lastBatch = batches[batches.length - 1];

			// console.log('FJL: 5-steps lastBatch:', lastBatch);

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
					console.log('FJL: sending SSE batch', row.step);
				});
			}, index * 1000); // Send each batch with a 1-second delay
		});

	} catch (err) {
		console.log('FJL (ERROR): ', err.message);
		res.status(500).json({ error: err.message });
	}
});




//ANCHOR - Start Express server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
