from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from supabaseClient import get_supabase_client
from fastapi import Query
from fastapi.responses import FileResponse

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

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

@app.post("/upload_planner/")
async def upload_planner(file: UploadFile = File(...), year: str = Form(...)):
    year_folder = os.path.join(UPLOAD_FOLDER, year)
    os.makedirs(year_folder, exist_ok=True)

    file_location = os.path.join(year_folder, file.filename)
    with open(file_location, "wb") as f:
        f.write(await file.read())

    # Return relative URL for frontend
    url = f"/uploads/{year}/{file.filename}"
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

@app.get("/list_planners/")
def list_planners(year: str = Query(...)):
    folder_path = os.path.join(UPLOAD_FOLDER, year)
    if not os.path.exists(folder_path):
        return []
    files = os.listdir(folder_path)
    return [f"/uploads/{year}/{file}" for file in files if file.endswith(".pdf")]

@app.delete("/delete_planner/")
async def delete_planner(year: str, filename: str):
    try:
        file_path = f"./uploads/{year}/{filename}"
        os.remove(file_path)
        return JSONResponse(content={"message": "File deleted successfully."})
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"message": "File not found."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"message": str(e)})

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