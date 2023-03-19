-- postgres/init.sql

-- genres
CREATE TABLE genres (
  movie_id INTEGER,
  genre VARCHAR(50),
  PRIMARY KEY (movie_id, genre)
);

-- imdb_actors
CREATE TABLE imdb_actors (
  imdb_id VARCHAR(50),
  ordering INTEGER,
  actor_name VARCHAR(255),
  category VARCHAR(50),
  characters VARCHAR(255),
  PRIMARY KEY (imdb_id, ordering)
);

-- imdb_basics
CREATE TABLE imdb_basics (
  imdb_id VARCHAR(50) PRIMARY KEY,
  title_type VARCHAR(50),
  primary_title VARCHAR(255),
  original_title VARCHAR(255),
  start_year INTEGER,
  runtime_minutes INTEGER
);

-- imdb_directors
CREATE TABLE imdb_directors (
  id SERIAL PRIMARY KEY,
  imdb_id VARCHAR(50),
  director_name VARCHAR(255)
);

-- links
CREATE TABLE links (
  movie_id INTEGER PRIMARY KEY,
  imdb_id VARCHAR(50),
  tmdb_id INTEGER
);

-- movies
CREATE TABLE movies (
  movie_id INTEGER PRIMARY KEY,
  title VARCHAR(255)
);

-- personality_data
CREATE TABLE personality_data (
  user_id INTEGER PRIMARY KEY,
  openness REAL,
  agreeableness REAL,
  emotional_stability REAL,
  conscientiousness REAL,
  extraversion REAL,
  assigned_metric VARCHAR(50),
  assigned_condition VARCHAR(50),
  is_personalized BOOLEAN,
  enjoy_watching REAL
);

-- personality_ratings
CREATE TABLE personality_ratings (
  user_id INTEGER,
  movie_id INTEGER,
  rating REAL,
  timestamp INTEGER,
  PRIMARY KEY (user_id, movie_id),
  FOREIGN KEY (user_id) REFERENCES personality_data (user_id),
  FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
);

-- personality_predicted_rating
CREATE TABLE personality_predicted_rating (
  user_id INTEGER,
  movie_id INTEGER,
  predicted_rating REAL,
  PRIMARY KEY (user_id, movie_id),
  FOREIGN KEY (user_id) REFERENCES personality_data (user_id),
  FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
);

-- ratings
CREATE TABLE ratings (
  user_id INTEGER,
  movie_id INTEGER,
  rating REAL,
  timestamp INTEGER,
  PRIMARY KEY (user_id, movie_id)
);

-- tags
CREATE TABLE tags (
  user_id INTEGER,
  movie_id INTEGER,
  tag VARCHAR(255),
  timestamp INTEGER,
  PRIMARY KEY (user_id, movie_id, tag),
  FOREIGN KEY (movie_id) REFERENCES movies (movie_id)
);

-- Importing CSV data

COPY genres FROM '/docker-entrypoint-initdb.d/genres.csv' DELIMITER ',' CSV HEADER;
COPY imdb_actors FROM '/docker-entrypoint-initdb.d/imdbActors.csv' DELIMITER ',' CSV HEADER;
COPY imdb_basics FROM '/docker-entrypoint-initdb.d/imdbBasics.csv' DELIMITER ',' CSV HEADER;
-- Since some movies can have multiple directors, we defined an id column as a serial primary key but csv file does not have this column.
COPY imdb_directors(imdb_id, director_name) FROM '/docker-entrypoint-initdb.d/imdbDirectors.csv' DELIMITER ',' CSV HEADER;
COPY links FROM '/docker-entrypoint-initdb.d/links.csv' DELIMITER ',' CSV HEADER;
COPY movies FROM '/docker-entrypoint-initdb.d/movies.csv' DELIMITER ',' CSV HEADER;
COPY personality_data FROM '/docker-entrypoint-initdb.d/personality-data.csv' DELIMITER ',' CSV HEADER;
COPY personality_ratings FROM '/docker-entrypoint-initdb.d/personality-ratings.csv' DELIMITER ',' CSV HEADER;
COPY personality_predicted_rating FROM '/docker-entrypoint-initdb.d/personalityPredictedRating.csv' DELIMITER ',' CSV HEADER;
COPY ratings FROM '/docker-entrypoint-initdb.d/ratings.csv' DELIMITER ',' CSV HEADER;
COPY tags FROM '/docker-entrypoint-initdb.d/tags.csv' DELIMITER ',' CSV HEADER;
