from fastapi import FastAPI, File, UploadFile, Form, HTTPException, APIRouter, Query
from fastapi import Body
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import uuid
import supabase
from supabaseClient import get_supabase_client
from pydantic import BaseModel
from typing import List, Dict, Optional
from io import BytesIO
import traceback
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError

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
    prerequisites: str
    concurrent_prerequisites: str
    offered_terms: str
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

class StudentUnitBase(BaseModel):
    student_id: int
    unit_code: str
    unit_name: str
    grade: str
    completed: bool

class GraduationStatus(BaseModel):
    can_graduate:        bool
    total_credits:       float
    core_credits:        float
    major_credits:       float
    core_completed:      int
    major_completed:     int
    missing_core_units:  List[str]
    missing_major_units: List[str]

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
        }).single().execute()

        planner = planner_res.data

        if not planner:
            raise HTTPException(status_code=404, detail="No matching study planner found.")

        # Fetch the related units
        units_res = supabase_client.table("study_planner_units").select("*").eq("planner_id", planner["id"]).execute()
        units = units_res.data or []

        # Optional: sort the units
        def sort_key(unit):
            semester_order = {"1": 1, "2": 2, "Summer": 3, "Winter": 4}
            unit_type_order = {"Major": 1, "Core": 2, "Elective": 3, "MPU": 4, "WIL": 5}
            return (
                unit.get("year", 0),
                semester_order.get(unit.get("semester", ""), 99),
                unit_type_order.get(unit.get("unit_type", ""), 99)
            )

        units.sort(key=sort_key)

        return {
            "planner": planner,
            "units": units
        }

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

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
    
@app.delete("/api/delete-study-planner-unit")
def delete_study_planner_unit(id: str = Query(...)):
    try:
        res = supabase_client.table("study_planner_units").delete().eq("id", id).execute()
        print("Delete result:", res)

        # If res has 'status_code', check if it's successful (usually 200 or 204)
        if hasattr(res, 'status_code'):
            if res.status_code not in (200, 204):
                raise HTTPException(status_code=500, detail=f"Failed to delete unit: {res.data}")

        # If res.data is empty or delete count is 0, it means nothing deleted
        if hasattr(res, 'data') and (not res.data or len(res.data) == 0):
            raise HTTPException(status_code=404, detail="Unit not found or already deleted.")

        return {"message": f"Unit ID {id} deleted successfully."}
    except Exception as e:
        print("Exception during delete:", str(e))
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# @app.post("/api/add-study-planner-unit")
# def add_study_planner_unit(unit: dict = Body(...)):
#     try:
#         if "planner_id" not in unit:
#             raise HTTPException(status_code=400, detail="Missing required field: planner_id")

#         # Set default values
#         unit.setdefault("year", "1")
#         unit.setdefault("semester", "1")
#         unit.setdefault("unit_code", "")
#         unit.setdefault("unit_name", "")
#         unit.setdefault("unit_type", "")
#         unit.setdefault("prerequisites", "")

#         # Insert the unit
#         res = supabase_client.table("study_planner_units").insert(unit).execute()

#         # Validate the response
#         if not res.data or len(res.data) == 0:
#             raise HTTPException(status_code=500, detail="Failed to insert unit or no data returned.")

#         return {
#             "message": "Unit added successfully.",
#             "unit": res.data[0]
#         }

#     except Exception as e:
#         print("Add unit error:", str(e))
#         raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    
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
async def update_unit(unit_id: int, updated: UnitBase):
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

@app.delete("/units/{unit_id")
async def delete_unit(unit_id: int):
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
            client.from_('students')
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
        # Check if student ID or email already exists
        existing = (
            client.from_('students')
            .select('*')
            .or_(
                f"student_id.eq.{student.student_id},student_email.eq.{student.student_email}"
            )
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=400, detail="Student ID or email already exists")

        response = client.from_('students').insert(student.dict()).execute()
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Creation failed: {e}")

@app.put("/students/{student_id}")
async def update_student(student_id: int, student: StudentBase):
    try:
        response = (
            client.from_('students')
            .update(student.dict())
            .eq('student_id', student_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {e}")

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
    
@app.get(
    "/students/{student_id}/units",
    response_model=List[StudentUnitOut]
)
async def get_student_units(student_id: int):
    try:
        resp = (
            client
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

# Fix the graduation endpoint to handle cases where no planner is found
@app.put("/students/{student_id}/graduate", response_model=GraduationStatus)
async def process_graduation(student_id: int):
    try:
        # 1. Get student information
        student_res = client.from_('students') \
            .select('student_major, intake_year, intake_term') \
            .eq('student_id', student_id) \
            .execute()
        
        if not student_res.data:
            raise HTTPException(404, "Student not found")
            
        student = student_res.data[0]

        # 2. Get student's completed units (passed with grade != 'F')
        completed_units_res = client.from_('student_units') \
            .select('unit_code') \
            .eq('student_id', student_id) \
            .eq('completed', True) \
            .neq('grade', 'F') \
            .execute()
        
        passed_codes = [u['unit_code'] for u in completed_units_res.data]

        # 3. Get study planner for the student - handle case where no planner exists
        planner_res = client.from_('study_planners') \
            .select('id') \
            .eq('major', student['student_major']) \
            .eq('intake_year', int(student['intake_year'])) \
            .eq('intake_semester', student['intake_term']) \
            .execute()
        
        # If no planner found, return with all units as missing
        if not planner_res.data:
            return {
                "can_graduate": False,
                "total_credits": len(passed_codes) * 12.5,
                "core_credits": 0,
                "major_credits": 0,
                "core_completed": 0,
                "major_completed": 0,
                "missing_core_units": ["No study plan found for this student"],
                "missing_major_units": ["No study plan found for this student"]
            }

        planner = planner_res.data[0]

        # 4. Get required core and major units from planner
        required_units_res = client.from_('study_planner_units') \
            .select('unit_code, unit_type') \
            .eq('planner_id', planner['id']) \
            .execute()
        
        required_units = required_units_res.data
        core_units = [u['unit_code'] for u in required_units if u['unit_type'].lower() == 'core']
        major_units = [u['unit_code'] for u in required_units if u['unit_type'].lower() == 'major']

        # 5. Calculate completed requirements
        completed_core = [u for u in core_units if u in passed_codes]
        completed_major = [u for u in major_units if u in passed_codes]
        
        missing_core = [u for u in core_units if u not in passed_codes]
        missing_major = [u for u in major_units if u not in passed_codes]

        # 6. Calculate credits (12.5 per completed unit)
        total_credits = len(passed_codes) * 12.5
        core_credits = len(completed_core) * 12.5
        major_credits = len(completed_major) * 12.5

        # 7. Check graduation eligibility
        can_graduate = (total_credits >= 300 and 
                        not missing_core and 
                        not missing_major)

        # 8. Update graduation status if eligible
        if can_graduate:
            client.from_('students') \
                .update({'graduation_status': True}) \
                .eq('student_id', student_id) \
                .execute()

        return {
            "can_graduate": can_graduate,
            "total_credits": total_credits,
            "core_credits": core_credits,
            "major_credits": major_credits,
            "core_completed": len(completed_core),
            "major_completed": len(completed_major),
            "missing_core_units": missing_core,
            "missing_major_units": missing_major
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Server error: {str(e)}")
    
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

