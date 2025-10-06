"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Select from "react-select";

const API = "http://127.0.0.1:8000";

type Unit = {
  unit_code: string;
  unit_name: string;
  prerequisites: string | null;
};

type PlannerRow = {
  year: string;
  semester: string;
  unit_code: string;
  unit_name: string;
  prerequisites: string;
  unit_type: string;
};

const CreateStudyPlanner = () => {
  const [program, setProgram] = useState("");
  const [major, setMajor] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [intakeSemester, setIntakeSemester] = useState("");
  const [plannerRows, setPlannerRows] = useState<PlannerRow[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const programs = [
    "Bachelor of Computer Science",
    "Bachelor of Engineering",
    "Bachelor of Information and Communication Technology",
    "Diploma of Information Technology",
    "Master of Information Technology",
  ];

  const majors: Record<string, string[]> = {
    "Bachelor of Computer Science": [
      "Artificial Intelligence",
      "Cybersecurity",
      "Data Science",
      "Internet of Things",
      "Software Development",
    ],
    "Bachelor of Information and Communication Technology": [
      "Network Technology",
      "Software Technology",
    ],
    "Bachelor of Engineering": ["Software"],
    "Diploma of Information Technology": ["Cybersecurity", "Data Science"],
    "Master of Information Technology": [
      "Specialisation in Cybersecurity (Cognate Entry)",
      "Specialisation in Cybersecurity (Non-Cognate Entry)",
      "Specialisation in Data Science (Cognate Entry)",
      "Specialisation in Data Science (Non-Cognate Entry)",
    ],
  };

  const years = ["2026", "2025", "2024", "2023", "2022", "2021"];
  const semesters = ["1", "2", "Summer", "Winter"];
  const unitTypes = ["Major", "Core", "Elective", "MPU", "WIL"];
  const studyYears = ["1", "2", "3", "4"];

  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-100 text-blue-800",
    Major: "bg-red-100 text-red-800",
    Elective: "bg-green-100 text-green-800",
    MPU: "bg-yellow-100 text-yellow-800",
    WIL: "bg-purple-100 text-purple-800",
  };

  const unitOptions = units.map((u) => ({
    value: u.unit_code,
    code: u.unit_code,
    name: u.unit_name,
  }));

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await axios.get<Unit[]>(`${API}/api/units`);
        const sorted = res.data.sort((a, b) =>
          a.unit_code.localeCompare(b.unit_code, "en", { numeric: true })
        );
        setUnits(sorted);
      } catch {
        toast.error("Failed to fetch units.");
      }
    };
    fetchUnits();
  }, []);

  const handleAddRow = () =>
    setPlannerRows([
      ...plannerRows,
      {
        year: "",
        semester: "",
        unit_code: "",
        unit_name: "",
        prerequisites: "",
        unit_type: "",
      },
    ]);

  const handleChange = (
    index: number,
    field: keyof PlannerRow,
    value: string
  ) => {
    const updated = [...plannerRows];
    updated[index][field] = value;
    if (field === "unit_code") {
      const unit = units.find((u) => u.unit_code === value);
      updated[index].unit_name = unit?.unit_name || "";
      updated[index].prerequisites = unit?.prerequisites || "Nil";
    }
    setPlannerRows(updated);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...plannerRows];
    updated.splice(index, 1);
    setPlannerRows(updated);
  };

  const handleSave = async (overwrite = false) => {
    if (!program || !major || !intakeYear || !intakeSemester) {
      toast.error("Please complete all metadata fields.");
      return;
    }
    if (plannerRows.length === 0) {
      toast.error("Please add at least one planner row.");
      return;
    }
    for (let i = 0; i < plannerRows.length; i++) {
      const row = plannerRows[i];
      if (
        !row.year ||
        !row.semester ||
        !row.unit_code ||
        !row.unit_name ||
        !row.prerequisites ||
        !row.unit_type
      ) {
        toast.error(`Please complete all fields in row ${i + 1}.`);
        return;
      }
    }

    try {
      setLoading(true);
      await axios.post(`${API}/api/create-study-planner`, {
        program,
        major,
        intake_year: intakeYear,
        intake_semester: intakeSemester,
        overwrite,
        planner: plannerRows,
      });
      toast.success("Study planner saved.");
      setProgram("");
      setMajor("");
      setIntakeYear("");
      setIntakeSemester("");
      setPlannerRows([]);
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.detail?.existing) {
        const confirm = window.confirm("Planner already exists. Overwrite?");
        if (confirm) await handleSave(true);
        else toast("Save canceled.");
        return;
      }
      toast.error("Failed to save planner.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#a00000] to-[#cc0000] text-white py-4 px-6 rounded-t-xl shadow-md max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center">Create Study Planner</h1>
      </div>

      {/* MAIN CARD */}
      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-b-xl p-6 space-y-6">
        {/* FORM FIELDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <select
            value={program}
            onChange={(e) => {
              setProgram(e.target.value);
              setMajor("");
            }}
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select Program</option>
            {programs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-red-500"
            disabled={!majors[program]}
          >
            <option value="">Select Major</option>
            {majors[program]?.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={intakeYear}
            onChange={(e) => setIntakeYear(e.target.value)}
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-red-500"
          >
            <option value="">Intake Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={intakeSemester}
            onChange={(e) => setIntakeSemester(e.target.value)}
            className="border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-red-500"
          >
            <option value="">Intake Semester</option>
            {["Feb/Mar", "Aug/Sep"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-auto border rounded-md">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                {["Year", "Semester", "Unit Code", "Unit Name", "Prerequisites", "Unit Type", "Actions"].map(
                  (h) => (
                    <th key={h} className="p-2 border">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {plannerRows.map((row, i) => (
                <tr key={i} className="even:bg-gray-50">
                  <td className="p-2 border">
                    <select
                      value={row.year}
                      onChange={(e) => handleChange(i, "year", e.target.value)}
                      className="border p-1 rounded w-full"
                    >
                      <option value="">Year</option>
                      {studyYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border">
                    <select
                      value={row.semester}
                      onChange={(e) => handleChange(i, "semester", e.target.value)}
                      className="border p-1 rounded w-full"
                    >
                      <option value="">Semester</option>
                      {semesters.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border w-48">
                    <Select
                      options={unitOptions}
                      value={
                        row.unit_code
                          ? { value: row.unit_code, code: row.unit_code, name: row.unit_name }
                          : null
                      }
                      onChange={(selected) =>
                        handleChange(i, "unit_code", selected ? selected.value : "")
                      }
                      menuPortalTarget={document.body}
                      classNamePrefix="react-select"
                      styles={{
                        container: (base) => ({ ...base, width: "100%" }),
                        control: (base) => ({
                          ...base,
                          minHeight: "32px",
                          fontSize: "13px",
                        }),
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                      getOptionLabel={(option) => `${option.code} - ${option.name}`}
                      formatOptionLabel={(option, { context }) =>
                        context === "menu" ? `${option.code} - ${option.name}` : option.code
                      }
                    />
                  </td>
                  <td className="p-2 border">{row.unit_name}</td>
                  <td className="p-2 border">{row.prerequisites}</td>
                  <td className="p-2 border">
                    <select
                      value={row.unit_type}
                      onChange={(e) => handleChange(i, "unit_type", e.target.value)}
                      className={`border p-1 rounded w-full text-center ${
                        unitTypeColors[row.unit_type] || ""
                      }`}
                    >
                      <option value="">Unit Type</option>
                      {unitTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleRemoveRow(i)}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {plannerRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 p-4">
                    No rows added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handleAddRow}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            + Add Row
          </button>
          <button
            onClick={() => handleSave()}
            className={`px-6 py-2 rounded-md font-medium text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#cc0000] hover:bg-[#a00000]"
            }`}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Planner"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStudyPlanner;
