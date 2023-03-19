import csv
import os


def deduplicate_rows(file_name):
    # Read rows from the input CSV file
    with open(file_name, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        header = next(reader)  # Get header row
        rows = [row for row in reader]  # Get data rows

    # Deduplicate rows using a set of tuples
    deduplicated_rows = list(set(tuple(row) for row in rows))

    # Only proceed if there are duplicate rows
    if len(deduplicated_rows) != len(rows):
        # Create a dictionary to store the index of each row in the original list
        row_index = {tuple(row): idx for idx, row in enumerate(rows)}

        # Sort deduplicated rows by their original order using the row_index dictionary
        deduplicated_rows.sort(key=lambda row: row_index[row])

        # Write deduplicated rows to a new CSV file
        output_file_name = file_name[:-4] + '-deduped.csv'
        with open(output_file_name, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(header)  # Write header row
            writer.writerows(deduplicated_rows)  # Write deduplicated data rows


# Get all CSV files in the current directory
csv_files = [f for f in os.listdir() if f.endswith('.csv')]

# Process each CSV file
for file_name in csv_files:
    deduplicate_rows(file_name)
