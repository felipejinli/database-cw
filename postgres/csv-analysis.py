import os
import pandas as pd
import numpy as np
import logging
import io

logging.basicConfig(
    filename="initialCsvAnalysis.log",
    level=logging.INFO,
    format="%(message)s",
)


def analyze_csv(file_path):
    logging.info(f"Analyzing {file_path}")

    # Read the CSV file
    df = pd.read_csv(file_path)

    # Perform the analysis
    # # Data types and missing values
    # logging.info("Data types and missing values:")

    # # NOTE - df.info() returns None, so we need to capture the output for log-file with io.StringIO()
    # with io.StringIO() as buffer:
    #     # call df.info() and capture the output
    #     df.info(buf=buffer)
    #     output = buffer.getvalue()

    # logging.info(output)

    # Descriptive statistics
    logging.info("\nDescriptive statistics:")
    logging.info(df.describe(include='all'))

    # # Unique values
    # logging.info("\nUnique values:")
    # for col in df.columns:
    #     logging.info(f"{col}: {df[col].nunique()}")

    # # Duplicates
    # logging.info("\nDuplicate rows:")
    # duplicate_rows = df[df.duplicated()]
    # if duplicate_rows.empty:
    #     logging.info("No duplicate rows found.")
    # else:
    #     logging.info(f"{len(duplicate_rows)} duplicate rows found:")
    #     logging.info(duplicate_rows)


if __name__ == "__main__":
    for file_name in os.listdir("."):
        if file_name.endswith(".csv"):
            analyze_csv(file_name)
