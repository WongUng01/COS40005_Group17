"use client";

import React, { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import { Plus, Save } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";

// const API = "http://127.0.0.1:8000";
const API = "https://cos40005-group17.onrender.com";


type Unit = {
  unit_code: string;
  unit_name: string;
  prerequisites: string | null;
};

const semesters = ["Feb/Mar", "Aug/Sep"];

const swinburneStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "#fff",
    borderColor: state.isFocused ? "#b71c1c" : "#ccc",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(183,28,28,0.2)" : "none",
    borderWidth: "1.5px",
    borderRadius: "6px",
    minHeight: "38px",
    fontSize: "14px",
    "&:hover": { borderColor: "#d32f2f" },
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#b71c1c"
      : state.isFocused
      ? "#ffcdd2"
      : "#fff",
    color: state.isSelected ? "#fff" : "#333",
    cursor: "pointer",
  }),
  singleValue: (base: any) => ({ ...base, color: "#212121", fontWeight: 500 }),
  placeholder: (base: any) => ({ ...base, color: "#757575" }),
  menu: (base: any) => ({ ...base, borderRadius: "6px", zIndex: 9999 }),
  menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

const studyYears = ["1", "2", "3", "4", "5"];
const studyPlannerSemesters = ["1", "2", "3", "4", "Summer", "Winter", "Term 1", "Term 2", "Term 3", "Term 4"];
const unitTypes = ["Major", "Core", "Elective", "MPU", "WIL", "Special"];
const unitTypeColors: Record<string, string> = {
  Core: "bg-blue-100 text-blue-800",
  Major: "bg-red-100 text-red-800",
  Elective: "bg-green-100 text-green-800",
  MPU: "bg-yellow-100 text-yellow-800",
  WIL: "bg-purple-100 text-purple-800",
  Special: "bg-sky-100 text-sky-800",
};

const generateDefaultPlannerRows = () => {
  const yearSemesterPattern = [
    { year: "1", semester: "1" }, 
    { year: "1", semester: "1" },
    { year: "1", semester: "1" },
    { year: "1", semester: "1" },
    { year: "1", semester: "1" },

    { year: "1", semester: "2" }, 
    { year: "1", semester: "2" },
    { year: "1", semester: "2" },
    { year: "1", semester: "2" },
    { year: "1", semester: "2" },
    { year: "1", semester: "2" }, 
    
    { year: "2", semester: "1" }, 
    { year: "2", semester: "1" },
    { year: "2", semester: "1" },
    { year: "2", semester: "1" },
    { year: "2", semester: "1" },
    { year: "2", semester: "1" },

    { year: "2", semester: "2" }, 
    { year: "2", semester: "2" },
    { year: "2", semester: "2" },
    { year: "2", semester: "2" },
    { year: "2", semester: "2" },
    { year: "2", semester: "2" },

    { year: "3", semester: "1" }, 
    { year: "3", semester: "1" },
    { year: "3", semester: "1" },

    { year: "3", semester: "2" }, 
    { year: "3", semester: "2" },
    { year: "3", semester: "2" },
  ];

  // Fill each row with default structure
  return yearSemesterPattern.map((ys) => ({
    year: ys.year,
    semester: ys.semester,
    unit_code: "",
    unit_name: "",
    prerequisites: "",
    unit_type: "",
  }));
};


const CreateStudyPlanner: React.FC = () => {
  const [copyProgram, setCopyProgram] = useState("");
  const [copyMajor, setCopyMajor] = useState("");
  const [copyYear, setCopyYear] = useState<number | "">("");
  const [copySemester, setCopySemester] = useState("");
  const [copyMajors, setCopyMajors] = useState<any[]>([]);

  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  type IntakeYear = { intake_year: number }; // define a proper type

  const [program, setProgram] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [programId, setProgramId] = useState("");
  const [major, setMajor] = useState("");
  const [intakeSemester, setIntakeSemester] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [addingProgram, setAddingProgram] = useState(false);
  const [addingMajor, setAddingMajor] = useState(false);
  const [addingYear, setAddingYear] = useState(false);
  const [intakeYears, setIntakeYears] = useState<number[]>([]); 
  const [newYear, setNewYear] = useState(""); 
  const [intakeYear, setIntakeYear] = useState<number | "">(""); 
  const [plannerRows, setPlannerRows] = useState<any[]>(generateDefaultPlannerRows());
  const [loading, setLoading] = useState(false);

  const studyYears = ["1", "2", "3", "4", "5"];
  const studyPlannerSemesters = [
    "1", "2", "3", "4", "Summer", "Winter", "Term 1", "Term 2", "Term 3", "Term 4",
  ];
  const unitTypes = ["Major", "Core", "Elective", "MPU", "WIL", "Special"];

  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-100 text-blue-800",
    Major: "bg-red-100 text-red-800",
    Elective: "bg-green-100 text-green-800",
    MPU: "bg-yellow-100 text-yellow-800",
    WIL: "bg-purple-100 text-purple-800",
    Special: "bg-sky-100 text-sky-800",
  };

  const unitOptions = units.map((u) => ({ value: u.unit_code, code: u.unit_code, name: u.unit_name }));

  const [existingPlanners, setExistingPlanners] = useState<any[]>([]);

  useEffect(() => {
    const fetchExistingPlanners = async () => {
      try {
        const res = await axios.get(`${API}/api/study-planners`);
        setExistingPlanners(res.data.planners || []);
      } catch (err) {
        console.error("Failed to fetch existing planners", err);
      }
    };

    fetchExistingPlanners();
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await axios.get<Unit[]>(`${API}/api/units`);
        setUnits(res.data.sort((a, b) => a.unit_code.localeCompare(b.unit_code, "en", { numeric: true })));
      } catch {
        
      }
    };
    fetchUnits();
    fetchPrograms();
    fetchIntakeYears();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await axios.get(`${API}/api/programs`);
      const sortedPrograms = (res.data || []).sort((a: any, b: any) =>
        a.program_name.localeCompare(b.program_name)
      );
      setPrograms(sortedPrograms);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMajors = async (program_id: string) => {
    try {
      const res = await axios.get(`${API}/api/majors/${program_id}`);
      setMajors(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIntakeYears = async () => {
    const res = await axios.get(`${API}/api/intake-years`);
    setIntakeYears(res.data || []);
  };

  const handleProgramSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProgram = e.target.value;
    setProgram(selectedProgram);
    const selected = programs.find((p) => p.program_name === selectedProgram);
    if (selected) {
      setProgramId(selected.id);
      setProgramCode(selected.program_code || "");
      fetchMajors(selected.id);
      fetchIntakeYears();
    }
  };

  const handleAddProgram = async () => {
    if (!program || !programCode)
      return toast.error("Please enter program name and code.");

    try {
      // Add the program
      await axios.post(`${API}/api/programs`, {
        program_name: program,
        program_code: programCode,
      });

      // Fetch updated program list
      const res = await axios.get(`${API}/api/programs`);
      setPrograms(res.data || []);

      // Automatically select the newly added program
      const newProgram = res.data.find((p: any) => p.program_name === program);
      if (newProgram) {
        setProgram(newProgram.program_name);
        setProgramId(newProgram.id);
        setProgramCode(newProgram.program_code || "");
        fetchMajors(newProgram.id);
        fetchIntakeYears();
      }

      // Hide the add program form
      setAddingProgram(false);
      toast.success("Program added!");
    } catch (err: any) {
      if (err.response?.status === 409)
        toast.error("Program already exists.");
      else toast.error("Failed to add program.");
    }
  };

  const handleAddMajor = async () => {
    if (!programId || !major)
      return toast.error("Please select a program and enter a major.");

    try {
      await axios.post(`${API}/api/majors`, {
        program_id: programId,
        major_name: major,
      });
      setAddingMajor(false);
      await fetchMajors(programId);
      toast.success("Major added!");
    } catch {
      toast.error("Failed to add major.");
    }
  };

  const handleAddRow = () => {
    const newRow = { year: "1", semester: "1", unit_code: "", unit_name: "", prerequisites: "", unit_type: "" };
    setPlannerRows((prev) => {
      const updated = [...prev, newRow];
      setTimeout(() => {
        const rowElements = document.querySelectorAll("tbody tr");
        const lastRow = rowElements[rowElements.length - 1] as HTMLElement;
        lastRow?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return updated;
    });
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...plannerRows];
    updated.splice(index, 1);
    setPlannerRows(updated);
  };

  // Returns available units for a given row index
  const getAvailableUnits = (currentIndex: number) => {
    return unitOptions.filter(u => {
      if (u.value === "") return true; 
      // Exclude units already selected in other rows
      return !plannerRows.some((r, i) => r.unit_code === u.value && i !== currentIndex);
    });
  };

  // Updated handleChange
  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...plannerRows];

    if (field === "unit_code" && value !== "") {
      const isDuplicate = updated.some((r, i) => r.unit_code === value && i !== index);
      if (isDuplicate) {
        toast.error("This unit is already selected in another row.");
        return;
      }
    }

    updated[index][field] = value;

    // Auto-fill name and prerequisites if unit_code changed
    if (field === "unit_code") {
      const unit = units.find((u) => u.unit_code === value);
      updated[index].unit_name = unit?.unit_name || "";
      updated[index].prerequisites = unit?.prerequisites || "Nil";
    }

    setPlannerRows(updated);
  };

  const handleSave = async (overwrite = false) => {
    // Basic required fields
    if (!program || !major || !intakeYear || !intakeSemester) {
      return toast.error("Please fill all required fields before saving.");
    }

    // Validate planner rows
    const invalidRow = plannerRows.find(
      (row) => !row.unit_code || !row.unit_type // require both unit_code and unit_type
    );

    if (invalidRow) {
      return toast.error("Please fill in all units and unit types in the planner table before saving.");
    }

    const payload = {
      program,
      program_code: programCode || null,
      major,
      intake_year: intakeYear,
      intake_semester: intakeSemester,
      planner: plannerRows,
      overwrite, // send overwrite flag to backend
    };

    setLoading(true);
    try {
      await axios.post(`${API}/api/create-study-planner`, payload);
      toast.success("Study planner created!");
    } catch (err: unknown) {
      const axiosError = err as AxiosError<any>;
      const data = axiosError.response?.data;

      // Planner already exists
      if (axiosError.response?.status === 409 && data?.detail?.existing) {
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <span>Planner already exists.</span>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  await handleSave(true); // overwrite
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
              >
                Overwrite
              </button>
            </div>
          ),
          { duration: 8000 }
        );
        return;
      }

      toast.error("Failed to create study planner: " + (data?.detail?.message || axiosError.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCopyMajors = async (program_id: string) => {
    try {
      const res = await axios.get(`${API}/api/majors/${program_id}`);
      setCopyMajors(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPlanner = async () => {
    if (!copyProgram || !copyMajor || !copyYear || !copySemester) {
      toast.error("Please select all fields before copying.");
      return;
    }

    try {
      const res = await axios.get(`${API}/api/view-study-planner`, {
        params: {
          program: copyProgram,
          major: copyMajor,
          intake_year: copyYear,
          intake_semester: copySemester,
        },
        validateStatus: () => true, // Prevent axios from throwing automatically
      });

      // Handle missing planner (404)
      if (res.status === 404) {
        toast((t) => (
          <div className="p-3">
            <p className="font-semibold text-red-700 mb-1">No Planner Found</p>
            <p className="text-sm text-gray-700 mb-2">
              There is no existing study planner for the selected program, major, intake year, and semester.
            </p>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              OK
            </button>
          </div>
        ), { duration: 8000 });
        return;
      }

      // Handle success
      if (res.status === 200 && res.data?.units?.length) {
        setPlannerRows(res.data.units);
        toast.success("✅ Study planner copied! You can now edit it.");
        return;
      }

      // Handle any other unexpected case
      toast.error("Unexpected response. Please check if the planner data is valid.");
    } catch (err) {
      toast.error("Failed to copy planner. Please check your connection.");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Swinburne Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#b71c1c]">Create Study Planner</h1>
        </div>
      </div>

      {/* Copy Existing Planner */}
      <div className="p-5 rounded-xl border border-red-200 bg-red-50/70 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-[#b71c1c] flex items-center gap-2">
          📋 Copy From Existing Planner
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Quickly start by copying an existing study planner’s structure.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Program */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select
              className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#b71c1c]"
              value={copyProgram}
              onChange={(e) => {
                const val = e.target.value;
                setCopyProgram(val);

                const majors = existingPlanners
                  .filter(p => p.program === val)
                  .map(p => p.major)
                  .filter((v, i, a) => a.indexOf(v) === i); // unique
                setCopyMajors(majors.map(m => ({ major_name: m })));
              }}
            >
              <option value="">Select Program</option>
              {Array.from(new Set(existingPlanners.map(p => p.program))).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Major */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
            <select
              className={`border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#b71c1c] ${
                !copyProgram ? "bg-gray-100 cursor-not-allowed" : "bg-white"
              }`}
              value={copyMajor}
              onChange={(e) => setCopyMajor(e.target.value)}
              disabled={!copyProgram}
            >
              <option value="">Select Major</option>
              {copyMajors.map((m, idx) => (
                <option key={idx} value={m.major_name}>{m.major_name}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intake Year</label>
            <select
              className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#b71c1c]"
              value={copyYear}
              onChange={(e) => setCopyYear(Number(e.target.value))}
            >
              <option value="">Select Year</option>
              {Array.from(
                new Set(existingPlanners
                  .filter(p => p.program === copyProgram && p.major === copyMajor)
                  .map(p => p.intake_year)
                )
              ).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Semester + Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intake Semester</label>
            <div className="flex gap-2">
              <select
                className="border border-gray-300 rounded-lg p-2 flex-1 focus:ring-2 focus:ring-[#b71c1c]"
                value={copySemester}
                onChange={(e) => setCopySemester(e.target.value)}
              >
                <option value="">Select Semester</option>
                {Array.from(
                  new Set(existingPlanners
                    .filter(p => p.program === copyProgram && p.major === copyMajor && p.intake_year === copyYear)
                    .map(p => p.intake_semester)
                  )
                ).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                className="bg-[#b71c1c] hover:bg-[#a00000] text-white px-4 py-2 rounded-lg shadow-sm font-medium"
                onClick={handleCopyPlanner}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Program Details Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Program Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Program Dropdown */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Program</label>
            <div className="flex gap-2">
              <select
                className="border border-gray-300 rounded-lg p-2 flex-1 focus:ring-2 focus:ring-[#b71c1c]"
                value={program}
                onChange={handleProgramSelect}
              >
                <option value="">Select Program</option>
                {programs.map((p) => <option key={p.id} value={p.program_name}>{p.program_name}</option>)}
              </select>
              <button
                className="text-[#b71c1c] hover:underline font-medium text-sm"
                onClick={() => setAddingProgram(!addingProgram)}
              >
                ➕ Add
              </button>
            </div>

            {addingProgram && (
              <div className="flex gap-2 mt-2">
                <input
                  className="border p-2 rounded flex-1"
                  placeholder="Program Name"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
                <input
                  className="border p-2 rounded flex-1"
                  placeholder="Program Code"
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value)}
                />
                <button className="bg-[#b71c1c] text-white px-3 py-1 rounded hover:bg-[#a00000]" onClick={handleAddProgram}>Add</button>
                <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => setAddingProgram(false)}>Cancel</button>
              </div>
            )}
          </div>

          {/* Major Dropdown */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Major</label>
            <div className="flex gap-2">
              <select
                className={`border border-gray-300 rounded-lg p-2 flex-1 focus:ring-2 focus:ring-[#b71c1c] ${
                  !programId ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                }`}
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                disabled={!programId}
              >
                <option value="">Select Major</option>
                {majors.map((m, idx) => (
                  <option key={idx} value={m.major_name}>{m.major_name}</option>
                ))}
              </select>
              <button
                className={`text-[#b71c1c] hover:underline font-medium text-sm ${
                  !programId ? "cursor-not-allowed opacity-50" : ""
                }`}
                onClick={() => setAddingMajor(!addingMajor)}
                disabled={!programId}
              >
                ➕ Add
              </button>
            </div>

            {addingMajor && (
              <div className="flex gap-2 mt-2">
                <input
                  className="border p-2 rounded flex-1"
                  placeholder="Major Name"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                />
                <button
                  className="bg-[#b71c1c] text-white px-3 py-1 rounded hover:bg-[#a00000]"
                  onClick={handleAddMajor}
                >
                  Add
                </button>
                <button
                  className="bg-gray-200 px-3 py-1 rounded"
                  onClick={() => setAddingMajor(false)}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Intake Details */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Intake Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Year */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Intake Year</label>
            <div className="flex gap-2 items-center">
              <select
                className="border border-gray-300 rounded-lg p-2 flex-1 focus:ring-2 focus:ring-[#b71c1c]"
                value={intakeYear}
                onChange={(e) => setIntakeYear(Number(e.target.value))}
              >
                <option value="">Select Year</option>
                {intakeYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                className="text-[#b71c1c] hover:underline font-medium text-sm"
                onClick={() => setAddingYear(!addingYear)}
              >
                ➕ Add
              </button>
            </div>
            {addingYear && (
              <div className="flex gap-2 mt-2">
                <input
                  className="border p-2 rounded flex-1"
                  placeholder="New Year"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                />
                <button
                  className="bg-[#b71c1c] text-white px-3 py-1 rounded hover:bg-[#a00000]"
                  onClick={async () => {
                    if (!newYear) return toast.error("Please enter a year.");

                    const yearNumber = Number(newYear);

                    // Validate positive integer
                    if (!Number.isInteger(yearNumber) || yearNumber <= 0) {
                      return toast.error("Please enter a valid positive year.");
                    }

                    if (intakeYears.includes(yearNumber)) {
                      return toast.error("Year already exists.");
                    }

                    try {
                      await axios.post(`${API}/api/intake-years`, { intake_year: yearNumber });
                      setIntakeYears((prev) => [...prev, yearNumber].sort((a, b) => a - b));
                      setIntakeYear(yearNumber);
                      setNewYear("");
                      setAddingYear(false);
                      toast.success("Year added!");
                    } catch {
                      toast.error("Failed to add year.");
                    }
                  }}
                >
                  Add Year
                </button>
                <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => setAddingYear(false)}>Cancel</button>
              </div>
            )}
          </div>

          {/* Semester */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">Intake Semester</label>
            <select
              className="border border-gray-300 rounded-lg p-2 w-full focus:ring-2 focus:ring-[#b71c1c]"
              value={intakeSemester}
              onChange={(e) => setIntakeSemester(e.target.value)}
            >
              <option value="">Select Semester</option>
              {semesters.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Planner Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Study Planner</h2>
          <button
            className="bg-[#b71c1c] hover:bg-[#a00000] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            onClick={handleAddRow}
          >
            <Plus size={16} /> Add Row
          </button>
        </div>

        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#fafafa] sticky top-0 text-gray-700">
              <tr>
                {["Year", "Semester", "Unit Code", "Unit Name", "Prerequisites", "Unit Type", "Actions"].map((h) => (
                  <th key={h} className="p-3 border font-semibold text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plannerRows.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-500 p-4 italic">No rows added yet.</td></tr>
              ) : (
                plannerRows.map((row, i) => (
                  <tr key={i} className="even:bg-gray-50 hover:bg-gray-100 transition">
                    <td className="p-2 border">
                      <select className="border p-1 rounded w-full" value={row.year} onChange={(e) => handleChange(i, "year", e.target.value)}>
                        <option value="">Year</option>
                        {studyYears.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </td>
                    <td className="p-2 border">
                      <select className="border p-1 rounded w-full" value={row.semester} onChange={(e) => handleChange(i, "semester", e.target.value)}>
                        <option value="">Semester</option>
                        {studyPlannerSemesters.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="p-2 border w-48">
                      <Select
                        options={getAvailableUnits(i)}
                        value={row.unit_code ? { value: row.unit_code, code: row.unit_code, name: row.unit_name } : null}
                        onChange={(selected) => handleChange(i, "unit_code", selected?.value || "")}
                        menuPortalTarget={document.body}
                        styles={swinburneStyles}
                        getOptionLabel={(option) => `${option.code} - ${option.name}`}
                        formatOptionLabel={(option, { context }) =>
                          context === "menu" ? `${option.code} - ${option.name}` : option.code
                        }
                      />
                    </td>
                    <td className="p-2 border">{row.unit_name}</td>
                    <td className="p-2 border">{row.prerequisites}</td>
                    <td className="p-2 border text-center">
                      <select
                        className={`border p-1 rounded w-full ${unitTypeColors[row.unit_type] || ""}`}
                        value={row.unit_type}
                        onChange={(e) => handleChange(i, "unit_type", e.target.value)}
                      >
                        <option value="">Type</option>
                        {unitTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </td>
                    <td className="p-2 border text-center">
                      <button onClick={() => handleRemoveRow(i)} className="text-red-600 hover:underline font-medium">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <button
          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium shadow-md ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-700 hover:bg-green-800"
          }`}
          onClick={() => handleSave()} // call handleSave normally
          disabled={loading} // disable while saving
        >
          <Save size={18} /> {loading ? "Saving..." : "Save Planner"}
        </button>
      </div>
    </div>
  );

};

export default CreateStudyPlanner;