from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabaseClient import get_supabase_client
from typing      import List, Dict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import pandas as pd
from fastapi import HTTPException
from io import BytesIO
import traceback
from typing import Optional
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from fastapi import APIRouter

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

client = get_supabase_client()

# ========== Common Models ==========
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

        # 2. Read Excel
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
            .single() \
            .execute()
        if resp.data is None:
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
                        .single() \
                        .execute()
        return response.data
    except Exception as e:
        if 'No rows found' in str(e):
            raise HTTPException(status_code=404, detail="Student not found")
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

@app.delete("/units/{unit_id}")
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
    
    
# Add after existing endpoints
@app.put("/students/{student_id}/graduate", response_model=GraduationStatus)
async def process_graduation(student_id: int):
    try:
        # 1. Get student information
        student = client.from_('students') \
            .select('student_major, intake_year, intake_term') \
            .eq('student_id', student_id) \
            .single().execute().data
        
        if not student:
            raise HTTPException(404, "Student not found")

        # 2. Get student's completed units (passed with grade != 'F')
        completed_units = client.from_('student_units') \
            .select('unit_code') \
            .eq('student_id', student_id) \
            .eq('completed', True) \
            .neq('grade', 'F') \
            .execute().data
        
        passed_codes = [u['unit_code'] for u in completed_units]

        # 3. Get study planner for the student
        planner = client.from_('study_planners') \
            .select('id') \
            .eq('major', student['student_major']) \
            .eq('intake_year', student['intake_year']) \
            .eq('intake_semester', student['intake_term']) \
            .single().execute().data
        
        if not planner:
            raise HTTPException(400, "No study plan found for this student")

        # 4. Get required core and major units from planner
        required_units = client.from_('study_planner_units') \
            .select('unit_code, unit_type') \
            .eq('planner_id', planner['id']) \
            .execute().data
        
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