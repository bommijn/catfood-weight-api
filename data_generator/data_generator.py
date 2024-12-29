from fastapi import FastAPI, HTTPException
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

app = FastAPI()
CSV_FILE = "three_day_df.csv"

try:
    if os.path.exists(CSV_FILE):
        # Parse dates when reading the CSV
        df_original = pd.read_csv(CSV_FILE, parse_dates=['timestamp'])
        print(f"Loaded data from {CSV_FILE}")
    else:
        print(f"CSV file not found at: {CSV_FILE}. This will cause an error if a request is made.")
        df_original = None
except FileNotFoundError:
    print(f"Error loading CSV, file not found at: {CSV_FILE}. This will cause an error if a request is made.")
    df_original = None
except pd.errors.ParserError as e:
    print(f"Error parsing CSV file: {e}. This will cause an error if a request is made.")
    df_original = None
except Exception as e:
    print(f"An unexpected error occurred: {e}. This will cause an error if a request is made.")
    df_original = None

@app.get("/generate_data/")
async def generate_data(start_date: str = "2024-01-01 21:28:50", end_date: str = "2024-01-01 21:38:20"):
    start_date: str = "2024-01-01 21:28:50"
    end_date: str = "2024-01-01 21:38:20"
    try:
        if df_original is None:
            raise HTTPException(status_code=500, detail="CSV data not loaded. Cannot process request.")
        
        # Convert start and end dates to datetime objects
        start_datetime = pd.to_datetime(start_date)
        end_datetime = pd.to_datetime(end_date)
        
        # Filter the DataFrame for the target time range
        time_mask = (df_original['timestamp'] >= start_datetime) & (df_original['timestamp'] <= end_datetime)
        filtered_data = df_original[time_mask]
        
        # Construct the response
        data_to_return = []
        for _, row in filtered_data.iterrows():
            data_to_return.append({
                'weight': float(row['weight']),
                'timestamp': row['timestamp'].isoformat()
                })
        
        return data_to_return
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))