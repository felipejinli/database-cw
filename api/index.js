const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const SSE = require('express-sse');
const pgp = require('pg-promise')();
const QueryFile = pgp.QueryFile;
const path = require('path');
const compression = require('compression');
const redis = require('redis');
const asyncRedis = require('async-redis');
const fs = require('fs');

//ANCHOR - Settings
const BATCH_SIZE = 2;

//ANCHOR - Setting up Redis client for caching
const redisClient = asyncRedis.createClient({
	host: 'redis', // This should match the service name in docker-compose.yml
	port: 6379
});

redisClient.on('error', (err) => {
	console.error('Error connecting to Redis:', err);
});

const cacheResults = async (key, expireInSeconds, queryFunction) => {
	const cachedResults = await redisClient.get(key);
	if (cachedResults) {
		console.log(`FJL: getting from cache ${key} = ${cachedResults}`);
		return JSON.parse(cachedResults);
	}
	console.log('FJL: not getting from cache ', key);
	const results = await queryFunction();
	await redisClient.setex(key, expireInSeconds, JSON.stringify(results));
	return results;
};

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
	port: 5432,
	ssl: {
		rejectUnauthorized: false,
		ca: fs.readFileSync("./certs/server.crt").toString(),
		key: fs.readFileSync("./certs/server.key").toString(),
		cert: fs.readFileSync("./certs/server.crt").toString(),
	},
});


//ANCHOR - Creation of QueryFile objects (prevents rereading of SQL files)
const predictRatingsQuery = new QueryFile(path.join(__dirname, 'sql', '5_predicted_rating.sql'), { minify: true });
const predictRatingsWithStepsQuery = new QueryFile(path.join(__dirname, 'sql', '5_predicted_rating_with_steps.sql'), { minify: true });


//SECTION - API endpoints
app.get('/api/movies', async (req, res) => {
	try {
		// NOTE: cacheKey='all_movies'; expireInSeconds=60*60; means that the results will be cached for 1 hour
		const rows = await cacheResults('all_movies', 60 * 60, async () => {
			const result = await pool.query('SELECT * FROM movies;');
			return result.rows;
		});

		res.status(200).json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});


//ANCHOR - UseCase 5 - Predicted Rating
app.get('/api/movies/search', async (req, res) => {
	try {
		const { search } = req.query;

		const rows = await cacheResults(`movie_search:${search}`, 60 * 30, async () => {
			const result = await pool.query('SELECT * FROM movies WHERE title ILIKE $1 LIMIT 10', [`%${search}%`]);
			return result.rows;
		});

		res.status(200).json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});


app.get('/api/movies/:movieId/preview-max-count', async (req, res) => {
	try {
		const { movieId } = req.params;
		const cacheKey = `preview-max-count:${movieId}`;
		const expireInSeconds = 60 * 60; // 1 hour

		const numRatings = await cacheResults(cacheKey, expireInSeconds, async () => {
			const result = await pool.query('SELECT COUNT(*) as num_ratings FROM ratings WHERE movieId = $1', [movieId]);
			return result.rows[0].num_ratings;
		});
		res.status(200).json(numRatings);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});


app.get('/api/movies/:movieId/predicted-rating/:previewSize', async (req, res) => {
	try {
		const { movieId, previewSize } = req.params;

		const cacheKey = `predicted-rating:${movieId}:${previewSize}`;
		const expireInSeconds = 60 * 30; // 30 minutes

		const queryFunction = async () => {
			const { rows } = await pool.query(pgp.as.format(predictRatingsQuery, [movieId, previewSize]));
			return rows[0];
		};

		const result = await cacheResults(cacheKey, expireInSeconds, queryFunction);

		res.status(200).json(result);
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
//!SECTION




//ANCHOR - Start Express server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
