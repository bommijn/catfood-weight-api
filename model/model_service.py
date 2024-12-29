# model_service.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import tensorflow as tf
from tensorflow import keras

app = FastAPI()


try:
    model = keras.models.load_model(
        'cat_feeder_model.h5',
        custom_objects={
            'mse': tf.keras.losses.MeanSquaredError(),
            'mae': tf.keras.metrics.MeanAbsoluteError()
        }
    )
    print("Model loaded successfully")
except Exception as e:
    print(f"Error loading model: {str(e)}, KERAS VERSION {keras.__version__},,, {tf.__version__}")
    model = None

# Constants
SEQUENCE_LENGTH = 500  # Same as used in training

class WeightData(BaseModel):
    weights: List[float]

class PredictionResponse(BaseModel):
    food_added: float

def pad_sequence(data, sequence_length):
    """Pad data with zeros if shorter than sequence_length"""
    if len(data) >= sequence_length:
        return data
    
    # Calculate padding needed
    pad_length = sequence_length - len(data)
    
    # Pad with zeros at the start (since we're padding historical data)
    padded_data = np.pad(data, (pad_length, 0), 'constant', constant_values=0)
    
    return padded_data

def create_sequences(data, sequence_length):
    """Create sequences from weight data, with padding if needed"""
    # First pad the data if needed
    padded_data = pad_sequence(data, sequence_length)
    
    sequences = []
    for i in range(len(padded_data) - sequence_length + 1):
        sequence = padded_data[i:i + sequence_length]
        sequences.append(sequence)
    
    return np.array(sequences)


@app.post("/model/predict/", response_model=PredictionResponse)
async def predict(data: WeightData):
    if not model:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Convert input weights to numpy array
        weights = np.array(data.weights)
        sequences = create_sequences(weights, SEQUENCE_LENGTH)
        predictions = model.predict(sequences)
        
        # Get the maximum prediction (most likely food addition event)
        max_prediction = float(np.max(predictions))
        
        return {
            "food_added": max_prediction
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")