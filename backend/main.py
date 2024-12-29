from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from datetime import datetime, timezone
import httpx


app = FastAPI()

# CORS alles toe latenm toch lan netwrk
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)



class WeightEntry(BaseModel):
    weight: float

class WeightRecord(BaseModel):
    weight: float
    timestamp: str

# init db
def init_db():
    with sqlite3.connect('weights.db') as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS weights (
                id INTEGER PRIMARY KEY,
                weight REAL NOT NULL,
                timestamp DATETIME NOT NULL
            );
        ''')


@app.post("/predict/")
async def predict_food_amount(start_date: int = Query(...), end_date: int = Query(...)):
    # Get weights from database
    weights_data = await get_weights_by_date(start_date, end_date)
    
    # Extract weights
    weights = [record['weight'] for record in weights_data]
    
    # Call model service
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://model-service:8000/model/predict/",
                json={"weights": weights}
            )
            prediction = response.json()
            
            return {
                "food_added": prediction["food_added"],
                "confidence": prediction["confidence"],
                "timestamp": datetime.fromtimestamp(end_date / 1000.0).isoformat()
            }
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Model service error: {str(e)}"
            )



# alle gewichten ophalen
@app.get("/weights/", response_model=list[WeightRecord])
async def get_all_weights():
    with sqlite3.connect('weights.db') as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT weight, datetime(timestamp, 'localtime') as timestamp FROM weights ORDER BY timestamp DESC")
        return [dict(row) for row in cur.fetchall()]

# alle gewichten tussen 2 datums ophalen. 
@app.get("/weights/filter/", response_model=list[WeightRecord])
async def get_weights_by_date(start_date: int = Query(None), end_date: int = Query(None)):
    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="Both start_date and end_date must be provided")

    # Convert milliseconds to seconds and then to datetime
    start_datetime = datetime.fromtimestamp(start_date / 1000.0)
    end_datetime = datetime.fromtimestamp(end_date / 1000.0)

    with sqlite3.connect('weights.db') as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT weight, datetime(timestamp, 'localtime') as timestamp
            FROM weights
            WHERE timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
            """, (start_datetime, end_datetime))
    return [dict(row) for row in cur.fetchall()]


#gewicht toevoegen aan de db.
@app.post("/weights/")
async def add_weight(entry: WeightEntry):
    with sqlite3.connect('weights.db') as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO weights (weight, timestamp) VALUES (?, ?)", (entry.weight, datetime.now(timezone.utc)))
        conn.commit()
        return {"weight": entry.weight, "timestamp": datetime.now().isoformat(), "test": datetime.now()}

init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6969)