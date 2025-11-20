"use client";

import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";
import { UploadCloud } from "lucide-react";
import Select from "react-select";

// const API = "http://127.0.0.1:8000";
const API = "https://cos40005-group17.onrender.com";


const UploadStudyPlanner = () => {
  const [file, setFile] = useState<File | null>(null);
  const [program, setProgram] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [major, setMajor] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [intakeSemester, setIntakeSemester] = useState("");
  const [loading, setLoading] = useState(false);

  const [programs, setPrograms] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [intakeYears, setIntakeYears] = useState<number[]>([]);

  const [addingProgram, setAddingProgram] = useState(false);
  const [addingMajor, setAddingMajor] = useState(false);
  const [addingYear, setAddingYear] = useState(false);

  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramCode, setNewProgramCode] = useState("");
  const [newMajor, setNewMajor] = useState("");
  const [newYear, setNewYear] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const semesters = ["Feb/Mar", "Aug/Sep"];

  const isFormValid = file && program && major && intakeYear && intakeSemester;

  const [isDragging, setIsDragging] = useState(false);

  const swinburneStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "white",
      borderColor: state.isFocused ? "#b71c1c" : "#ccc",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(183, 28, 28, 0.2)" : "none",
      borderWidth: "1.5px",
      borderRadius: "8px",
      padding: "2px",
      "&:hover": { borderColor: "#d32f2f" },
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#d32f2f"
        : state.isFocused
        ? "#ffcdd2"
        : "white",
      color: state.isSelected ? "white" : "#333",
      cursor: "pointer",
    }),
    singleValue: (base: any) => ({ ...base, color: "#212121", fontWeight: 500 }),
    placeholder: (base: any) => ({ ...base, color: "#757575" }),
    menu: (base: any) => ({ ...base, borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", zIndex: 9999 }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  // Fetch programs, majors, and intake years
  useEffect(() => {
    fetchPrograms();
    fetchIntakeYears();
  }, []);

  const fetchPrograms = async () => {
    try {
      const res = await axios.get(`${API}/api/programs`);
      setPrograms(res.data || []);
    } catch {
      toast.error("Failed to fetch programs.");
    }
  };

  const fetchMajors = async (program_id: string) => {
    try {
      const res = await axios.get(`${API}/api/majors/${program_id}`);
      setMajors(res.data || []);
    } catch {
      toast.error("Failed to fetch majors.");
    }
  };

  const fetchIntakeYears = async () => {
    try {
      const res = await axios.get(`${API}/api/intake-years`);
      setIntakeYears(res.data || []);
    } catch {
      toast.error("Failed to fetch intake years.");
    }
  };

  // Handle program selection
  const handleProgramSelect = (option: any) => {
    setProgram(option?.value || "");
    setMajor("");
    const selected = programs.find((p) => p.program_name === option?.value);
    if (selected) {
      setProgramCode(selected.program_code || "");
      fetchMajors(selected.id);
    } else {
      setProgramCode(""); 
    }
  };

  // Add new program
  const handleAddProgram = async () => {
    if (!newProgramName || !newProgramCode) return toast.error("Enter program name and code.");
    try {
      await axios.post(`${API}/api/programs`, { program_name: newProgramName, program_code: newProgramCode });
      await fetchPrograms();
      setProgram(newProgramName);
      setProgramCode(newProgramCode);
      setAddingProgram(false);
      setNewProgramName("");
      setNewProgramCode("");
      toast.success("Program added!");
    } catch {
      toast.error("Failed to add program.");
    }
  };

  // Add new major
  const handleAddMajor = async () => {
    if (!program || !newMajor) return toast.error("Select program and enter major.");
    const selectedProgram = programs.find((p) => p.program_name === program);
    if (!selectedProgram) return toast.error("Invalid program.");
    try {
      await axios.post(`${API}/api/majors`, { program_id: selectedProgram.id, major_name: newMajor });
      await fetchMajors(selectedProgram.id);
      setMajor(newMajor);
      setAddingMajor(false);
      setNewMajor("");
      toast.success("Major added!");
    } catch {
      toast.error("Failed to add major.");
    }
  };

  // Add new intake year
  const handleAddYear = async () => {
    if (!newYear) return toast.error("Enter a year.");

    const yearNumber = Number(newYear);

    // Validation: must be a positive integer
    if (!Number.isInteger(yearNumber) || yearNumber <= 0) {
      return toast.error("Enter a valid positive year.");
    }

    if (intakeYears.includes(yearNumber)) return toast.error("Year already exists.");

    try {
      await axios.post(`${API}/api/intake-years`, { intake_year: yearNumber });
      await fetchIntakeYears();
      setIntakeYear(String(yearNumber));
      setAddingYear(false);
      setNewYear("");
      toast.success("Year added!");
    } catch {
      toast.error("Failed to add year.");
    }
  };

  const handleUpload = async (overwrite = false) => {
    if (!isFormValid) return toast.error("Please fill in all fields.");

    const formData = new FormData();
    formData.append("file", file!);
    formData.append("program", program);
    formData.append("program_code", programCode);
    formData.append("major", major);
    formData.append("intake_year", intakeYear);
    formData.append("intake_semester", intakeSemester);
    formData.append("overwrite", String(overwrite));

    try {
      setLoading(true);
      await axios.post(`${API}/api/upload-study-planner`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Upload successful!");
      setFile(null);
      setProgram("");
      setProgramCode("");
      setMajor("");
      setIntakeYear("");
      setIntakeSemester("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const axiosError = err as AxiosError<any>;
      const data = axiosError.response?.data;

      if (axiosError.response?.status === 409 && data?.detail?.existing) {
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <span>Planner already exists.</span>
              <button
                onClick={async () => {
                  toast.dismiss(t.id);
                  await handleUpload(true);
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

      toast.error("Upload failed: " + (data?.detail?.message || axiosError.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition hover:shadow-2xl">
        {/* Header */}
        <div className="bg-[#e60028] text-white py-5 px-6 text-center">
          <h1 className="text-3xl font-bold tracking-wide">Upload Study Planner</h1>
          <p className="text-sm opacity-90 mt-1">Upload your Excel (.xlsx) file and planner details</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* File Upload */}
          <div
            className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg transition cursor-pointer 
              ${isDragging ? "border-[#e60028] bg-red-50" : "border-gray-300 hover:border-[#e60028] hover:bg-red-50"}
            `}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile.name.endsWith(".xlsx")) {
                  setFile(droppedFile);
                } else {
                  toast.error("Please upload an .xlsx file.");
                }
              }
            }}
          >
            <UploadCloud className="w-10 h-10 text-[#e60028] mb-2" />
            <p className="text-gray-700 text-sm">
              {file ? <span className="font-medium">{file.name}</span> : "Click or drag to upload your file"}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                if (!e.target.files || e.target.files.length === 0) return; // ← Do NOT reset file on cancel
                const f = e.target.files[0];
                setFile(f);
              }}
            />
          </div>


          {/* Dropdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Program */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Program</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={program ? { value: program, label: program } : null}
                      onChange={handleProgramSelect}
                      options={[...programs]
                        .sort((a, b) => a.program_name.localeCompare(b.program_name))
                        .map((p) => ({ value: p.program_name, label: p.program_name }))}
                      placeholder="Select Program"
                      styles={swinburneStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>
                  <button
                    className="text-[#e60028] font-medium hover:underline text-sm whitespace-nowrap"
                    onClick={() => setAddingProgram(!addingProgram)}
                  >
                    ➕ Add
                  </button>
                </div>

                {addingProgram && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <input
                      className="border p-2 rounded w-1/2 min-w-[180px] flex-1"
                      placeholder="Program Name"
                      value={newProgramName}
                      onChange={(e) => setNewProgramName(e.target.value)}
                    />
                    <input
                      className="border p-2 rounded w-1/4 min-w-[140px]"
                      placeholder="Program Code"
                      value={newProgramCode}
                      onChange={(e) => setNewProgramCode(e.target.value)}
                    />
                    <button
                      className="bg-[#e60028] text-white px-3 py-1 rounded hover:bg-[#cc0023]"
                      onClick={handleAddProgram}
                    >
                      Add
                    </button>
                    <button
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                      onClick={() => {
                        setAddingProgram(false);
                        setNewProgramName("");
                        setNewProgramCode("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Major */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Major</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={major ? { value: major, label: major } : null}
                      onChange={(option) => setMajor(option?.value || "")}
                      options={[...majors]
                        .sort((a, b) => a.major_name.localeCompare(b.major_name))
                        .map((m) => ({ value: m.major_name, label: m.major_name }))
                      }
                      placeholder="Select Major"
                      isDisabled={!majors.length}
                      styles={{
                        ...swinburneStyles,
                        control: (base, state) => ({
                          ...swinburneStyles.control(base, state),
                          ...( !majors.length && {
                            backgroundColor: "#f3f3f3",
                            cursor: "not-allowed",
                            opacity: 0.6,
                          })
                        })
                      }}
                      menuPortalTarget={document.body}
                    />

                  </div>
                  <button
                    className="text-[#e60028] font-medium hover:underline text-sm whitespace-nowrap"
                    onClick={() => setAddingMajor(!addingMajor)}
                    disabled={!program}
                  >
                    ➕ Add
                  </button>
                </div>

                {addingMajor && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <input
                      className="border p-2 rounded w-1/2 min-w-[200px]"
                      placeholder="Major Name"
                      value={newMajor}
                      onChange={(e) => setNewMajor(e.target.value)}
                    />
                    <button
                      className="bg-[#e60028] text-white px-3 py-1 rounded hover:bg-[#cc0023]"
                      onClick={handleAddMajor}
                    >
                      Add
                    </button>
                    <button
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                      onClick={() => {
                        setAddingMajor(false);
                        setNewMajor("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Intake Year */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Intake Year</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={intakeYear ? { value: intakeYear, label: intakeYear } : null}
                      onChange={(option) => setIntakeYear(option?.value || "")}
                      options={intakeYears.map((y) => ({ value: String(y), label: String(y) }))}
                      placeholder="Select Year"
                      styles={swinburneStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>
                  <button
                    className="text-[#e60028] font-medium hover:underline text-sm whitespace-nowrap"
                    onClick={() => setAddingYear(!addingYear)}
                  >
                    ➕ Add
                  </button>
                </div>

                {addingYear && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <input
                      className="border p-2 rounded w-1/3 min-w-[140px]"
                      placeholder="Year"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                    />
                    <button
                      className="bg-[#e60028] text-white px-3 py-1 rounded hover:bg-[#cc0023]"
                      onClick={handleAddYear}
                    >
                      Add
                    </button>
                    <button
                      className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                      onClick={() => {
                        setAddingYear(false);
                        setNewYear("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>


            {/* Intake Semester */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Intake Semester</label>
              <Select
                value={intakeSemester ? { value: intakeSemester, label: intakeSemester } : null}
                onChange={(option) => setIntakeSemester(option?.value || "")}
                options={semesters.map((s) => ({ value: s, label: s }))}
                placeholder="Select Semester"
                styles={swinburneStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleUpload()}
            disabled={loading || !isFormValid}
            className={`w-full py-3 rounded-lg font-semibold transition duration-200 flex items-center justify-center
              ${loading || !isFormValid
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-[#e60028] hover:bg-[#cc0023] text-white shadow-md hover:shadow-lg"
              }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Uploading...
              </>
            ) : "Upload Study Planner"}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 py-3 text-center text-sm text-gray-500 border-t">© 2025 Swinburne SSPS</div>
      </div>
    </div>
  );
};

export default UploadStudyPlanner;
