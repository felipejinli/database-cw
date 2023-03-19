import { useState, useEffect } from 'react';
import axios from 'axios';

const UseCase1 = () => {
	const [movies, setMovies] = useState([]);

	useEffect(() => {
		const fetchMovies = async () => {
			try {
				const response = await axios.get('http://localhost:3001/api/movies');
				console.log(`uc1 response: ${response.data}`);
				setMovies(response.data);
			} catch (error) {
				console.error('Error fetching movie data:', error);
			}
		};
		console.log('entering useEffect: ', movies);
		fetchMovies();
	}, []);

	return (
		<div>
			<h2>FJL Use Case 1: Visual browsing of the films dataset</h2>
			<ul>
				{movies.map((movie) => (
					<li key={movie.movieid}>{movie.title}</li>
				))}
			</ul>
		</div>
	);
};

export default UseCase1;