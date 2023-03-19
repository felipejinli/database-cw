const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

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
		const { rows } = await pool.query('SELECT * FROM movies');
		res.status(200).json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

//ANCHOR - Start Express server
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
