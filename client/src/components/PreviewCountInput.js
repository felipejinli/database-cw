import React, { useState, useEffect } from 'react';
import { InputNumber, InputGroup, Notification, useToaster } from 'rsuite';
import axios from 'axios';

const PreviewCountInput = ({ movieId, onPreviewCountChange }) => {
	const [maxUsers, setMaxUsers] = useState(null);
	const [userCount, setUserCount] = useState(null);

	const toaster = useToaster();

	useEffect(() => {
		if (movieId) {
			fetchUserCount(movieId);
		}
	}, [movieId]);

	const fetchUserCount = async (movieId) => {
		try {
			const res = await axios.get(`http://localhost:80/api/movies/${movieId}/preview-max-count`);
			if (res.data < 3) {
				toaster.push(<Notification type="error" header="error">Not enough ratings for movie. Must have at least 3 ratings from different users for a meaningful preview audience</Notification>, {
					placement: 'topCenter'
				});
				setMaxUsers(0);
			} else {
				setMaxUsers(res.data);
			}
		} catch (err) {
			console.error(err);
		}
	};

	const handleChange = (value) => {
		console.log('FJL3: handleChangeUserCount', value);
		if (!value) {
			setUserCount(null)
		} else if (value < 3) {
			toaster.push(<Notification type="error" header="error">Invalid input. The input must be between 3 and {maxUsers}. Preview audience size below 3 is inaccurate.</Notification>, {
				placement: 'topCenter'
			});
		} else if (value > maxUsers) {
			toaster.push(<Notification type="error" header="error">The input must be less than {maxUsers}. Can't have preview audience larger than actual ratings we have for given movie.</Notification>, {
				placement: 'topCenter'
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
					placeholder={maxUsers ? `Enter a number between 3 and ${maxUsers || ''}` : `Movie doesn't have enough ratings`}
				/>
			</InputGroup>
		</div>
	);
};

export default PreviewCountInput;
