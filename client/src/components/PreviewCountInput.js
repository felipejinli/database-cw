import React, { useState, useEffect } from 'react';
import { InputNumber, InputGroup, Notification } from 'rsuite';
import axios from 'axios';

const PreviewCountInput = ({ movieId, onPreviewCountChange }) => {
	const [maxUsers, setMaxUsers] = useState(null);
	const [userCount, setUserCount] = useState(null);

	useEffect(() => {
		if (movieId) {
			fetchUserCount(movieId);
		}
	}, [movieId]);

	const fetchUserCount = async (movieId) => {
		try {
			const res = await axios.get(`http://localhost:80/api/movies/${movieId}/preview-max-count`);
			if (res.data < 3) {
				Notification.error({
					title: 'Not enough ratings.',
					description: 'Must have at least 3 ratings from different users for a meaningful preview audience',

				});
			} else {
				setMaxUsers(res.data);
			}
		} catch (err) {
			console.error(err);
		}
	};

	const handleChange = (value) => {
		console.log('FJL: handleChangeUserCount', typeof value);
		if (value < 3) {
			Notification.error({
				title: 'Invalid Input',
				description: `The input must be between 3 and ${maxUsers}. Preview audience size below 3 is inaccurate.`
			});
		} else if (value > maxUsers) {
			Notification.error({
				title: 'Invalid Input',
				description: `The input must be less than ${maxUsers}. Can't have preview audience larger than actual ratings we have for given movie.`
			});
		} else {
			setUserCount(value);
			onPreviewCountChange(value); // pass value up to parent component 
		}
	};

	return (
		<div style={{ width: 300 }}>
			<InputGroup>
				<InputNumber
					value={userCount}
					onChange={handleChange}
					min={3}
					max={maxUsers}
					disabled={!movieId}
					placeholder={`Enter a number between 3 and ${maxUsers || ''}`}
				/>
			</InputGroup>
		</div>
	);
};

export default PreviewCountInput;
