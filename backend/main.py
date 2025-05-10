from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import uuid
import supabase
from fastapi import Query
from supabaseClient import get_supabase_client
from pydantic import BaseModel
from typing import List

class PlannerRequest(BaseModel):
    id: int
    program: str
    major: str
    intake_year: int
    intake_semester: str

app = FastAPI()

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase setup
SUPABASE_URL = "https://rfvcutixkmawyzrlrarp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmdmN1dGl4a21hd3l6cmxyYXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4Mzk2MzgsImV4cCI6MjA2MTQxNTYzOH0.NKToyHvzFd_ACs_QzRH99m-AkFYBtZmV5OLgoXU7Cuc"
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

@app.post("/api/upload-study-planner")
async def upload_study_planner(
    file: UploadFile = File(...),
    program: str = Form(...),
    major: str = Form(...),
    intake_year: int = Form(...),
    intake_semester: str = Form(...)
):
    try:
        df = pd.read_excel(file.file)

        # Normalize columns
        df.columns = [col.strip().title() for col in df.columns]
        print("Normalized Excel columns:", df.columns.tolist())

        # Validate required columns
        expected_cols = {"Year", "Semester", "Unit Code", "Unit Name", "Prerequisites", "Unit Type"}
        if not expected_cols.issubset(set(df.columns)):
            missing = expected_cols - set(df.columns)
            raise HTTPException(
                status_code=400,
                detail=f"Excel format incorrect. Missing columns: {', '.join(missing)}"
            )

        # Insert into study_planners table
        planner_id = str(uuid.uuid4())
        planner_data = {
            "id": planner_id,
            "program": program,
            "major": major,
            "intake_year": intake_year,
            "intake_semester": intake_semester
        }
        supabase_client.table("study_planners").insert(planner_data).execute()

        # Insert units
        for _, row in df.iterrows():
            unit = {
                "id": str(uuid.uuid4()),
                "planner_id": planner_id,
                "year": int(row["Year"]),
                "semester": str(row["Semester"]),
                "unit_code": str(row["Unit Code"]),
                "unit_name": str(row["Unit Name"]),
                "prerequisites": str(row["Prerequisites"]),
                "unit_type": str(row["Unit Type"]),

            }
            supabase_client.table("study_planner_units").insert(unit).execute()

        return {"message": "Study planner uploaded successfully."}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print("Internal Error:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/view-study-planner")
def view_study_planner(
    program: str = Query(...),
    major: str = Query(...),
    intake_year: int = Query(...),
    intake_semester: str = Query(...)
):
    try:
        # Fetch the matching planner
        planner_res = supabase_client.table("study_planners").select("*").match({
            "program": program,
            "major": major,
            "intake_year": intake_year,
            "intake_semester": intake_semester
        }).execute()

        if not planner_res.data:
            print(f"No planners found for {program}, {major}, {intake_year}, {intake_semester}")  # Debugging log
            raise HTTPException(status_code=404, detail="No matching study planner found.")

        planner = planner_res.data[0]
        print(f"Planner found: {planner}")  # Debugging log

        # Fetch the related units
        units_res = supabase_client.table("study_planner_units").select("*").eq("planner_id", planner["id"]).execute()
        units = units_res.data

        if not units:
            print(f"No units found for planner {planner['id']}")  # Debugging log

        return {
            "planner": planner,
            "units": units
        }

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/study-planner-tabs")
def get_study_planner_tabs():
    try:
        res = supabase_client.table("study_planners").select("id, program, major, intake_year, intake_semester").execute()
        planners = res.data

        return planners
    except Exception as e:
        print("Error fetching planner tabs:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch planner tabs")
    
@app.post("/api/view-study-planner-batch")
async def view_study_planner_batch(planners: List[PlannerRequest]):
    response = {}
    for planner in planners:
        try:
            units = get_units_for_planner(
                planner.program,
                planner.major,
                planner.intake_year,
                planner.intake_semester
            )
            response[planner.id] = units
        except Exception as e:
            response[planner.id] = []  # Or add error info if needed
    return {"units_map": response}

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