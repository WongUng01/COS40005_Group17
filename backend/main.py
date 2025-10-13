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
import logging
from fastapi import Request
import math
import re

logger = logging.getLogger("uvicorn.error")

app = FastAPI()

planners_db: Dict[str, List[dict]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

#testing redeploy
@app.post("/api/upload-study-planner")
async def upload_study_planner(
    file: UploadFile = File(...),
    program: str = Form(...),
    major: str = Form(...),
    intake_year: int = Form(...),
    intake_semester: str = Form(...),
    overwrite: str = Form("false")
):
    logger.debug("Upload endpoint hit!")

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

        # Insert planner
        planner_id = str(uuid.uuid4())
        planner_data = {
            "id": planner_id,
            "program": program,
            "major": major,
            "intake_year": intake_year,
            "intake_semester": intake_semester,
        }
        supabase_client.table("study_planners").insert(planner_data).execute()

        # Build all units
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
            print("DEBUG row:", unit, flush=True)   # print each row
            units_to_insert.append(unit)

        # Debug first row
        if units_to_insert:
            print("DEBUG first row full:", units_to_insert[0], flush=True)
            print("DEBUG keys:", list(units_to_insert[0].keys()), flush=True)

        # Insert all rows
        supabase_client.table("study_planner_units").insert(units_to_insert).execute()

        return {"message": "Study planner uploaded successfully."}

    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        print("Internal Error:", str(e), flush=True)
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
        planner_res = (
            supabase_client.table("study_planners")
            .select("*")
            .match({
                "program": program,
                "major": major,
                "intake_year": intake_year,
                "intake_semester": intake_semester,
            })
            .single()
            .execute()
        )
        planner = planner_res.data

        if not planner:
            raise HTTPException(status_code=404, detail="No matching study planner found.")

        # Fetch the related units in the same order as Excel (row_index)
        units_res = (
            supabase_client.table("study_planner_units")
            .select("*")
            .eq("planner_id", planner["id"])
            .order("row_index", desc=False)   # ascending
            .execute()
        )

        units = units_res.data or []

        print("Row order:", [u["row_index"] for u in units])

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


@app.put("/students/{student_id}/graduate", response_model=GraduationStatus)
async def process_graduation(student_id: int):
    try:
        def normalize_code(s):
            if s is None:
                return ""
            return str(s).strip().upper()

        def normalize_type(s):
            if s is None:
                return ""
            return str(s).strip().lower()

        def normalize_course_name(s):
            if s is None:
                return ""
            # 标准化课程名称，移除多余空格并转为小写进行比较
            return str(s).strip().lower()

        print(f"=== DEBUG: Checking graduation for student {student_id} ===")

        # 1. Get student information
        student_res = client.from_('students') \
            .select('student_course, student_major, intake_year, intake_term, credit_point, graduation_status') \
            .eq('student_id', student_id) \
            .execute()

        if not student_res.data:
            raise HTTPException(404, "Student not found")

        student = student_res.data[0]
        student_course = student.get('student_course')
        student_major = student.get('student_major')
        intake_year = student.get('intake_year')
        intake_term = student.get('intake_term')
        current_credit_point = student.get('credit_point', 0)
        current_graduation_status = student.get('graduation_status', False)
        
        print(f"DEBUG: Student data - Course: '{student_course}', Major: '{student_major}', Year: '{intake_year}', Term: '{intake_term}'")
        print(f"DEBUG: Current credit_point: {current_credit_point}, graduation_status: {current_graduation_status}")

        # 2. Get student's completed units
        completed_units_res = client.from_('student_units') \
            .select('unit_code') \
            .eq('student_id', student_id) \
            .eq('completed', True) \
            .neq('grade', 'F') \
            .execute()

        passed_raw = [u.get('unit_code') for u in (completed_units_res.data or [])]
        passed_codes_norm = {normalize_code(c) for c in passed_raw if c is not None}

        print(f"DEBUG: Raw passed units: {passed_raw}")
        print(f"DEBUG: Normalized passed unit set: {passed_codes_norm}")

        # 3. 获取所有学习计划进行调试
        all_planners_res = client.from_('study_planners') \
            .select('id, program, major, intake_year, intake_semester') \
            .execute()

        print(f"DEBUG: All available planners: {all_planners_res.data}")

        # 4. 查找精确匹配的学习计划
        matched_planners = []
        for planner in all_planners_res.data:
            planner_course = planner.get('program')
            planner_major = planner.get('major')
            planner_year = planner.get('intake_year')
            planner_semester = planner.get('intake_semester')
            
            # 标准化比较
            if (normalize_course_name(planner_course) == normalize_course_name(student_course) and
                normalize_course_name(planner_major) == normalize_course_name(student_major) and
                str(planner_year) == str(intake_year) and
                str(planner_semester) == str(intake_term)):
                matched_planners.append(planner)

        print(f"DEBUG: Matched planners after normalization: {matched_planners}")

        # 计算总学分（无论是否有匹配的学习计划）
        total_credits = len(passed_codes_norm) * 12.5
        
        if not matched_planners:
            print(f"DEBUG: NO EXACT PLANNER MATCH FOUND!")
            print(f"DEBUG: Looking for - Course: '{student_course}', Major: '{student_major}', Year: {intake_year}, Term: '{intake_term}'")
            
            # 显示所有相关的学习计划用于调试
            cybersecurity_planners = [p for p in all_planners_res.data 
                                   if normalize_course_name(p.get('major')) == normalize_course_name('Cybersecurity')]
            print(f"DEBUG: All Cybersecurity planners: {cybersecurity_planners}")
            
            # 更新学分但不能毕业（因为没有学习计划）
            update_data = {
                'credit_point': total_credits,
                'graduation_status': False  # 没有学习计划不能毕业
            }
            client.from_('students') \
                .update(update_data) \
                .eq('student_id', student_id) \
                .execute()
            print(f"DEBUG: Updated credit_point to {total_credits}, graduation_status to False")
            
            return {
                "can_graduate": False,
                "total_credits": total_credits,
                "core_credits": 0.0,
                "major_credits": 0.0,
                "core_completed": 0,
                "major_completed": 0,
                "missing_core_units": [f"找不到学习计划: {student_course} - {student_major}"],
                "missing_major_units": [f"需要: {student_course} 主修 {student_major}, 入学 {intake_year} {intake_term}"]
            }

        if len(matched_planners) > 1:
            print(f"DEBUG: Multiple exact planners found: {matched_planners}")
            print("DEBUG: WARNING: Using first matching planner")

        planner = matched_planners[0]
        planner_id = planner['id']
        actual_course = planner.get('program')
        actual_major = planner.get('major')
        
        print(f"DEBUG: Using EXACT MATCH planner - ID: {planner_id}")
        print(f"DEBUG: Planner Course: '{actual_course}', Major: '{actual_major}'")

        # 5. Get required units from the CORRECT planner
        required_units_res = client.from_('study_planner_units') \
            .select('unit_code, unit_type, unit_name, planner_id') \
            .eq('planner_id', planner_id) \
            .execute()

        required_units = required_units_res.data or []
        print(f"DEBUG: Retrieved {len(required_units)} units for CORRECT planner_id: {planner_id}")
        
        # Filter units by type
        core_units_raw = []
        major_units_raw = []
        
        for unit in required_units:
            unit_type = normalize_type(unit.get('unit_type'))
            unit_code = unit.get('unit_code')
            
            if unit_code is None:
                continue
                
            if unit_type == 'core':
                core_units_raw.append(unit_code)
            elif unit_type == 'major':
                major_units_raw.append(unit_code)

        print(f"DEBUG: Core units for {actual_course}: {core_units_raw}")
        print(f"DEBUG: Major units for {actual_course}: {major_units_raw}")

        # Create normalized mappings
        core_norm_map = {normalize_code(code): code for code in core_units_raw}
        major_norm_map = {normalize_code(code): code for code in major_units_raw}

        core_required_norm_set = set(core_norm_map.keys())
        major_required_norm_set = set(major_norm_map.keys())

        # 6. Compare normalized sets
        completed_core_norm = core_required_norm_set.intersection(passed_codes_norm)
        completed_major_norm = major_required_norm_set.intersection(passed_codes_norm)

        missing_core_norm = core_required_norm_set - passed_codes_norm
        missing_major_norm = major_required_norm_set - passed_codes_norm

        # Map back to original raw codes
        completed_core = [core_norm_map[n] for n in completed_core_norm]
        completed_major = [major_norm_map[n] for n in completed_major_norm]
        missing_core = [core_norm_map[n] for n in missing_core_norm]
        missing_major = [major_norm_map[n] for n in missing_major_norm]

        print(f"DEBUG: Completed core: {completed_core}")
        print(f"DEBUG: Completed major: {completed_major}")
        print(f"DEBUG: Missing core: {missing_core}")
        print(f"DEBUG: Missing major: {missing_major}")

        # 7. Calculate specific credits
        core_credits = len(completed_core) * 12.5
        major_credits = len(completed_major) * 12.5

        # 8. Check graduation eligibility
        can_graduate = (total_credits >= 300 and not missing_core and not missing_major)

        # 9. Update student record with new credit_point and graduation_status
        update_data = {
            "credit_point": float(total_credits),
            "graduation_status": bool(can_graduate)
        }
        try:
            updated_student = supabase_update_student(student_id, update_data)
            print(f"DEBUG: supabase_update_student returned: {updated_student}")
        except HTTPException as he:
            print(f"DEBUG: supabase_update_student failed: {he.detail}")
            # 将失败也返回给前端（非 200）
            raise he
        
        # 10. Create planner_info for the response
        if matched_planners:
            planner = matched_planners[0]
            planner_info = f"{planner.get('program', 'Unknown Program')} - {planner.get('major', 'Unknown Major')} (Intake: {intake_year} {intake_term})"
        else:
            planner_info = f"No matching study plan found for {student_course} - {student_major}"

        print(f"DEBUG: Planner info: {planner_info}")

        # 最终返回：包含计算结果 + DB 返回的最新 student 行
        return JSONResponse(status_code=200, content={
            "graduation_result": {
                "can_graduate": can_graduate,
                "total_credits": total_credits,
                "core_credits": core_credits,
                "major_credits": major_credits,
                "core_completed": len(completed_core),
                "major_completed": len(completed_major),
                "missing_core_units": missing_core,
                "missing_major_units": missing_major,
                "planner_info": planner_info
            },
            "updated_student": updated_student
        })


    except HTTPException as he:
        print(f"DEBUG: HTTP Exception: {he}")
        raise he
    except Exception as e:
        print(f"DEBUG: General Exception: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"Server error: {str(e)}")
    
    

def supabase_update_student(student_id: int, payload: dict):
    upd_res = client.from_('students') \
        .update(payload) \
        .eq('student_id', student_id) \
        .select('id, student_id, credit_point, graduation_status') \
        .execute()

    # robust checks for different supabase client responses
    # case: object with .error and .data
    if hasattr(upd_res, 'error') and upd_res.error:
        print(f"DEBUG: Supabase update error (obj): {upd_res.error}")
        raise HTTPException(status_code=500, detail=f"DB update error: {upd_res.error}")

    # case: dict-like response
    if isinstance(upd_res, dict) and upd_res.get('error'):
        print(f"DEBUG: Supabase update error (dict): {upd_res.get('error')}")
        raise HTTPException(status_code=500, detail=f"DB update error: {upd_res.get('error')}")

    updated_rows = getattr(upd_res, 'data', None) or (upd_res.get('data') if isinstance(upd_res, dict) else None)
    if not updated_rows:
        print(f"DEBUG: Supabase update returned no rows: {upd_res}")
        # 返回 500 并把整个返回对象放到 detail（便于前端调试）
        raise HTTPException(status_code=500, detail={"message": "DB update did not return row", "raw": str(upd_res)})

    return updated_rows[0]


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
        
        # 4. 映射列名
        column_mapping = {
            'name': 'student_name',
            'id': 'student_id', 
            'email': 'student_email',
            'course': 'student_course',
            'major': 'student_major',
            'intake term': 'intake_term',
            'intake year': 'intake_year'
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
                existing_check = client.from_('students') \
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
            result = client.from_('students').insert(students_to_insert).execute()
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

# @app.post("/students/{student_id}/upload-units")
# async def upload_units(
#     student_id: int,
#     file: UploadFile = File(...),
#     overwrite: bool = Form(False),
# ):
#     try:
#         # 1. File size/type validation
#         file.file.seek(0, 2)
#         if file.file.tell() > MAX_FILE_SIZE:
#             raise HTTPException(413, "File size exceeds 10MB limit")
#         file.file.seek(0)
#         if not file.filename.lower().endswith((".xlsx", ".xls")):
#             raise HTTPException(400, "Only Excel files (.xlsx/.xls) are supported")

#         # 2. Read Excel file with better column handling
#         try:
#             df = pd.read_excel(
#                 file.file,
#                 engine="openpyxl",
#                 dtype={"Grade": str},
#             )
#         except ValueError as e:
#             raise HTTPException(400, f"Error reading Excel file: {e}")

#         # 3. Normalize column names
#         df.columns = [str(col).strip().lower() for col in df.columns]
#         print(f"DEBUG: Excel columns: {df.columns.tolist()}")

#         # 4. Map column names
#         column_mapping = {
#             'course': 'unit_code',
#             'course code': 'unit_code',
#             'unit code': 'unit_code',
#             'course title': 'unit_name', 
#             'unit name': 'unit_name',
#             'title': 'unit_name',
#             'status': 'status',
#             'grade': 'grade',
#             'term': 'term',
#             'credits': 'credits',
#             'earned': 'earned_credits'
#         }
        
#         # Rename columns
#         for old_col, new_col in column_mapping.items():
#             if old_col in df.columns:
#                 df.rename(columns={old_col: new_col}, inplace=True)

#         # 5. Validate required columns
#         required_columns = ['unit_code', 'status']
#         missing_columns = [col for col in required_columns if col not in df.columns]
        
#         if missing_columns:
#             raise HTTPException(400, f"Missing required columns: {', '.join(missing_columns)}. Available columns: {', '.join(df.columns)}")

#         # 6. Build payload with improved data processing
#         units = []
#         for idx, row in df.iterrows():
#             try:
#                 # Skip empty rows
#                 if pd.isna(row.get('unit_code')) or str(row.get('unit_code')).strip() == '':
#                     continue
                    
#                 code = str(row.get('unit_code', '')).strip()
#                 status = str(row.get('status', '')).strip().lower()
                
#                 if not code:
#                     continue
#                 if not status:
#                     continue

#                 # Handle numeric fields with NaN protection
#                 def safe_float(value, default=0.0):
#                     try:
#                         if pd.isna(value):
#                             return default
#                         return float(value)
#                     except (ValueError, TypeError):
#                         return default

#                 credits = safe_float(row.get('credits'), 12.5)
#                 earned_credits_val = row.get('earned_credits')
                
#                 # Determine completed status and earned credits
#                 completed = False
#                 grade = str(row.get('grade', '')).strip().upper()
                
#                 if status in ['complete', 'completed']:
#                     completed = True
#                     # If earned_credits is NaN but status is complete, use credits
#                     if pd.isna(earned_credits_val):
#                         earned_credits = credits
#                     else:
#                         earned_credits = safe_float(earned_credits_val, credits)
#                 elif status in ['future', 'scheduled']:
#                     completed = False
#                     earned_credits = 0.0
#                 elif grade and grade not in ['', 'N', 'F']:
#                     completed = True
#                     if pd.isna(earned_credits_val):
#                         earned_credits = credits
#                     else:
#                         earned_credits = safe_float(earned_credits_val, credits)
#                 else:
#                     completed = False
#                     earned_credits = 0.0

#                 units.append({
#                     "student_id": student_id,
#                     "unit_code": code,
#                     "unit_name": str(row.get('unit_name', '')).strip() or f"Unit {code}",
#                     "grade": grade,
#                     "completed": completed,
#                     "credits": credits,
#                     "earned_credits": earned_credits,
#                     "term": str(row.get('term', '')).strip(),
#                 })
                
#             except Exception as unit_error:
#                 print(f"DEBUG: Error processing row {idx+2}: {unit_error}")
#                 continue

#         if not units:
#             raise HTTPException(400, "No valid course records found in Excel")

#         # 7. Ensure student exists
#         resp = client.from_("students") \
#             .select("student_id") \
#             .eq("student_id", student_id) \
#             .execute()
#         if not resp.data:
#             raise HTTPException(404, "Associated student not found")

#         # 8. Optionally overwrite existing data
#         if overwrite:
#             client.from_("student_units") \
#                 .delete() \
#                 .eq("student_id", student_id) \
#                 .execute()

#         # 9. Insert new records in batches
#         batch_size = 50
#         inserted_count = 0
        
#         for i in range(0, len(units), batch_size):
#             batch = units[i:i + batch_size]
#             ins = client.from_("student_units").insert(batch).execute()
#             if ins.data:
#                 inserted_count += len(ins.data)

#         # 10. Update student credit points
#         total_credits = sum([unit.get("earned_credits", 0) for unit in units])
#         client.from_("students") \
#             .update({"credit_point": total_credits}) \
#             .eq("student_id", student_id) \
#             .execute()

#         return {"message": f"Successfully uploaded {inserted_count} course records. Total credits: {total_credits}"}

#     except HTTPException:
#         raise
#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(500, f"Internal server error: {e}")
    
@app.post("/students/bulk-upload-units")
async def bulk_upload_units(
    files: List[UploadFile] = File(...),
    overwrite: bool = Form(False),
    student_id: Optional[int] = Form(None)  # optional fallback id for all files
):
    """
    Bulk upload multiple Excel files containing unit records.
    - Each file should contain columns like: Course / Course Title / Status / Grade
      OR columns mapped to unit_code / unit_name / status / grade.
    - student_id can be taken from a 'student_id' column, extracted from filename, or
      provided globally via the `student_id` form field.
    - If overwrite=True, existing student_units for that student_id will be deleted.
    """
    try:
        print(f"DEBUG: Starting bulk upload for {len(files)} files; overwrite={overwrite}; fallback_student_id={student_id}")
        all_results = []
        total_success = 0
        total_errors = 0

        for file_index, file in enumerate(files):
            try:
                print(f"\nDEBUG: --- Processing file {file_index + 1}/{len(files)}: {file.filename}")

                # 1) basic validation: extension + file size
                if not file.filename.lower().endswith((".xlsx", ".xls")):
                    msg = "Only Excel files (.xlsx/.xls) are supported"
                    print(f"DEBUG: {file.filename} rejected: {msg}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue

                file.file.seek(0, 2)
                size = file.file.tell()
                if size > MAX_FILE_SIZE:
                    msg = "File size exceeds limit"
                    print(f"DEBUG: {file.filename} rejected: {msg} ({size} bytes)")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue
                file.file.seek(0)

                # 2) Read Excel into DataFrame (protect against NaN)
                try:
                    df = pd.read_excel(file.file, engine="openpyxl", dtype=str)  # read as strings to avoid float ids
                except Exception as e:
                    msg = f"Error reading Excel file: {str(e)}"
                    print(f"DEBUG: {msg}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue

                # quick introspection
                print(f"DEBUG: {file.filename} rows: {len(df)}")
                print(f"DEBUG: raw columns: {df.columns.tolist()}")
                if len(df) > 0:
                    print(f"DEBUG: df.head:\n{df.head(3)}")
                # normalize columns: strip/lower
                df.columns = [str(col).strip().lower() for col in df.columns]
                print(f"DEBUG: normalized columns: {df.columns.tolist()}")

                # 3) map common column names to canonical names used in logic
                column_mapping = {
                    'course': 'unit_code',
                    'course code': 'unit_code',
                    'unit code': 'unit_code',
                    'course title': 'unit_name',
                    'unit name': 'unit_name',
                    'title': 'unit_name',
                    'status': 'status',
                    'grade': 'grade',
                    'term': 'term',
                    'credits': 'credits',
                    'earned': 'earned_credits',
                    'earned_credits': 'earned_credits',
                    'student id': 'student_id',
                    'student_id': 'student_id',
                    'student': 'student_id',
                    'id': 'student_id',
                }
                for old, new in column_mapping.items():
                    if old in df.columns and new not in df.columns:
                        df.rename(columns={old: new}, inplace=True)
                print(f"DEBUG: columns after mapping: {df.columns.tolist()}")

                # 4) determine student_id for this file:
                file_student_id = None
                if 'student_id' in df.columns:
                    # pick first non-empty convertible value
                    non_null = df['student_id'].dropna().astype(str).str.strip()
                    non_null = non_null[non_null != ""]
                    if len(non_null) > 0:
                        for cand in non_null.unique():
                            try:
                                # handle values like "12345.0"
                                file_student_id = int(float(cand))
                                break
                            except Exception:
                                continue
                    print(f"DEBUG: student_id(s) found in-sheet: {non_null.unique().tolist() if 'student_id' in df.columns else []} -> chosen: {file_student_id}")

                # fallback: extract numbers from filename (pick first sensible 4-12 digit number)
                if file_student_id is None:
                    nums = re.findall(r'\d{4,12}', file.filename)
                    if nums:
                        try:
                            file_student_id = int(nums[0])
                            print(f"DEBUG: extracted student_id from filename: {file_student_id}")
                        except Exception:
                            file_student_id = None

                # final fallback: global form field student_id
                if file_student_id is None and student_id is not None:
                    file_student_id = int(student_id)
                    print(f"DEBUG: using fallback student_id from form: {file_student_id}")

                if file_student_id is None:
                    msg = "Could not determine student_id from file content, filename, or form fallback"
                    print(f"DEBUG: {msg} for {file.filename}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue

                # 5) ensure required columns exist (we require unit_code + status at minimum)
                required = ['unit_code', 'status']
                missing = [c for c in required if c not in df.columns]
                if missing:
                    msg = f"Missing required columns: {', '.join(missing)}. Available: {', '.join(df.columns)}"
                    print(f"DEBUG: {msg} for {file.filename}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue

                # 6) check student exists in DB
                student_check = client.from_("students").select("student_id, student_name").eq("student_id", file_student_id).execute()
                print(f"DEBUG: student_check response: {student_check}")
                if getattr(student_check, "error", None):
                    msg = f"DB error checking student: {student_check.error}"
                    print(f"DEBUG: {msg}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue
                if not student_check.data:
                    msg = f"Student with ID {file_student_id} not found"
                    print(f"DEBUG: {msg}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg})
                    total_errors += 1
                    continue
                print(f"DEBUG: found student: {student_check.data[0]}")

                # 7) process rows -> build units list
                units = []
                row_errors = []
                def safe_float(val, default=0.0):
                    try:
                        if val is None or (isinstance(val, float) and (math.isnan(val) or math.isinf(val))):
                            return default
                        return float(val)
                    except Exception:
                        try:
                            return float(str(val))
                        except Exception:
                            return default

                for idx, row in df.iterrows():
                    try:
                        raw_code = row.get('unit_code') or row.get('course') or ''
                        if pd.isna(raw_code) or str(raw_code).strip() == '':
                            continue
                        unit_code = str(raw_code).strip()
                        unit_name = str(row.get('unit_name', '') or row.get('course title', '') or '').strip()
                        status = str(row.get('status', '')).strip().lower()
                        grade = str(row.get('grade', '') or '').strip().upper()
                        term = str(row.get('term', '') or '').strip()

                        if not unit_code:
                            row_errors.append(f"Row {idx+2}: missing unit_code")
                            continue
                        if not status:
                            row_errors.append(f"Row {idx+2}: missing status")
                            continue

                        credits = safe_float(row.get('credits'), 12.5)
                        earned_val = row.get('earned_credits', None)

                        completed = False
                        if status in ['complete', 'completed']:
                            completed = True
                            earned_credits = credits if (earned_val is None or str(earned_val).strip() == "") else safe_float(earned_val, credits)
                        elif status in ['future', 'scheduled']:
                            completed = False
                            earned_credits = 0.0
                        elif grade and grade not in ['', 'N', 'F']:
                            completed = True
                            earned_credits = credits if (earned_val is None or str(earned_val).strip() == "") else safe_float(earned_val, credits)
                        else:
                            completed = False
                            earned_credits = 0.0

                        units.append({
                            "student_id": file_student_id,
                            "unit_code": unit_code,
                            "unit_name": unit_name if unit_name else f"Unit {unit_code}",
                            "grade": grade,
                            "completed": completed,
                            "credits": credits,
                            "earned_credits": earned_credits,
                            "term": term,
                            "status": status
                        })
                    except Exception as e:
                        row_errors.append(f"Row {idx+2}: exception processing row -> {str(e)}")
                        continue

                if not units:
                    msg = "No valid unit records found in file after processing"
                    print(f"DEBUG: {msg} for {file.filename}; row_errors: {row_errors[:5]}")
                    all_results.append({"filename": file.filename, "status": "error", "message": msg, "row_errors": row_errors})
                    total_errors += 1
                    continue

                # 8) optionally overwrite existing student_units for this student
                if overwrite:
                    try:
                        del_res = client.from_("student_units").delete().eq("student_id", file_student_id).execute()
                        print(f"DEBUG: delete_result for student {file_student_id}: {del_res}")
                        if getattr(del_res, "error", None):
                            print(f"DEBUG: delete_result error: {del_res.error}")
                    except Exception as e:
                        print(f"DEBUG: exception during delete for {file_student_id}: {e}")

                # 9) insert units in batches and capture errors
                batch_size = 50
                inserted_count = 0
                insertion_errors = []
                for i in range(0, len(units), batch_size):
                    batch = units[i:i+batch_size]
                    try:
                        res = client.from_("student_units").insert(batch).execute()
                        print(f"DEBUG: insert batch {i//batch_size + 1} result: {res}")
                        if getattr(res, "error", None):
                            insertion_errors.append(f"Batch {i//batch_size + 1} error: {res.error}")
                            print(f"DEBUG: Batch error: {res.error}")
                        elif getattr(res, "data", None):
                            inserted_count += len(res.data)
                            print(f"DEBUG: Batch {i//batch_size + 1} inserted {len(res.data)} rows")
                        else:
                            insertion_errors.append(f"Batch {i//batch_size + 1} returned no data and no explicit error")
                            print("DEBUG: batch returned no data/no error")
                    except Exception as e:
                        insertion_errors.append(f"Batch {i//batch_size + 1} exception: {str(e)}")
                        print(f"DEBUG: exception inserting batch {i//batch_size + 1}: {traceback.format_exc()}")
                        continue

                # 10) update student's credit_point (simple sum of earned_credits from this file)
                total_credits = sum([u.get("earned_credits", 0) or 0 for u in units])
                try:
                    upd = client.from_("students").update({"credit_point": total_credits}).eq("student_id", file_student_id).execute()
                    print(f"DEBUG: credit_point update result: {upd}")
                    if getattr(upd, "error", None):
                        print(f"DEBUG: credit_point update error: {upd.error}")
                except Exception as e:
                    print(f"DEBUG: exception updating credit_point: {e}")

                # 11) record file result
                status = "success" if not insertion_errors else "partial"
                file_result = {
                    "filename": file.filename,
                    "status": status,
                    "student_id": file_student_id,
                    "inserted_count": inserted_count,
                    "total_units_in_file": len(units),
                    "total_credits": total_credits,
                    "row_errors": row_errors if row_errors else None,
                    "insertion_errors": insertion_errors if insertion_errors else None
                }
                all_results.append(file_result)
                if insertion_errors:
                    total_errors += 1
                else:
                    total_success += 1

                print(f"DEBUG: finished processing {file.filename}: inserted {inserted_count}; errors: {len(insertion_errors)}")

            except Exception as file_e:
                print(f"DEBUG: Unexpected error processing {file.filename}: {str(file_e)}")
                traceback.print_exc()
                all_results.append({"filename": file.filename, "status": "error", "message": f"File processing error: {str(file_e)}"})
                total_errors += 1
                continue

        # 12) return consolidated response
        response = {
            "message": f"Bulk upload completed. {total_success} files fully processed, {total_errors} files had issues",
            "summary": {"total_files": len(files), "successful_files": total_success, "failed_files": total_errors},
            "results": all_results
        }
        return response

    except Exception as e:
        print(f"DEBUG: bulk_upload_units top-level error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(500, f"Internal server error: {str(e)}")
    
@app.post("/students/{student_id}/assign-bulk-units")
async def assign_bulk_units_to_student(
    student_id: int,
    units_data: dict
):
    try:
        print(f"DEBUG: Assigning bulk units to student {student_id}")
        print(f"DEBUG: Received units_data keys: {units_data.keys()}")
        
        # 1. Check if student exists
        student_check = client.from_("students") \
            .select("student_id, student_name") \
            .eq("student_id", student_id) \
            .execute()
            
        if not student_check.data:
            raise HTTPException(404, f"Student with ID {student_id} not found")
        
        print(f"DEBUG: Found student: {student_check.data[0]}")
        
        # 2. Process units
        units = units_data.get("units", [])
        overwrite = units_data.get("overwrite", False)
        
        print(f"DEBUG: Processing {len(units)} units, overwrite: {overwrite}")
        
        if not units:
            raise HTTPException(400, "No units provided")
        
        # 3. Optionally overwrite existing data
        if overwrite:
            print(f"DEBUG: Deleting existing units for student {student_id}")
            try:
                delete_result = client.from_("student_units") \
                    .delete() \
                    .eq("student_id", student_id) \
                    .execute()
                print(f"DEBUG: Delete result: {delete_result}")
            except Exception as delete_error:
                print(f"DEBUG: Delete error (might be no existing records): {delete_error}")
        
        # 4. Prepare units for insertion with proper validation
        student_units = []
        valid_units_count = 0
        
        for i, unit in enumerate(units):
            try:
                # 验证必需字段
                if not unit.get("unit_code"):
                    print(f"DEBUG: Skipping unit {i} - missing unit_code")
                    continue
                
                # 确保数据类型正确
                unit_code = str(unit["unit_code"]).strip()
                unit_name = str(unit.get("unit_name", "")).strip()
                if not unit_name:
                    unit_name = f"Unit {unit_code}"
                
                grade = str(unit.get("grade", "")).strip().upper()
                term = str(unit.get("term", "")).strip()
                
                # 处理布尔值
                completed = False
                status = str(unit.get("status", "")).lower()
                if status in ['complete', 'completed'] or (grade and grade not in ['', 'N', 'F']):
                    completed = True
                
                # 处理数字字段
                try:
                    credits = float(unit.get("credits", 12.5))
                except (ValueError, TypeError):
                    credits = 12.5
                
                try:
                    earned_credits = float(unit.get("earned_credits", credits if completed else 0))
                except (ValueError, TypeError):
                    earned_credits = credits if completed else 0
                
                student_unit = {
                    "student_id": student_id,
                    "unit_code": unit_code,
                    "unit_name": unit_name,
                    "grade": grade,
                    "completed": completed,
                    "credits": credits,
                    "earned_credits": earned_credits,
                    "term": term
                }
                
                student_units.append(student_unit)
                valid_units_count += 1
                
            except Exception as unit_error:
                print(f"DEBUG: Error processing unit {i}: {unit_error}")
                print(f"DEBUG: Problematic unit data: {unit}")
                continue
        
        print(f"DEBUG: Successfully prepared {valid_units_count} units for insertion")
        
        if not student_units:
            raise HTTPException(400, "No valid units to insert after processing")
        
        # 5. Insert in smaller batches
        batch_size = 20
        inserted_count = 0
        insertion_errors = []
        
        for i in range(0, len(student_units), batch_size):
            batch = student_units[i:i + batch_size]
            batch_num = i // batch_size + 1
            print(f"DEBUG: Inserting batch {batch_num} with {len(batch)} units")
            
            try:
                result = client.from_("student_units").insert(batch).execute()
                print(f"DEBUG: Batch {batch_num} insert result status: {getattr(result, 'status_code', 'N/A')}")
                
                if result.data:
                    inserted_count += len(result.data)
                    print(f"DEBUG: Batch {batch_num} inserted {len(result.data)} units")
                else:
                    error_msg = f"Batch {batch_num} failed: No data returned"
                    print(f"DEBUG: {error_msg}")
                    insertion_errors.append(error_msg)
                    
            except Exception as batch_error:
                error_msg = f"Batch {batch_num} error: {str(batch_error)}"
                print(f"DEBUG: {error_msg}")
                insertion_errors.append(error_msg)
                continue
        
        # 6. Update student credit points
        total_credits = sum([unit.get("earned_credits", 0) for unit in student_units])
        print(f"DEBUG: Updating student {student_id} credit points to {total_credits}")
        
        try:
            update_result = client.from_("students") \
                .update({"credit_point": total_credits}) \
                .eq("student_id", student_id) \
                .execute()
            print(f"DEBUG: Student update result: {update_result}")
        except Exception as update_error:
            print(f"DEBUG: Credit update failed: {update_error}")
            # 学分更新失败不影响主要操作
        
        response_data = {
            "message": f"Successfully processed {inserted_count} units for student {student_id}",
            "inserted_count": inserted_count,
            "total_credits": total_credits,
            "student_id": student_id,
            "total_units_processed": len(units),
            "valid_units_prepared": valid_units_count
        }
        
        if insertion_errors:
            response_data["insertion_errors"] = insertion_errors
            response_data["message"] += f" (with {len(insertion_errors)} batch errors)"
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error in assign_bulk_units_to_student: {str(e)}")
        print(f"DEBUG: Full traceback:")
        traceback.print_exc()
        raise HTTPException(500, f"Internal server error: {str(e)}")
    
@app.get("/debug/check-student-units-table")
async def check_student_units_table():
    """检查 student_units 表结构"""
    try:
        # 尝试获取表结构信息
        test_data = {
            "student_id": 99999,  # 测试ID
            "unit_code": "TEST001",
            "unit_name": "Test Unit",
            "grade": "P",
            "completed": True,
            "credits": 12.5,
            "earned_credits": 12.5,
            "term": "2024_TEST"
        }
        
        # 插入测试数据
        insert_result = client.from_("student_units").insert(test_data).execute()
        print(f"DEBUG: Test insert result: {insert_result}")
        
        # 立即删除测试数据
        if insert_result.data and 'id' in insert_result.data[0]:
            delete_result = client.from_("student_units").delete().eq('id', insert_result.data[0]['id']).execute()
            print(f"DEBUG: Test delete result: {delete_result}")
        
        return {
            "table_status": "accessible",
            "test_insert": "successful" if insert_result.data else "failed",
            "insert_result": str(insert_result)
        }
        
    except Exception as e:
        return {
            "table_status": "error",
            "error": str(e)
        }