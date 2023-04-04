import React, { useState, useEffect } from 'react';
import { AutoComplete, InputGroup } from 'rsuite';
import axios from 'axios';

const AutocompleteSearch = ({ onMovieSelect }) => {
	const [inputValue, setInputValue] = useState('');
	const [movies, setMovies] = useState([]);

	useEffect(() => {
		console.log('FJL: automcomplete useEffect', inputValue);
		if (inputValue) {
			fetchMovies(inputValue);
			console.log('FJL: fetching movie w/', inputValue);
		}
	}, [inputValue]);

	const fetchMovies = async (search) => {
		try {
			const res = await axios.get(`/api/movies/search?search=${search}`);
			console.log('FJL: enter fetchMovies', search);
			setMovies(res.data);
		} catch (err) {
			console.error(err);
		}
	};

	const handleChange = (value) => {
		console.log('FJL: handleChange: ', value);
		setInputValue(value);
	};

	const handleSelect = (value) => {
		setInputValue(value);
		const selectedMovie = movies.find((movie) => movie.title === value);
		if (selectedMovie) {
			onMovieSelect(selectedMovie.movieid);
		}
	};

	return (
		<div style={{ width: 300 }}>
			<InputGroup>
				<AutoComplete
					data={movies.map((movie) => movie.title)}
					value={inputValue}
					onSelect={handleSelect}
					onChange={handleChange}
					placeholder="Search for a movie"
				/>
			</InputGroup>
		</div>
	);
};

export default AutocompleteSearch;
