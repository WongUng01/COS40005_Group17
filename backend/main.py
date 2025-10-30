from fastapi import FastAPI, File, UploadFile, Form, HTTPException, APIRouter, Query
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import uuid
import supabase
from supabaseClient import get_supabase_client
from pydantic import BaseModel
from typing import List, Dict, Optional,Any
from io import BytesIO
import traceback
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
import logging
from fastapi import Request
import math
import re

logger = logging.getLogger("uvicorn.error")
from uuid import UUID

app = FastAPI()


planners_db: Dict[str, List[dict]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AddUnitRequest(BaseModel):
    planner_id: str
    year: str
    semester: str
    unit_code: str | None = None
    unit_type: str | None = None

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

class UnitDeleteRequest(BaseModel):
    unit_id: int

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UnitBase(BaseModel):
    unit_code: str
    unit_name: str
    prerequisites: Optional[str] = None
    concurrent_prerequisite: Optional[str] = None  # Match frontend (without 's')
    offered_terms: Optional[str] = None
    credit_point: float

class StudentBase(BaseModel):
    graduation_status: bool
    student_name: str
    student_id: int
    student_email: str
    student_course: str
    student_major: str
    intake_term: str
    intake_year: str
    credit_point: float
    student_type: str = "malaysian"
    has_spm_bm_credit: bool = True 

class StudentUnitBase(BaseModel):
    student_id: int
    unit_code: str
    unit_name: str
    grade: str
    completed: bool

class GraduationStatus(BaseModel):
    can_graduate: bool
    total_credits: float
    core_credits: float
    major_credits: float
    core_completed: int
    major_completed: int
    mpu_requirements_met: bool
    mpu_types_completed: List[str]
    missing_core_units: List[str]
    missing_major_units: List[str]
    messages: List[str] = []
    planner_info: Optional[str] = None
    updated_student: Optional[dict] = None

class StudentUnitOut(BaseModel):
    id: int
    student_id: int
    unit_code: str
    unit_name: str
    grade: str
    completed: bool

    class Config:
        orm_mode = True

class StudentUnitCreate(BaseModel):
    student_id: int
    unit_code: str
    unit_name: str
    grade: str
    completed: bool

PROGRAM_CODES = {
    "Bachelor of Computer Science": "BA-CS",
    "Bachelor of Information and Communication Technology": "BA-ICT",
    "Bachelor of Engineering": "BH-ESE1",
    "Diploma of Information Technology": "DP-IT",
    "Master of Information Technology": "MA-IT1",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Supabase setup
SUPABASE_URL = "https://zllavejtltdcpxkzpvpe.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGF2ZWp0bHRkY3B4a3pwdnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MTQ3NzUsImV4cCI6MjA3Mjk5MDc3NX0.MvfPars9qL-H6RU5e2Z2tnUtB6Y8aIY3Sjf3lX_xYDQ"
supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)

client = get_supabase_client()

@app.post("/api/upload-study-planner")
async def upload_study_planner(
    file: UploadFile = File(...),
    program: str = Form(...),
    program_code: str = Form(...),  # ✅ new field
    major: str = Form(...),
    intake_year: int = Form(...),
    intake_semester: str = Form(...),
    overwrite: str = Form("false")
):
    logger.debug("Upload endpoint hit!")

    try:
        overwrite = overwrite.lower() == "true"

        # --- Read and normalize Excel headers ---
        import re
        df = pd.read_excel(file.file)
        df.columns = [
            re.sub(r"\s+", " ", str(col)).strip().title()
            for col in df.columns
        ]


        print("DEBUG columns from Excel:", df.columns.tolist(), flush=True)

        expected_cols = {"Year", "Semester", "Unit Code", "Unit Name", "Prerequisites", "Unit Type"}
        if not expected_cols.issubset(set(df.columns)):
            missing = expected_cols - set(df.columns)
            raise HTTPException(
                status_code=400,
                detail=f"Excel format incorrect. Missing columns: {', '.join(missing)}"
            )

        # --- Check if planner already exists ---
        existing = (
            supabase_client.table("study_planners")
            .select("id")
            .eq("program", program)
            .eq("major", major)
            .eq("intake_year", intake_year)
            .eq("intake_semester", intake_semester)
            .execute()
        )

        if existing.data:
            if not overwrite:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": "A planner for this intake already exists.",
                        "existing": True,
                    },
                )
            else:
                existing_id = existing.data[0]["id"]
                supabase_client.table("study_planner_units").delete().eq("planner_id", existing_id).execute()
                supabase_client.table("study_planners").delete().eq("id", existing_id).execute()

        # --- Validate program_code from frontend ---
        if not program_code:
            raise HTTPException(status_code=400, detail="Missing program code.")

        # --- Insert planner record ---
        planner_id = str(uuid.uuid4())
        planner_data = {
            "id": planner_id,
            "program": program,
            "program_code": program_code,  # ✅ use value from frontend
            "major": major,
            "intake_year": intake_year,
            "intake_semester": intake_semester,
        }

        supabase_client.table("study_planners").insert(planner_data).execute()

        # --- Prepare all units ---
        units_to_insert = []
        for idx, row in df.iterrows():
            unit = {
                "id": str(uuid.uuid4()),
                "planner_id": planner_id,
                "row_index": int(idx + 1),
                "year": int(row["Year"]),
                "semester": str(row["Semester"]),
                "unit_code": str(row["Unit Code"]),
                "unit_name": str(row["Unit Name"]),
                "prerequisites": str(row["Prerequisites"]),
                "unit_type": str(row["Unit Type"]),
            }
            print("DEBUG row:", unit, flush=True)
            units_to_insert.append(unit)

        if units_to_insert:
            print("DEBUG first row full:", units_to_insert[0], flush=True)
            print("DEBUG keys:", list(units_to_insert[0].keys()), flush=True)

        # --- Bulk insert all units ---
        supabase_client.table("study_planner_units").insert(units_to_insert).execute()

        return {"message": "Study planner uploaded successfully."}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print("Internal Error:", repr(e), flush=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/view-study-planner")
def view_study_planner(
    program: str = Query(...),
    major: str = Query(...),
    intake_year: int = Query(...),
    intake_semester: str = Query(...)
):
    try:
        # Fetch the matching planner
        planner_res = (
            supabase_client.table("study_planners")
            .select("id, program, program_code, major, intake_year, intake_semester")
            .match({
                "program": program,
                "major": major,
                "intake_year": intake_year,
                "intake_semester": intake_semester,
            })
            .execute()
        )

        # ✅ If no data, return 404 instead of crashing
        if not planner_res.data or len(planner_res.data) == 0:
            return JSONResponse(
                status_code=404,
                content={"message": "No study planner found for the selected intake."},
            )

        # Grab the first planner
        planner = planner_res.data[0]

        # Fetch related units
        units_res = (
            supabase_client.table("study_planner_units")
            .select("*")
            .eq("planner_id", planner["id"])
            .order("row_index", desc=False)
            .execute()
        )

        units = units_res.data or []

        print("✅ Planner found. Row order:", [u["row_index"] for u in units])

        return {"planner": planner, "units": units}

    except Exception as e:
        print("❌ Error in view-study-planner:", str(e))
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/api/study-planner-tabs")
def get_study_planner_tabs():
    try:
        res = supabase_client.table("study_planners").select("id, program, program_code, major, intake_year, intake_semester").execute()
        planners = res.data

        return planners
    except Exception as e:
        print("Error fetching planner tabs:", str(e))
        raise HTTPException(status_code=500, detail="Failed to fetch planner tabs")
    
@app.delete("/api/delete-study-planner")
def delete_study_planner(id: UUID = Query(...)):  # accepts UUID
    try:
        # Delete related units first
        supabase_client.table("study_planner_units").delete().eq("planner_id", str(id)).execute()

        # Delete the planner
        planner_res = (
            supabase_client.table("study_planners")
            .delete()
            .eq("id", str(id))  # supabase stores UUIDs as strings
            .execute()
        )

        if not planner_res.data:
            raise HTTPException(status_code=404, detail="Study planner not found")

        return {"message": f"Study planner {id} deleted successfully"}

    except Exception as e:
        print("Error deleting planner:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete study planner: {str(e)}")

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

from fastapi import HTTPException, Request

@app.put("/api/update-study-planner-unit")
async def update_study_planner_unit(request: Request):
    try:
        data = await request.json()
        unit_id = data.get("unit_id")

        if not unit_id:
            raise HTTPException(status_code=400, detail="unit_id is required")

        # Collect updatable fields
        updates = {
            "year": data.get("year"),
            "semester": data.get("semester"),
            "unit_code": data.get("unit_code"),
            "unit_type": data.get("unit_type"),
            "prerequisites": data.get("prerequisites"),
            "unit_name": data.get("unit_name"),
        }

        print("=== Incoming Update ===")
        print(data)

        # Handle electives or invalid codes
        unit_code_value = str(updates.get("unit_code", "")).strip().lower()

        if unit_code_value in ["nan", "", "none", "null"]:
            # If this is an elective, keep fields clean but valid
            updates["unit_code"] = None
            updates["unit_name"] = updates.get("unit_name") or "Elective"
            updates["prerequisites"] = None

            print("Detected elective or blank unit code — skipping unit lookup.")

        else:
            # Fetch from 'units' if valid
            try:
                unit_res = (
                    supabase_client.table("units")
                    .select("unit_name, prerequisites")
                    .eq("unit_code", updates["unit_code"])
                    .maybe_single()
                    .execute()
                )

                if unit_res.data:
                    updates["unit_name"] = unit_res.data.get("unit_name")
                    updates["prerequisites"] = unit_res.data.get("prerequisites")

            except Exception as e:
                print("Unit fetch failed:", e)

        # --- Keep explicit nulls for electives ---
        safe_updates = {}
        for k, v in updates.items():
            # Only skip None for non-electives
            if v is not None or updates.get("unit_type", "").lower() == "elective":
                safe_updates[k] = v

        print("=== Final safe updates ===")
        print(safe_updates)

        # Execute update
        response = (
            supabase_client.table("study_planner_units")
            .update(safe_updates)
            .eq("id", unit_id)
            .execute()
        )

        if getattr(response, "error", None):
            print("Supabase error:", response.error)
            raise HTTPException(status_code=500, detail=response.error.message)

        return {"message": "Unit updated successfully"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

    
@app.put("/api/update-study-planner-order")
def update_study_planner_order(data: dict = Body(...)):
    try:
        planner_id = data.get("planner_id")
        units = data.get("units", [])

        if not planner_id or not units:
            raise HTTPException(status_code=400, detail="Missing planner_id or units list")

        # Update each unit's row_index based on its new order
        for index, unit in enumerate(units):
            supabase_client.table("study_planner_units") \
                .update({"row_index": index}) \
                .eq("id", unit["id"]) \
                .execute()

        return {"message": "Study planner unit order (row_index) updated successfully"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update row order: {str(e)}")
    
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

        # ✅ Determine program_code
        program_code = None
        if getattr(data, "program_code", None):
            program_code = data.program_code
        elif "PROGRAM_CODES" in globals():
            program_code = PROGRAM_CODES.get(data.program)

        # Allow null program_code for new programs
        if not program_code:
            print(f"[INFO] No program_code found for '{data.program}', storing as NULL.")

        # Insert new planner metadata
        planner_id = str(uuid.uuid4())
        planner_data = {
            "id": planner_id,
            "program": data.program,
            "program_code": program_code,  # ✅ may be null
            "major": data.major,
            "intake_year": data.intake_year,
            "intake_semester": data.intake_semester
        }
        supabase_client.table("study_planners").insert(planner_data).execute()

        # Insert each planner row
        for idx, row in enumerate(data.planner, start=1):
            unit = {
                "id": str(uuid.uuid4()),
                "planner_id": planner_id,
                "row_index": idx,   # ✅ add row index
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
    
@app.get("/api/programs")
async def get_programs():
    print("✅ /api/programs called")
    res = supabase_client.table("programs").select("*").execute()
    print("✅ Supabase response:", res)
    return res.data

@app.post("/api/programs")
async def create_program(request: Request):
    data = await request.json()
    name = data.get("program_name")
    code = data.get("program_code")
    if not name or not code:
        raise HTTPException(status_code=400, detail="Program name and code required")

    # Prevent duplicates
    existing = supabase_client.table("programs").select("*").eq("program_name", name).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Program already exists")

    supabase_client.table("programs").insert({
        "program_name": name,
        "program_code": code
    }).execute()

    return {"message": "Program created"}

@app.get("/api/majors/{program_id}")
async def get_majors(program_id: str):
    res = supabase_client.table("majors").select("*").eq("program_id", program_id).execute()
    return res.data

@app.post("/api/majors")
async def create_major(request: Request):
    data = await request.json()
    program_id = data.get("program_id")
    major_name = data.get("major_name")
    if not program_id or not major_name:
        raise HTTPException(status_code=400, detail="Program and major required")
    supabase_client.table("majors").insert({
        "program_id": program_id,
        "major_name": major_name
    }).execute()
    return {"message": "Major added"}

@app.get("/api/intake-years")
async def get_intake_years():
    res = supabase_client.table("intake_years").select("*").order("intake_year").execute()
    return [y["intake_year"] for y in res.data]

@app.post("/api/intake-years")
async def add_intake_year(request: Request):
    data = await request.json()
    try:
        res = supabase_client.table("intake_years").insert({"intake_year": data["intake_year"]}).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Year already exists or invalid.")
    
@app.delete("/api/delete-study-planner-unit/{unit_id}")
def delete_study_planner_unit(unit_id: str):
    try:
        print(f"Deleting study planner unit with ID: {unit_id}")

        response = supabase_client.table("study_planner_units") \
            .delete() \
            .eq("id", unit_id) \
            .execute()

        if response.data is None:
            raise HTTPException(status_code=404, detail="Unit not found")

        return {"message": "Unit deleted successfully"}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/add-study-planner-unit")
def add_study_planner_unit(payload: dict):
    try:
        print("📩 Incoming add-study-planner-unit payload:", payload)

        required_fields = ["planner_id", "year", "semester", "row_index"]
        for field in required_fields:
            if field not in payload or payload[field] in (None, ""):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

        unit_code = payload.get("unit_code")
        unit_name = None
        prerequisites = None

        # 🧩 Auto-fetch unit name + prerequisites if unit_code provided
        if unit_code:
            unit_res = supabase_client.table("units") \
                .select("unit_name, prerequisites") \
                .eq("unit_code", unit_code) \
                .maybe_single() \
                .execute()

            if unit_res.data:
                unit_name = unit_res.data.get("unit_name")
                prerequisites = unit_res.data.get("prerequisites")

        insert_data = {
            "planner_id": payload["planner_id"],
            "year": payload["year"],
            "semester": payload["semester"],
            "row_index": payload["row_index"],
            "unit_code": unit_code,
            "unit_type": payload.get("unit_type"),
            "unit_name": unit_name,              # ✅ now safe
            "prerequisites": prerequisites,      # ✅ optional
        }

        print("🧾 Inserting:", insert_data)

        response = supabase_client.table("study_planner_units").insert(insert_data).execute()
        print("✅ Insert response:", response)

        if not response.data:
            raise HTTPException(status_code=500, detail="Insert failed: no data returned")

        return {"message": "Unit added successfully", "unit": response.data[0]}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
@app.post("/students/{student_id}/upload-units")
async def upload_units(
    student_id: int,
    file: UploadFile = File(...),
    overwrite: bool = Form(False),
):
    try:
        # 1. File size/type validation
        file.file.seek(0, 2)
        if file.file.tell() > MAX_FILE_SIZE:
            raise HTTPException(413, "File size exceeds 10MB limit")
        file.file.seek(0)
        if not file.filename.lower().endswith((".xlsx", ".xls")):
            raise HTTPException(400, "Only Excel files (.xlsx/.xls) are supported")

        # 2. Read Excel file
        try:
            df = pd.read_excel(
                file.file,
                engine="openpyxl",
                usecols=["Course", "Course Title", "Status", "Grade"],
                dtype={"Grade": str},
            )
        except ValueError as e:
            raise HTTPException(400, f"Missing required columns or format error: {e}")

        df.columns = df.columns.str.strip().str.lower()
        if missing := {"course", "course title", "status"} - set(df.columns):
            raise HTTPException(400, f"Missing columns: {', '.join(missing)}")

        # 3. Build payload
        units = []
        for idx, row in df.iterrows():
            code = str(row["course"]).strip()
            status = str(row["status"]).strip().lower()
            if not code:
                raise HTTPException(422, f"Missing Course at row {idx + 2}")
            if not status:
                raise HTTPException(422, f"Missing Status at row {idx + 2}")
            units.append({
                "student_id": student_id,
                "unit_code": code,
                "unit_name": str(row.get("course title", "")).strip(),
                "grade": str(row.get("grade", "")).strip().upper(),
                "completed": status == "complete",
            })
        if not units:
            raise HTTPException(400, "No valid course records found in Excel")

        # 4. Ensure student exists
        resp = client.from_("students") \
            .select("student_id") \
            .eq("student_id", student_id) \
            .execute()
        if not resp.data:
            raise HTTPException(404, "Associated student not found")

        # 5. Optionally overwrite existing data
        if overwrite:
            client.from_("student_units") \
                .delete() \
                .eq("student_id", student_id) \
                .execute()

        # 6. Insert new records
        ins = client.from_("student_units").insert(units).execute()
        return {"message": f"Successfully uploaded {len(ins.data or [])} course records"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Internal server error: {e}")

@app.get("/students/{student_id}")
async def get_student(student_id: int):
    try:
        response = client.from_('students') \
                        .select('*') \
                        .eq('student_id', student_id) \
                        .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
# ========== Units Routes ==========
@app.get("/units")
async def get_units():
    try:
        response = client.from_('units').select('*').execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@app.post("/units")
async def create_unit(unit: UnitBase):
    try:
        response = client.from_('units').insert(unit.dict()).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Creation failed: {e}")

@app.put("/units/{unit_id}")
async def update_unit(unit_id: str, updated: UnitBase):
    try:
        response = (
            client.from_('units')
            .update(updated.dict())
            .eq('id', unit_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Unit not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {e}")

@app.delete("/units/{unit_id}")
async def delete_unit(unit_id: str):
    try:
        response = (
            client.from_('units')
            .delete()
            .eq('id', unit_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Unit not found")
        return {"message": "Deletion successful"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {e}")

# ========== Students Routes ==========
@app.get("/students")
async def get_students():
    try:
        response = (
            supabase_client.from_('students')
            .select('*')
            .order('created_at', desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@app.post("/students")
async def create_student(student: StudentBase):
    try:
        # 检查学生是否已存在
        existing_check = supabase_client.from_('students') \
            .select('student_id') \
            .eq('student_id', student.student_id) \
            .execute()
        
        if existing_check.data:
            raise HTTPException(status_code=400, detail="Student ID already exists")
        
        # 准备插入数据，包含新字段
        student_data = {
            'student_id': student.student_id,
            'student_name': student.student_name,
            'student_email': student.student_email,
            'student_course': student.student_course,
            'student_major': student.student_major,
            'intake_term': student.intake_term,
            'intake_year': student.intake_year,
            'graduation_status': student.graduation_status,
            'credit_point': student.credit_point,
            'student_type': student.student_type,  # 新增
            'has_spm_bm_credit': student.has_spm_bm_credit,  # 新增
            'created_at': 'now()'
        }
        
        # 插入数据
        result = supabase_client.from_('students').insert(student_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create student")
            
        return {"message": "Student created successfully", "student": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    

@app.put("/students/{student_id}")
async def update_student(student_id: int, student: StudentBase):
    try:
        # 检查学生是否存在
        existing_check = supabase_client.from_('students') \
            .select('student_id') \
            .eq('student_id', student_id) \
            .execute()
        
        if not existing_check.data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # 准备更新数据，包含新字段
        update_data = {
            'student_name': student.student_name,
            'student_email': student.student_email,
            'student_course': student.student_course,
            'student_major': student.student_major,
            'intake_term': student.intake_term,
            'intake_year': student.intake_year,
            'graduation_status': student.graduation_status,
            'credit_point': student.credit_point,
            'student_type': student.student_type,  # 新增
            'has_spm_bm_credit': student.has_spm_bm_credit,  # 新增
        }
        
        # 更新数据
        result = supabase_client.from_('students') \
            .update(update_data) \
            .eq('student_id', student_id) \
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update student")
            
        return {"message": "Student updated successfully", "student": result.data[0]}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/students/{student_id}")
async def delete_student(student_id: int):
    try:
        response = (
            client.from_('students')
            .delete()
            .eq('student_id', student_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"message": "Deletion successful"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {e}")
    
@app.get("/students")
async def get_students():
    try:
        response = supabase_client.from_('students') \
            .select('*') \
            .execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/students/{student_id}")
async def get_student(student_id: int):
    try:
        response = supabase_client.from_('students') \
            .select('*') \
            .eq('student_id', student_id) \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
            
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_student_units(student_id: int):
    try:
        resp = (
            supabase_client
            .from_('student_units')         
            .select('*')
            .eq('student_id', student_id)
            .order('unit_code', desc=False)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching units: {e}")
    
# Add search endpoint for students
@app.get("/students/search/{student_id}")
async def search_student(student_id: int):
    try:
        response = client.from_('students') \
                        .select('*') \
                        .eq('student_id', student_id) \
                        .execute()
        
        if not response.data:
            return JSONResponse(
                status_code=404,
                content={"message": f"Student with ID {student_id} not found"}
            )
            
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@app.put("/students/{student_id}/graduate", response_model=GraduationStatus)
async def process_graduation(student_id: int):
    try:
        def normalize_code(s):
            return "" if s is None else str(s).strip().upper()

        def normalize_type(s):
            return "" if s is None else str(s).strip().lower()

        def normalize_course_name(s):
            return "" if s is None else str(s).strip().lower()

        print(f"=== DEBUG: Checking graduation for student {student_id} ===")

        # 1. Load student info (包括 student_type 和 has_spm_bm_credit)
        student_res = supabase_client.from_("students") \
            .select("student_course, student_major, intake_year, intake_term, credit_point, graduation_status, student_type, has_spm_bm_credit") \
            .eq("student_id", student_id) \
            .execute()

        if not student_res.data:
            raise HTTPException(404, "Student not found")

        student = student_res.data[0]
        student_course = student["student_course"]
        student_major = student["student_major"]
        intake_year = student["intake_year"]
        intake_term = student["intake_term"]
        
        # 提取和标准化学生类型和SPM BM学分信息
        student_type = (student.get("student_type") or "malaysian").strip().lower()
        
        # 标准化 SPM BM credit 为布尔值
        raw_credit = student.get("has_spm_bm_credit", True)
        if isinstance(raw_credit, str):
            has_spm_credit = raw_credit.lower() in ["true", "1", "yes", "y"]
        else:
            has_spm_credit = bool(raw_credit)

        print("✅ DEBUG: student_type =", student_type, "| has_spm_credit =", has_spm_credit)

        # 2. Completed units
        completed_units_res = supabase_client.from_("student_units") \
            .select("unit_code") \
            .eq("student_id", student_id) \
            .eq("completed", True) \
            .neq("grade", "F") \
            .execute()

        passed_codes_norm = {
            normalize_code(u["unit_code"]) for u in (completed_units_res.data or []) if u.get("unit_code")
        }

        # Check if student has no completed units
        if not passed_codes_norm:
            updated_student = await supabase_update_student(student_id, {"credit_point": 0, "graduation_status": False})
            return GraduationStatus(
                can_graduate=False,
                total_credits=0,
                core_credits=0.0,
                major_credits=0.0,
                core_completed=0,
                major_completed=0,
                mpu_requirements_met=False,
                mpu_types_completed=[],
                missing_core_units=[],
                missing_major_units=[],
                messages=["No completed units found. Student has not passed any units yet."],
                planner_info="",
                updated_student=updated_student
            )

        # Calculate total credits with special handling for ICT20016
        total_credits = 0
        for unit in (completed_units_res.data or []):
            unit_code = normalize_code(unit["unit_code"])
            if unit_code == "ICT20016":
                total_credits += 25
            else:
                total_credits += 12.5

        # 3. All planners
        all_planners_res = supabase_client.from_("study_planners") \
            .select("id, program, major, intake_year, intake_semester") \
            .execute()

        all_planners = all_planners_res.data or []

        # 4. Match planner
        matched_planners = [
            p for p in all_planners
            if normalize_course_name(p["program"]) == normalize_course_name(student_course)
            and normalize_course_name(p["major"]) == normalize_course_name(student_major)
            and str(p["intake_year"]) == str(intake_year)
            and str(p["intake_semester"]) == str(intake_term)
        ]

        if not matched_planners:
            updated_student = await supabase_update_student(student_id, {"credit_point": total_credits, "graduation_status": False})
            print(f"DEBUG: Updated student (no planner): {updated_student}")
            return GraduationStatus(
                can_graduate=False,
                total_credits=total_credits,
                core_credits=0.0,
                major_credits=0.0,
                core_completed=0,
                major_completed=0,
                mpu_requirements_met=False,
                mpu_types_completed=[],
                missing_core_units=[f"找不到学习计划: {student_course} - {student_major}"],
                missing_major_units=[f"需要: {student_course} 主修 {student_major}, 入学 {intake_year} {intake_term}"],
                messages=["No study planner found for this student's course and intake."],
                planner_info=""
            )

        planner_id = matched_planners[0]["id"]

        # 5. Load required units and apply MPU filtering (与progress endpoint相同)
        required_units_res = supabase_client.from_("study_planner_units") \
            .select("unit_code, unit_type") \
            .eq("planner_id", planner_id) \
            .execute()

        required_units = required_units_res.data or []
        
        # 🧹 应用MPU过滤逻辑 (与progress endpoint相同)
        filtered_units = []
        for unit in required_units:
            code = str(unit.get("unit_code", "")).upper()

            if "MPU" in code:
                # 1️⃣ Bahasa Kebangsaan A — Malaysians without SPM BM credit only
                if code.startswith("MPU321") and (student_type != "malaysian" or has_spm_credit):
                    continue
                # 2️⃣ Penghayatan Etika dan Peradaban — Malaysians only
                if code.startswith("MPU318") and student_type != "malaysian":
                    continue
                # 3️⃣ Malay Language Communication 2 — Internationals only
                if code.startswith("MPU314") and student_type == "malaysian":
                    continue
                # ✅ Others like MPU3272, MPU3192, MPU3412 stay

            filtered_units.append(unit)

        # 6. 检查学生是否完成了所有过滤后的必修科目
        required_codes_norm = {normalize_code(unit["unit_code"]) for unit in filtered_units}
        completed_required = required_codes_norm & passed_codes_norm
        missing_required = required_codes_norm - passed_codes_norm

        # 7. 毕业条件：完成所有过滤后的必修科目
        can_graduate = len(missing_required) == 0

        # 8. 计算各类别的学分和完成情况（用于显示）
        core_units = [normalize_code(u["unit_code"]) for u in filtered_units if normalize_type(u["unit_type"]) == "core"]
        major_units = [normalize_code(u["unit_code"]) for u in filtered_units if normalize_type(u["unit_type"]) == "major"]
        
        core_set = set(core_units)
        major_set = set(major_units)

        completed_core = core_set & passed_codes_norm
        completed_major = major_set & passed_codes_norm
        missing_core = core_set - passed_codes_norm
        missing_major = major_set - passed_codes_norm

        # Calculate credits with special handling for ICT20016
        core_credits = 0
        for unit_code in completed_core:
            if unit_code == "ICT20016":
                core_credits += 25
            else:
                core_credits += 12.5

        major_credits = 0
        for unit_code in completed_major:
            if unit_code == "ICT20016":
                major_credits += 25
            else:
                major_credits += 12.5

        # 9. 生成消息
        messages = []
        
        # 总体完成情况
        if can_graduate:
            messages.append("All required units completed - Eligible for graduation")
        else:
            messages.append(f"Not all required units completed: {len(completed_required)}/{len(required_codes_norm)}")
        
        # Core units message
        if missing_core:
            messages.append(f"Missing {len(missing_core)} core units: {', '.join(list(missing_core))}")
        else:
            messages.append("All core units completed")
        
        # Major units message
        if missing_major:
            messages.append(f"Missing {len(missing_major)} major units: {', '.join(list(missing_major))}")
        else:
            messages.append("All major units completed")
        
        # 其他缺失科目（非core非major）
        other_missing = missing_required - missing_core - missing_major
        if other_missing:
            messages.append(f"Missing {len(other_missing)} other required units: {', '.join(list(other_missing))}")

        # FIX: Add await here
        updated_student = await supabase_update_student(student_id, {"credit_point": total_credits, "graduation_status": can_graduate})
        print(f"DEBUG: Updated student data: {updated_student}")

        return GraduationStatus(
            can_graduate=can_graduate,
            total_credits=total_credits,
            core_credits=core_credits,
            major_credits=major_credits,
            core_completed=len(completed_core),
            major_completed=len(completed_major),
            mpu_requirements_met=True,  # 由于三种不同MPU要求已作废，设为True
            mpu_types_completed=[],     # 清空MPU类型列表
            missing_core_units=list(missing_core),
            missing_major_units=list(missing_major),
            messages=messages,
            planner_info=f"Planner {planner_id} for {student_course} - {student_major} (Filtered MPU based on student type)",
            # Include the updated student data in the response
            updated_student=updated_student
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        print("❌ CRITICAL ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
async def supabase_update_student(student_id: int, payload: dict):
    try:
        print(f"DEBUG: Updating student {student_id} with {payload}")
        
        upd_res = supabase_client.from_("students") \
            .update(payload) \
            .eq("student_id", student_id) \
            .execute()

        print(f"DEBUG: Raw update response: {upd_res}")

        # Check for errors
        if hasattr(upd_res, 'error') and upd_res.error:
            print(f"❌ Database update error: {upd_res.error}")
            raise HTTPException(500, f"DB update error: {upd_res.error}")

        # Get the updated data by querying again
        verify_res = supabase_client.from_("students") \
            .select("student_id, credit_point, graduation_status, student_name, student_course, student_major") \
            .eq("student_id", student_id) \
            .execute()

        if not verify_res.data:
            print(f"❌ Could not verify update for student {student_id}")
            raise HTTPException(500, "Update verification failed")

        updated_data = verify_res.data[0]
        print(f"DEBUG: Verified updated student: {updated_data}")
        
        return updated_data

    except Exception as e:
        print(f"❌ Error in supabase_update_student: {str(e)}")
        raise


@app.get("/")
def read_root():
    return {"message": "FastAPI backend is running"}

@app.get("/students/search/{student_id}")
async def search_student(student_id: int):
    try:
        response = client.from_('students') \
                        .select('*') \
                        .eq('student_id', student_id) \
                        .execute()
        
        if not response.data:
            return JSONResponse(
                status_code=404,
                content={"message": f"Student with ID {student_id} not found"}
            )
            
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")

@app.post("/api/upload-students")
async def upload_students(file: UploadFile = File(...)):
    try:
        print(f"DEBUG: Uploading students from file: {file.filename}")
        
        # 1. 验证文件类型和大小
        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are supported")
        
        # 2. 读取Excel文件
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 3. 标准化列名（移除空格，转为小写）
        df.columns = [col.strip().lower() for col in df.columns]
        print(f"DEBUG: Excel columns: {df.columns.tolist()}")
        
        # 4. 映射列名 - 添加新列的映射
        column_mapping = {
            'name': 'student_name',
            'id': 'student_id', 
            'email': 'student_email',
            'course': 'student_course',
            'major': 'student_major',
            'intake term': 'intake_term',
            'intake year': 'intake_year',
            'student type': 'student_type',  # 新增
            'student_type': 'student_type',  # 新增
            'has spm bm credit': 'has_spm_bm_credit',  # 新增
            'has_spm_bm_credit': 'has_spm_bm_credit',  # 新增
            'spm bm credit': 'has_spm_bm_credit',  # 别名
            'bm credit': 'has_spm_bm_credit'  # 别名
        }
        
        # 检查必需的列
        required_columns = ['name', 'id', 'email', 'course', 'major', 'intake term', 'intake year']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # 5. 重命名列
        df = df.rename(columns=column_mapping)
        
        # 6. 处理数据并设置默认值
        students_to_insert = []
        existing_students = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                student_id = int(row['student_id'])
                student_name = str(row['student_name']).strip()
                student_email = str(row['student_email']).strip()
                student_course = str(row['student_course']).strip()
                student_major = str(row['student_major']).strip()
                intake_term = str(row['intake_term']).strip()
                intake_year = str(row['intake_year']).strip()
                
                # 处理新列 - student_type
                student_type = "malaysian"  # 默认值
                if 'student_type' in row and pd.notna(row['student_type']):
                    raw_type = str(row['student_type']).strip().lower()
                    if raw_type in ['malaysian', 'international', 'local']:
                        student_type = raw_type
                    else:
                        # 尝试映射常见值
                        type_mapping = {
                            'malay': 'malaysian',
                            'my': 'malaysian',
                            'intl': 'international',
                            'foreign': 'international',
                            'local': 'malaysian'
                        }
                        student_type = type_mapping.get(raw_type, 'malaysian')
                
                # 处理新列 - has_spm_bm_credit
                has_spm_bm_credit = True  # 默认值
                if 'has_spm_bm_credit' in row and pd.notna(row['has_spm_bm_credit']):
                    raw_credit = row['has_spm_bm_credit']
                    if isinstance(raw_credit, bool):
                        has_spm_bm_credit = raw_credit
                    elif isinstance(raw_credit, (int, float)):
                        has_spm_bm_credit = bool(raw_credit)
                    elif isinstance(raw_credit, str):
                        has_spm_bm_credit = raw_credit.lower() in ['true', '1', 'yes', 'y', '有', '具备']
                
                # 验证必需字段
                if not student_name:
                    errors.append(f"Row {index+2}: Student name is required")
                    continue
                if not student_email:
                    errors.append(f"Row {index+2}: Student email is required")
                    continue
                if not student_course:
                    errors.append(f"Row {index+2}: Student course is required")
                    continue
                if not student_major:
                    errors.append(f"Row {index+2}: Student major is required")
                    continue
                
                # 检查学生是否已存在
                existing_check = supabase_client.from_('students') \
                    .select('student_id') \
                    .eq('student_id', student_id) \
                    .execute()
                
                if existing_check.data:
                    existing_students.append(student_id)
                    continue
                
                # 准备插入数据
                student_data = {
                    'student_id': student_id,
                    'student_name': student_name,
                    'student_email': student_email,
                    'student_course': student_course,
                    'student_major': student_major,
                    'intake_term': intake_term,
                    'intake_year': intake_year,
                    'student_type': student_type,  # 新增
                    'has_spm_bm_credit': has_spm_bm_credit,  # 新增
                    'graduation_status': False,
                    'credit_point': 0.0,
                    'created_at': 'now()'
                }
                
                students_to_insert.append(student_data)
                
            except ValueError as e:
                errors.append(f"Row {index+2}: Invalid student ID format - {str(e)}")
            except Exception as e:
                errors.append(f"Row {index+2}: Error processing data - {str(e)}")
        
        # 7. 插入新学生数据
        inserted_count = 0
        if students_to_insert:
            result = supabase_client.from_('students').insert(students_to_insert).execute()
            inserted_count = len(result.data) if result.data else 0
            print(f"DEBUG: Inserted {inserted_count} new students")
        
        # 8. 返回结果
        response_message = f"Successfully processed {len(df)} rows. "
        response_message += f"Inserted {inserted_count} new students. "
        
        if existing_students:
            response_message += f"Skipped {len(existing_students)} existing students. "
        
        if errors:
            response_message += f"Encountered {len(errors)} errors."
        
        return {
            "message": response_message,
            "summary": {
                "total_rows": len(df),
                "inserted": inserted_count,
                "skipped_existing": len(existing_students),
                "errors": len(errors)
            },
            "details": {
                "existing_student_ids": existing_students,
                "errors": errors
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error uploading students: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


 
@app.post("/students/{student_id}/upload-units-adapted")
async def upload_units_adapted(
    student_id: int,
    file: UploadFile = File(...),
    overwrite: bool = Form(True),
):
    """适配现有表结构的上传 - 只使用存在的列"""
    try:
        print(f"DEBUG: Adapted upload for student {student_id}")
        
        # 1. 验证学生存在
        student_check = client.from_("students").select("student_id, student_name, credit_point").eq("student_id", student_id).execute()
        if not student_check.data:
            raise HTTPException(404, f"Student {student_id} not found")
        
        student_info = student_check.data[0]
        print(f"DEBUG: Student found: {student_info}")
        
        # 2. 读取Excel
        file.file.seek(0)
        df = pd.read_excel(file.file, engine="openpyxl")
        print(f"DEBUG: Original columns: {df.columns.tolist()}")
        
        # 3. 标准化列名
        df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
        print(f"DEBUG: Normalized columns: {df.columns.tolist()}")
        
        # 4. 映射列名
        column_mapping = {
            'course': 'unit_code',
            'course_code': 'unit_code',
            'course_title': 'unit_name',
            'title': 'unit_name'
        }
        
        for old_col, new_col in column_mapping.items():
            if old_col in df.columns and new_col not in df.columns:
                df.rename(columns={old_col: new_col}, inplace=True)
        
        print(f"DEBUG: After mapping: {df.columns.tolist()}")
        
        # 5. 清理数据
        if 'unit_code' not in df.columns:
            raise HTTPException(400, f"Missing unit_code. Available: {df.columns.tolist()}")
            
        df = df.dropna(subset=['unit_code'])
        df = df[df['unit_code'].astype(str).str.strip() != '']
        df = df[~df['unit_code'].astype(str).str.strip().isin(['1', '2', '3'])]
        print(f"DEBUG: After cleaning: {len(df)} rows")
        
        # 6. 处理数据 - 只使用存在的列
        units = []
        total_earned_credits = 0
        
        for idx, row in df.iterrows():
            try:
                unit_code = str(row['unit_code']).strip()
                unit_name = str(row.get('unit_name', '')).strip()
                status = str(row.get('status', '')).strip().lower()
                grade = str(row.get('grade', '')).strip().upper()
                
                # 确定完成状态
                completed = status in ['complete', 'completed']
                if not completed and grade and grade not in ['', 'N', 'F', 'FAIL']:
                    completed = True
                
                # 计算获得学分（用于更新学生总学分）
                try:
                    earned_credits = float(row.get('earned', 0))
                except (ValueError, TypeError):
                    earned_credits = 0.0
                
                # 如果状态是完成但Earned为0，检查是否需要调整
                if completed and earned_credits == 0:
                    # 尝试从Credits列获取默认学分
                    try:
                        default_credits = float(row.get('credits', 12.5))
                        # 只有当成绩不是不及格时才给学分
                        if grade not in ['N', 'F', 'FAIL']:
                            earned_credits = default_credits
                    except (ValueError, TypeError):
                        pass
                
                # 构建单元记录 - 只使用存在的列
                unit_data = {
                    "student_id": student_id,
                    "unit_code": unit_code,
                    "unit_name": unit_name or f"Unit {unit_code}",
                    "grade": grade,
                    "completed": completed
                }
                
                units.append(unit_data)
                total_earned_credits += earned_credits
                
                print(f"DEBUG: Processed {unit_code}: completed={completed}, earned_credits={earned_credits}")
                
            except Exception as e:
                print(f"DEBUG: Row {idx} error: {e}")
                continue
        
        print(f"DEBUG: Prepared {len(units)} units")
        print(f"DEBUG: Sample unit: {units[0] if units else 'No units'}")
        
        if not units:
            raise HTTPException(400, "No valid units found")
        
        # 7. 删除现有数据
        if overwrite:
            try:
                delete_result = client.from_("student_units").delete().eq("student_id", student_id).execute()
                print(f"DEBUG: Deleted existing units: {delete_result}")
            except Exception as e:
                print(f"DEBUG: Delete warning: {e}")
        
        # 8. 插入数据
        inserted_count = 0
        if units:
            # 分批插入以避免超时
            batch_size = 50
            for i in range(0, len(units), batch_size):
                batch = units[i:i + batch_size]
                try:
                    result = client.from_("student_units").insert(batch).execute()
                    if result.data:
                        inserted_count += len(result.data)
                    print(f"DEBUG: Batch {i//batch_size + 1} inserted")
                except Exception as e:
                    print(f"DEBUG: Batch {i//batch_size + 1} error: {e}")
        
        print(f"DEBUG: Total inserted: {inserted_count} units")
        
        # 9. 更新学生学分
        try:
            # 获取当前学分
            current_credits = student_info.get('credit_point', 0) or 0
            
            # 如果选择覆盖，则使用新计算的学分；否则累加
            if overwrite:
                new_credits = total_earned_credits
            else:
                new_credits = current_credits + total_earned_credits
            
            update_result = client.from_("students").update({"credit_point": new_credits}).eq("student_id", student_id).execute()
            print(f"DEBUG: Updated student credits from {current_credits} to {new_credits}")
        except Exception as e:
            print(f"DEBUG: Credit update warning: {e}")
        
        return {
            "message": f"Successfully processed {inserted_count} units",
            "student_id": student_id,
            "student_name": student_info['student_name'],
            "units_processed": inserted_count,
            "total_credits": total_earned_credits,
            "table_columns_used": ["student_id", "unit_code", "unit_name", "grade", "completed"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Adapted upload error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"Upload failed: {str(e)}")     

@app.post("/students/bulk-upload-units-adapted")
async def bulk_upload_units_adapted(
    files: List[UploadFile] = File(...),
    overwrite: bool = Form(True),
):
    """适配表结构的批量上传"""
    try:
        print(f"DEBUG: Adapted bulk upload for {len(files)} files")
        all_results = []
        total_success = 0
        total_errors = 0

        for file in files:
            file_result = {
                "filename": file.filename,
                "status": "pending",
                "message": "",
                "student_id": None,
                "units_processed": 0
            }
            
            try:
                # 从文件名提取学生ID
                import re
                numbers = re.findall(r'\d+', file.filename)
                if not numbers:
                    file_result.update({
                        "status": "error", 
                        "message": "Cannot extract student ID from filename"
                    })
                    all_results.append(file_result)
                    total_errors += 1
                    continue
                    
                student_id = int(numbers[0])
                file_result["student_id"] = student_id
                
                # 验证学生存在
                student_check = client.from_("students").select("student_id, student_name").eq("student_id", student_id).execute()
                if not student_check.data:
                    file_result.update({
                        "status": "error",
                        "message": f"Student {student_id} not found"
                    })
                    all_results.append(file_result)
                    total_errors += 1
                    continue
                
                # 读取和处理Excel文件（使用与单个上传相同的逻辑）
                file.file.seek(0)
                df = pd.read_excel(file.file, engine="openpyxl")
                
                # 标准化列名
                df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
                
                # 映射列名
                column_mapping = {
                    'course': 'unit_code',
                    'course_code': 'unit_code',
                    'course_title': 'unit_name',
                    'title': 'unit_name'
                }
                
                for old_col, new_col in column_mapping.items():
                    if old_col in df.columns and new_col not in df.columns:
                        df.rename(columns={old_col: new_col}, inplace=True)
                
                # 清理数据
                if 'unit_code' not in df.columns:
                    file_result.update({
                        "status": "error",
                        "message": "Missing unit_code column"
                    })
                    all_results.append(file_result)
                    total_errors += 1
                    continue
                    
                df = df.dropna(subset=['unit_code'])
                df = df[df['unit_code'].astype(str).str.strip() != '']
                df = df[~df['unit_code'].astype(str).str.strip().isin(['1', '2', '3'])]
                
                # 处理数据
                units = []
                total_earned_credits = 0
                
                for _, row in df.iterrows():
                    try:
                        unit_code = str(row['unit_code']).strip()
                        unit_name = str(row.get('unit_name', '')).strip()
                        status = str(row.get('status', '')).strip().lower()
                        grade = str(row.get('grade', '')).strip().upper()
                        
                        completed = status in ['complete', 'completed']
                        if not completed and grade and grade not in ['', 'N', 'F', 'FAIL']:
                            completed = True
                        
                        # 计算学分
                        try:
                            earned_credits = float(row.get('earned', 0))
                        except:
                            earned_credits = 0.0
                            
                        if completed and earned_credits == 0 and grade not in ['N', 'F', 'FAIL']:
                            try:
                                earned_credits = float(row.get('credits', 12.5))
                            except:
                                earned_credits = 12.5
                        
                        units.append({
                            "student_id": student_id,
                            "unit_code": unit_code,
                            "unit_name": unit_name or f"Unit {unit_code}",
                            "grade": grade,
                            "completed": completed
                        })
                        
                        total_earned_credits += earned_credits
                        
                    except Exception:
                        continue
                
                if not units:
                    file_result.update({
                        "status": "error",
                        "message": "No valid units found"
                    })
                    all_results.append(file_result)
                    total_errors += 1
                    continue
                
                # 删除现有数据
                if overwrite:
                    client.from_("student_units").delete().eq("student_id", student_id).execute()
                
                # 插入数据
                result = client.from_("student_units").insert(units).execute()
                inserted_count = len(result.data) if result.data else 0
                
                # 更新学分
                client.from_("students").update({"credit_point": total_earned_credits}).eq("student_id", student_id).execute()
                
                file_result.update({
                    "status": "success",
                    "message": f"Processed {inserted_count} units",
                    "units_processed": inserted_count
                })
                
                all_results.append(file_result)
                total_success += 1
                
            except Exception as e:
                file_result.update({
                    "status": "error",
                    "message": f"File processing failed: {str(e)}"
                })
                all_results.append(file_result)
                total_errors += 1
                continue
        
        return {
            "message": f"Bulk upload completed: {total_success} successful, {total_errors} failed",
            "summary": {
                "total_files": len(files),
                "successful_files": total_success,
                "failed_files": total_errors
            },
            "results": all_results
        }
        
    except Exception as e:
        raise HTTPException(500, f"Bulk upload failed: {str(e)}") 
    
@app.get("/api/analytics/overview")
def analytics_overview():
    # 🧮 Students by intake year
    rows = supabase_client.table("students").select("intake_year").execute().data or []
    by_year: Dict[str, int] = {}
    for r in rows:
        y = r.get("intake_year") or "Unknown"
        by_year[y] = by_year.get(y, 0) + 1
    students_by_year = [{"intake_year": k, "total_students": v} for k, v in sorted(by_year.items())]

    # 🎓 Students by program + major + intake year (excluding graduated)
    rows2 = (
        supabase_client.table("students")
        .select("student_course, student_major, intake_year, graduation_status")
        .execute()
        .data or []
    )
    pm_map: Dict[tuple, int] = {}
    for r in rows2:
        if r.get("graduation_status"):  # skip graduated students
            continue
        program = r.get("student_course") or "Unknown Program"
        major = r.get("student_major") or "Unknown Major"
        year = r.get("intake_year") or "Unknown"
        key = (program, major, year)
        pm_map[key] = pm_map.get(key, 0) + 1
    students_by_program_major = [
        {"program": k[0], "major": k[1], "intake_year": k[2], "total_students": v}
        for k, v in pm_map.items()
    ]

    # 🏅 Graduation by intake year
    rows3 = (
        supabase_client.table("students")
        .select("intake_year, graduation_status")
        .execute()
        .data or []
    )
    grad_map: Dict[str, Dict[str, int]] = {}
    for r in rows3:
        year = r.get("intake_year") or "Unknown"
        if year not in grad_map:
            grad_map[year] = {"graduated": 0, "not_graduated": 0}
        if r.get("graduation_status"):
            grad_map[year]["graduated"] += 1
        else:
            grad_map[year]["not_graduated"] += 1
    graduation_by_year = [{"intake_year": k, **v} for k, v in sorted(grad_map.items())]

    return {
        "students_by_year": students_by_year,
        "students_by_program_major": students_by_program_major,
        "graduation_by_year": graduation_by_year,
    }

@app.get("/api/analytics/graduation-summary")
def graduation_summary():
    rows = supabase_client.table("students").select("student_course, student_major, intake_year, graduation_status").execute().data or []
    summary: Dict[tuple, int] = {}
    for r in rows:
        if r.get("graduation_status"):
            key = (r.get("student_course") or "Unknown", r.get("student_major") or "Unknown", r.get("intake_year") or "Unknown")
            summary[key] = summary.get(key, 0) + 1
    return [{"program": k[0], "major": k[1], "year": k[2], "graduates": v} for k, v in summary.items()]

@app.get("/api/analytics/grade-distribution")
def grade_distribution(request: Request):
    try:
        # ✅ Read query parameter correctly
        unit_code = request.query_params.get("unit_code")

        # ✅ Fetch all unit codes (for dropdown)
        all_rows = supabase_client.table("student_units").select("unit_code").execute().data or []
        available_units = sorted(list({(r["unit_code"] or "").strip() for r in all_rows if r.get("unit_code")}))

        # ✅ Prepare query for grade distribution
        query = supabase_client.table("student_units").select("unit_code, grade")

        if unit_code:
            query = query.eq("unit_code", unit_code.strip())

        rows = query.execute().data or []

        # ✅ Count grades only for relevant rows
        grade_counts = {}
        for r in rows:
            grade = (r.get("grade") or "Unknown").strip()
            grade_counts[grade] = grade_counts.get(grade, 0) + 1

        return {
            "grades": grade_counts,
            "available_units": available_units,
        }

    except Exception as e:
        print("🔥 Error in /api/analytics/grade-distribution:", e)
        return {"error": str(e)}

@app.get("/api/analytics/unit-performance")
def unit_performance():
    rows = supabase_client.table("student_units").select("unit_code, unit_name, grade, completed").execute().data or []
    unit_map: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        code = r.get("unit_code") or "Unknown"
        name = r.get("unit_name") or ""
        if code not in unit_map:
            unit_map[code] = {"unit_name": name, "grades": [], "completed": 0, "total": 0}
        unit_map[code]["grades"].append((r.get("grade") or "N/A").upper())
        unit_map[code]["total"] += 1
        if r.get("completed"):
            unit_map[code]["completed"] += 1

    def grade_to_point(g: str) -> float:
        map_ = {"A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
                "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0}
        return map_.get(g, 0.0)

    result = []
    for code, v in unit_map.items():
        grades = v["grades"]
        avg_point = round(sum(grade_to_point(g) for g in grades) / len(grades), 2) if grades else 0.0
        completion_rate = round((v["completed"] / v["total"]) * 100, 1) if v["total"] else 0.0
        result.append({
            "unit_code": code,
            "unit_name": v["unit_name"],
            "avg_grade": avg_point,
            "completion_rate": completion_rate
        })
    return result

@app.get("/api/analytics/trends")
def graduation_trends():
    rows = supabase_client.table("students").select("intake_year, graduation_status").execute().data or []

    trends: Dict[str, Dict[str, int]] = {}

    for r in rows:
        year = str(r.get("intake_year") or "Unknown")
        grad_status = r.get("graduation_status")

        if year not in trends:
            trends[year] = {"graduated": 0, "not_graduated": 0}

        if grad_status:
            trends[year]["graduated"] += 1
        else:
            trends[year]["not_graduated"] += 1

    # ✅ Proper numeric sorting by year, Unknown goes last
    sorted_trends = sorted(
        trends.items(),
        key=lambda x: int(x[0]) if x[0].isdigit() else 9999
    )

    return [
        {
            "year": year,
            "graduated": data["graduated"],
            "not_graduated": data["not_graduated"],
        }
        for year, data in sorted_trends
    ]

@app.get("/api/analytics/program-breakdown")
def program_breakdown():
    rows = supabase_client.table("students").select("student_course, student_major, intake_year, intake_term, graduation_status").execute().data or []
    summary: Dict[tuple, Dict[str, int]] = {}
    for r in rows:
        key = (r.get("student_course") or "Unknown", r.get("student_major") or "Unknown", r.get("intake_year") or "Unknown", r.get("intake_term") or "Unknown")
        if key not in summary:
            summary[key] = {"total": 0, "graduated": 0}
        summary[key]["total"] += 1
        if r.get("graduation_status"):
            summary[key]["graduated"] += 1
    return [
        {"program": k[0], "major": k[1], "intake_year": k[2], "intake_term": k[3], "total": v["total"], "graduated": v["graduated"]}
        for k, v in summary.items()
    ]

@app.get("/api/students/{student_id}/progress")
def get_student_progress(student_id: int):
    try:
        # 1️⃣ Fetch student info
        student_res = supabase_client.table("students").select("*").eq("student_id", student_id).execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Student not found")
        student = student_res.data[0]

        # 🧩 Normalize student_type and has_spm_bm_credit
        student_type = (student.get("student_type") or "malaysian").strip().lower()

        # Handle SPM BM credit safely
        raw_credit = student.get("has_spm_bm_credit")
        if raw_credit is None:
            has_spm_credit = True
        elif isinstance(raw_credit, bool):
            has_spm_credit = raw_credit
        elif isinstance(raw_credit, (int, float)):
            has_spm_credit = bool(raw_credit)
        elif isinstance(raw_credit, str):
            has_spm_credit = raw_credit.strip().lower() in ["true", "1", "yes", "y"]
        else:
            has_spm_credit = True

        print(f"✅ DEBUG: student_type={student_type}, has_spm_credit={has_spm_credit}")

        # 2️⃣ Fetch study planner
        program = student.get("student_course")
        major = student.get("student_major")
        intake_year = student.get("intake_year")
        intake_semester = student.get("intake_term")

        planner_res = supabase_client.table("study_planners").select("*").match({
            "program": program,
            "major": major,
            "intake_year": intake_year,
            "intake_semester": intake_semester,
        }).execute()

        if not planner_res.data:
            return {
                "student": student,
                "default_planner_units": [],
                "student_units": [],
                "completed_units": [],
                "remaining_units": [],
                "summary": {"completed_count": 0, "total_required": 0},
            }

        planner_id = planner_res.data[0]["id"]

        # 3️⃣ Fetch planner and student units
        planner_units = supabase_client.table("study_planner_units").select("*").eq("planner_id", planner_id).execute().data or []
        student_units = supabase_client.table("student_units").select("*").eq("student_id", student_id).execute().data or []

        # 🧹 4️⃣ Filter MPU units based on student type & SPM BM credit
        filtered_units = []
        for unit in planner_units:
            code = str(unit.get("unit_code", "")).upper()

            if "MPU" in code:
                # Bahasa Kebangsaan A — Malaysians WITHOUT SPM BM credit only
                if code.startswith("MPU321") and (student_type != "malaysian" or has_spm_credit):
                    continue
                # Penghayatan Etika dan Peradaban — Malaysians only
                if code.startswith("MPU318") and student_type != "malaysian":
                    continue
                # Malay Language Communication 2 — Internationals only
                if code.startswith("MPU314") and student_type == "malaysian":
                    continue

            filtered_units.append(unit)

        # 5️⃣ Determine completed and elective placeholders
        completed_codes = {u["unit_code"] for u in student_units if u.get("unit_code")}
        elective_placeholders = [
            u for u in filtered_units
            if str(u.get("unit_code")).lower() in ["0", "nan", "", "none", "—"]
        ]

        for unit in filtered_units:
            code = str(unit.get("unit_code"))
            unit["completed"] = False
            unit["replacement"] = None

            # ✅ If this unit is directly completed
            if code in completed_codes:
                unit["completed"] = True
            # ✅ If this unit is an elective placeholder, try to fill it
            elif unit in elective_placeholders:
                # Find an unmatched student unit that isn't already in planner
                unmatched = next(
                    (su for su in student_units if su["unit_code"] not in [p.get("unit_code") for p in filtered_units]),
                    None
                )
                if unmatched:
                    unit["completed"] = True
                    unit["replacement"] = unmatched["unit_code"]
                    unit["unit_name"] = f"{unit['unit_name']} (filled with {unmatched['unit_code']})"
                    # Remove matched student unit to avoid reuse
                    student_units.remove(unmatched)

        # 6️⃣ Split into completed and remaining
        completed_units = [u for u in filtered_units if u["completed"]]
        remaining_units = [u for u in filtered_units if not u["completed"]]

        # 7️⃣ Summary
        summary = {
            "completed_count": len(completed_units),
            "total_required": len(filtered_units)
        }

        # ✅ Final Response
        return {
            "student": student,
            "default_planner_units": filtered_units,
            "student_units": student_units,
            "completed_units": completed_units,
            "remaining_units": remaining_units,
            "elective_placeholders": elective_placeholders,
            "summary": summary
        }

    except Exception as e:
        print("❌ Error in get_student_progress:", str(e))
        raise HTTPException(status_code=500, detail=str(e))