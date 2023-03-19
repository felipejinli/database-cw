-- postgres/init.sql

-- Start a transaction
BEGIN;

-- Create tables
CREATE TABLE movies (
    movieId SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL
);

CREATE TABLE genres (
    movieId INTEGER REFERENCES movies (movieId),
    genre VARCHAR(50) NOT NULL,
    PRIMARY KEY (movieId, genre)
);

CREATE TABLE links (
    movieId INTEGER PRIMARY KEY REFERENCES movies (movieId),
    imdbId INTEGER UNIQUE NOT NULL,
    tmdbId INTEGER 
);

CREATE TABLE imdb_basics (
    imdbId INTEGER PRIMARY KEY REFERENCES links (imdbId),
    titleType VARCHAR(50),
    primaryTitle VARCHAR(255) NOT NULL,
    originalTitle VARCHAR(255) NOT NULL,
    startYear INTEGER NOT NULL,
    runtimeMinutes INTEGER
);

CREATE TABLE imdb_directors (
    imdbId INTEGER REFERENCES imdb_basics (imdbId),
    director_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (imdbId, director_name)
);

CREATE TABLE imdb_actors (
    imdbId INTEGER REFERENCES imdb_basics (imdbId),
    ordering INTEGER NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    characters VARCHAR(1024),
    PRIMARY KEY (imdbId, ordering)
);

CREATE TABLE usersINT (
    userId INTEGER PRIMARY KEY
);

CREATE TABLE usersUUID (
    userId VARCHAR(32) PRIMARY KEY
);

CREATE TABLE ratings (
    userId INTEGER REFERENCES usersINT (userId),
    movieId INTEGER REFERENCES movies (movieId),
    rating DECIMAL(2,1) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    PRIMARY KEY (userId, movieId)
);

CREATE TABLE tags (
    userId INTEGER REFERENCES usersINT (userId),
    movieId INTEGER REFERENCES movies (movieId),
    tag VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    PRIMARY KEY (userId, movieId, tag)
);

CREATE TABLE personality_data (
    userId VARCHAR(32) PRIMARY KEY REFERENCES usersUUID (userId),
    openness DECIMAL(3,1) NOT NULL,
    agreeableness DECIMAL(3,1) NOT NULL,
    emotional_stability DECIMAL(3,1) NOT NULL,
    conscientiousness DECIMAL(3,1) NOT NULL,
    extraversion DECIMAL(3,1) NOT NULL,
    assigned_metric VARCHAR(50) NOT NULL,
    assigned_condition VARCHAR(50) NOT NULL,
    is_personalized INTEGER NOT NULL,
    enjoy_watching INTEGER NOT NULL
);


CREATE TABLE personality_ratings (
    userId VARCHAR(32) REFERENCES usersUUID (userId),
    movieId INTEGER REFERENCES movies (movieId),
    rating DECIMAL(2,1) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    PRIMARY KEY (userId, movieId, timestamp)
);

CREATE TABLE personality_predicted_ratings (
    userId VARCHAR(32) REFERENCES usersUUID (userId),
    movieId INTEGER REFERENCES movies (movieId),
    predicted_rating DECIMAL(11,10) NOT NULL,
    PRIMARY KEY (userId, movieId)
);

-- Extra tables (BEFORE import)
CREATE TEMP TABLE temp_ratings (
    userId INTEGER,
    movieId INTEGER,
    rating REAL,
    timestamp INTEGER
);

CREATE TEMP TABLE temp_tags (
    userId INTEGER,
    movieId INTEGER,
    tag VARCHAR(255),
    timestamp INTEGER
);

-- Importing CSV data
COPY movies FROM '/docker-entrypoint-initdb.d/movies.csv' DELIMITER ',' CSV HEADER;
COPY genres FROM '/docker-entrypoint-initdb.d/genres.csv' DELIMITER ',' CSV HEADER;
COPY links FROM '/docker-entrypoint-initdb.d/links.csv' DELIMITER ',' CSV HEADER;
COPY imdb_basics FROM '/docker-entrypoint-initdb.d/imdbBasics.csv' DELIMITER ',' CSV HEADER;
COPY imdb_directors FROM '/docker-entrypoint-initdb.d/imdbDirectors.csv' DELIMITER ',' CSV HEADER;
COPY imdb_actors FROM '/docker-entrypoint-initdb.d/imdbActors.csv' DELIMITER ',' CSV HEADER;

COPY usersINT FROM '/docker-entrypoint-initdb.d/usersINT.csv' DELIMITER ',' CSV HEADER;
COPY usersUUID FROM '/docker-entrypoint-initdb.d/usersUUID.csv' DELIMITER ',' CSV HEADER;
COPY personality_data FROM '/docker-entrypoint-initdb.d/personality-data.csv' DELIMITER ',' CSV HEADER;
COPY personality_ratings FROM '/docker-entrypoint-initdb.d/personality-ratings-deduped.csv' DELIMITER ',' CSV HEADER;
COPY personality_predicted_ratings FROM '/docker-entrypoint-initdb.d/personalityPredictedRating-deduped.csv' DELIMITER ',' CSV HEADER;

-- temp_* is used to convert the epoch timestamp to a normal timestamp
COPY temp_ratings FROM '/docker-entrypoint-initdb.d/ratings.csv' DELIMITER ',' CSV HEADER;
COPY temp_tags FROM '/docker-entrypoint-initdb.d/tags.csv' DELIMITER ',' CSV HEADER;

-- Extra tables (AFTER import)
INSERT INTO ratings (userId, movieId, rating, timestamp)
SELECT userId, movieId, rating, to_timestamp(timestamp) FROM temp_ratings;
DROP TABLE temp_ratings;

INSERT INTO tags (userId, movieId, tag, timestamp)
SELECT userId, movieId, tag, to_timestamp(timestamp) FROM temp_tags;
DROP TABLE temp_tags;

CREATE TABLE actor_characters (
  imdbid INTEGER,
  ordering INTEGER,
  character_name VARCHAR(255),
  PRIMARY KEY (imdbid, ordering, character_name),
  FOREIGN KEY (imdbid, ordering) REFERENCES imdb_actors (imdbid, ordering)
);

CREATE OR REPLACE FUNCTION populate_actor_characters()
RETURNS VOID AS $$
BEGIN
    INSERT INTO actor_characters (imdbid, ordering, character_name)
    SELECT imdbId, ordering, unnest(string_to_array(characters, ','))
    FROM imdb_actors
    WHERE characters IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

SELECT populate_actor_characters();

-- Commit the transaction
COMMIT;