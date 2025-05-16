from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import uuid
import supabase
from fastapi import Query
from supabaseClient import get_supabase_client
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()

planners_db: Dict[str, List[dict]] = {}

class PlannerRequest(BaseModel):
    id: int
    program: str
    major: str
    intake_year: int
    intake_semester: str

class UpdateUnitRequest(BaseModel):
    unit_id: str
    field: str
    value: str

class PlannerUnit(BaseModel):
    year: int
    semester: str
    unit_code: str
    unit_name: str
    prerequisites: str
    unit_type: str

class PlannerPayload(BaseModel):
    program: str
    major: str
    intake_year: int
    intake_semester: str
    planner: List[PlannerUnit]
    overwrite: bool = False

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
    intake_semester: str = Form(...),
    overwrite: str = Form("false")
):
    try:
        overwrite = overwrite.lower() == "true" 
        df = pd.read_excel(file.file)
        df.columns = [col.strip().title() for col in df.columns]

        expected_cols = {"Year", "Semester", "Unit Code", "Unit Name", "Prerequisites", "Unit Type"}
        if not expected_cols.issubset(set(df.columns)):
            missing = expected_cols - set(df.columns)
            raise HTTPException(
                status_code=400,
                detail=f"Excel format incorrect. Missing columns: {', '.join(missing)}"
            )

        # Check if a planner already exists
        existing = supabase_client.table("study_planners").select("id").eq("program", program).eq("major", major).eq("intake_year", intake_year).eq("intake_semester", intake_semester).execute()

        if existing.data:
            if not overwrite:
                raise HTTPException(
                    status_code=409,
                    detail={"message": "A planner for this intake already exists.", "existing": True}
                )
            else:
                existing_id = existing.data[0]["id"]
                # Delete units first (foreign key constraint)
                supabase_client.table("study_planner_units").delete().eq("planner_id", existing_id).execute()
                # Delete planner
                supabase_client.table("study_planners").delete().eq("id", existing_id).execute()

        planner_id = str(uuid.uuid4())
        planner_data = {
            "id": planner_id,
            "program": program,
            "major": major,
            "intake_year": intake_year,
            "intake_semester": intake_semester
        }
        supabase_client.table("study_planners").insert(planner_data).execute()

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
    
@app.post("/create-user")
def create_user(data: dict):
    supabase = get_supabase_client()
    response = supabase.table("users").insert(data).execute()

    if response.error:
        return {"status": "error", "message": response.error.message}
    return {"status": "success", "data": response.data}

@app.put("/api/update-study-planner-unit")
def update_study_planner_unit(update: UpdateUnitRequest):
    try:
        print(f"Updating unit ID {update.unit_id} field '{update.field}' to '{update.value}'")

        allowed_fields = {"unit_type", "unit_code", "year", "semester"}
        if update.field not in allowed_fields:
            raise HTTPException(status_code=400, detail=f"Invalid field: {update.field}")

        # If the field being updated is 'unit_code'
        if update.field == "unit_code":
            unit_res = supabase_client.table("units") \
                .select("unit_code, unit_name, prerequisites") \
                .eq("unit_code", update.value) \
                .maybe_single() \
                .execute()

            print("unit_res:", unit_res)

            if unit_res.data is None:
                raise HTTPException(status_code=404, detail=f"Unit code '{update.value}' not found in 'units' table")

            unit_data = unit_res.data

            update_fields = {
                "unit_code": unit_data["unit_code"],
                "unit_name": unit_data["unit_name"],
                "prerequisites": unit_data["prerequisites"]
            }

            response = supabase_client.table("study_planner_units") \
                .update(update_fields) \
                .eq("id", update.unit_id) \
                .execute()

            print("Update response:", response)

            if not response.data:
                raise HTTPException(status_code=500, detail="Update failed: no data returned")

            return {"message": "Unit code, name, and prerequisites updated successfully"}

        # Handling the year and semester update
        if update.field == "year":
            try:
                # Ensure the year is a valid integer
                new_year = int(update.value)
                if new_year not in [1, 2, 3, 4]:
                    raise HTTPException(status_code=400, detail="Invalid year value")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid year format")

        # For semester field, ensure it matches the valid options
        if update.field == "semester" and update.value not in ["1", "2", "summer", "winter"]:
            raise HTTPException(status_code=400, detail="Invalid semester value")

        # Update the unit in the study_planner_units table
        response = supabase_client.table("study_planner_units") \
            .update({update.field: update.value}) \
            .eq("id", update.unit_id) \
            .execute()

        if hasattr(response, "error") and response.error is not None:
            raise HTTPException(status_code=500, detail=response.error.message)

        return {"message": "Unit updated successfully"}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

    
@app.get("/api/units")
def get_units():
    try:
        res = supabase_client.table("units").select("*").execute()
        return res.data
    except Exception as e:
        print("Error fetching units:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch units")

@app.post("/api/create-study-planner")
def create_study_planner(data: PlannerPayload = Body(...)):
    try:
        # Check if planner exists for intake
        existing = supabase_client.table("study_planners") \
            .select("id") \
            .eq("program", data.program) \
            .eq("major", data.major) \
            .eq("intake_year", data.intake_year) \
            .eq("intake_semester", data.intake_semester) \
            .execute()

        if existing.data:
            if not data.overwrite:
                raise HTTPException(
                    status_code=409,
                    detail={"message": "A planner for this intake already exists.", "existing": True}
                )
            else:
                existing_id = existing.data[0]["id"]
                # Delete existing planner units first (due to FK constraints)
                supabase_client.table("study_planner_units").delete().eq("planner_id", existing_id).execute()
                # Delete existing planner
                supabase_client.table("study_planners").delete().eq("id", existing_id).execute()

        # Insert new planner metadata
        planner_id = str(uuid.uuid4())
        planner_data = {
            "id": planner_id,
            "program": data.program,
            "major": data.major,
            "intake_year": data.intake_year,
            "intake_semester": data.intake_semester
        }
        supabase_client.table("study_planners").insert(planner_data).execute()

        # Insert each planner row
        for row in data.planner:
            unit = {
                "id": str(uuid.uuid4()),
                "planner_id": planner_id,
                "year": row.year,
                "semester": row.semester,
                "unit_code": row.unit_code,
                "unit_name": row.unit_name,
                "prerequisites": row.prerequisites,
                "unit_type": row.unit_type,
            }
            supabase_client.table("study_planner_units").insert(unit).execute()

        return {"message": "Study planner created successfully."}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print("Internal Server Error:", str(e))
        raise HTTPException(status_code=500, detail="Internal server error")