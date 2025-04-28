from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os 
from supabaseClient import get_supabase_client

app = FastAPI()

# CORS settings
origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

@app.post("/upload_planner/")
async def upload_planner(file: UploadFile = File(...)):
    file_location = f"{UPLOAD_FOLDER}/{file.filename}"
    with open(file_location, "wb") as f:
        f.write(await file.read())
    url = f"/uploads/{file.filename}"  # Relative URL for frontend
    return JSONResponse(content={"url": url})

# Test endpoints
@app.get("/ping")
def ping():
    return {"message": "Connected to FastAPI"}

@app.get("/test-connection")
def test_connection():
    try:
        client = get_supabase_client()
        if client:
            return {"message": "Connection to Supabase is successful!"}
        else:
            raise HTTPException(status_code=500, detail="Failed to initialize Supabase client.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to Supabase: {str(e)}")

# In-memory storage for units
units = []

@app.get("/units")
def get_units():
    return units

@app.post("/units")
def create_unit(unit: dict):
    unit["id"] = len(units) + 1
    units.append(unit)
    return unit

@app.put("/units/{unit_id}")
def update_unit(unit_id: int, updated: dict):
    for i in range(len(units)):
        if units[i]["id"] == unit_id:
            units[i].update(updated)
            return units[i]
    raise HTTPException(status_code=404, detail="Unit not found")

@app.delete("/units/{unit_id}")
def delete_unit(unit_id: int):
    global units
    units = [unit for unit in units if unit["id"] != unit_id]
    return {"message": "Deleted"}
