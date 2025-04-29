from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from collections import defaultdict
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

# Endpoint to get uploaded PDFs
@app.get("/get_uploaded_pdfs/")
def get_uploaded_pdfs():
    # Organize files by year
    files_by_year = defaultdict(list)
    
    # List all files in the upload folder
    for filename in os.listdir(UPLOAD_FOLDER):
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        
        if os.path.isfile(file_path) and filename.endswith(".pdf"):
            # Extract the year from the file name (assuming it's in the format: '2024_filename.pdf')
            try:
                year = filename.split("_")[0]  # Extract year from the file name, assuming format is like '2024_filename.pdf'
                files_by_year[year].append(f"/uploads/{filename}")
            except Exception as e:
                print(f"Error extracting year from file name {filename}: {e}")
    
    # Convert defaultdict to a regular dict for returning as JSON
    return JSONResponse(content=dict(files_by_year))

# Test endpoint
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
