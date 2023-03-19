CREATE OR REPLACE FUNCTION populate_actor_characters() RETURNS VOID AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN (SELECT imdbid, ordering, characters FROM imdb_actors) LOOP
    INSERT INTO actor_characters (imdbid, ordering, character_name)
    SELECT rec.imdbid, rec.ordering, regexp_split_to_table(rec.characters, E'\\|');
  END LOOP;
END;
$$ LANGUAGE plpgsql;