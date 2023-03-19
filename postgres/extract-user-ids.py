import csv
import os
import re


def read_csv(file_name, user_id_index):
    user_ids = set()
    with open(file_name, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        next(reader)  # Skip header row
        for row in reader:
            user_ids.add(row[user_id_index])
    return user_ids


# Read userIds from different CSV files
ratings_user_ids = read_csv('ratings.csv', 0)
tags_user_ids = read_csv('tags.csv', 0)
personality_data_user_ids = read_csv('personality-data.csv', 0)
personality_ratings_user_ids = read_csv('personality-ratings.csv', 0)
personality_predicted_rating_user_ids = read_csv(
    'personalityPredictedRating.csv', 0)

# Combine userIds
users_int = ratings_user_ids.union(tags_user_ids)
users_uuid = personality_data_user_ids.union(
    personality_ratings_user_ids, personality_predicted_rating_user_ids)

# Filter userIds
users_int = {user_id for user_id in users_int if re.match(r'^\d+$', user_id)}
users_uuid = {user_id for user_id in users_uuid if re.match(
    r'^[a-fA-F0-9]+$', user_id)}

# Write userIds to output CSV files


def write_csv(file_name, data):
    with open(file_name, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['userId'])
        for user_id in data:
            writer.writerow([user_id])


write_csv('usersINT.csv', users_int)
write_csv('usersUUID.csv', users_uuid)
