WITH     full_preview_audience AS (
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
			)
  SELECT    *
  FROM      overall_prediction;