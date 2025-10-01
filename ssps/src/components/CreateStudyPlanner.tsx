"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Select from "react-select";

// const API = "https://cos40005-group17.onrender.com";

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
    "Bachelor of Engineering": [
      "Software",
    ],
    "Diploma of Information Technology": [
      "Cybersecurity",
      "Data Science",
    ],
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
    Core: "bg-blue-200",
    Major: "bg-orange-200",
    Elective: "bg-green-200",
    MPU: "bg-red-200",
    WIL: "bg-purple-200",
  };

  const unitOptions = units.map((u) => ({
    value: u.unit_code,
    code: u.unit_code,
    name: u.unit_name,
  }));

  interface AxiosError {
    response?: {
      status?: number;
      data?: {
        detail?: {
          existing?: boolean;
        };
      };
    };
  }

  const isAxiosError = (error: unknown): error is AxiosError => {
    return (
      typeof error === "object" &&
      error !== null &&
      "response" in error
    );
  };


  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await axios.get<Unit[]>(`${API}/api/units`);
        // sort by unit_code
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

  const handleAddRow = () => {
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
  };

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

    // Validation for each planner row:
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
    } catch (error: unknown) {
      if (
        isAxiosError(error) &&
        error.response?.status === 409 &&
        error.response.data?.detail?.existing
      ) {
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
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-white shadow-md rounded-xl">
      <h2 className="text-2xl font-bold text-center">Create Study Planner</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <select
          value={program}
          onChange={(e) => {
            setProgram(e.target.value);
            setMajor("");
          }}
          className="border p-2 rounded"
        >
          <option value="">Select Program</option>
          {programs.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          className="border p-2 rounded"
          disabled={!majors[program]}
        >
          <option value="">Select Major</option>
          {majors[program]?.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={intakeYear}
          onChange={(e) => setIntakeYear(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Intake Year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={intakeSemester}
          onChange={(e) => setIntakeSemester(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Intake Semester</option>
          {["Feb/Mar", "Aug/Sep"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-auto">
        <table className="w-full border mt-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Year</th>
              <th className="p-2 border">Semester</th>
              <th className="p-2 border">Unit Code</th>
              <th className="p-2 border">Unit Name</th>
              <th className="p-2 border">Prerequisites</th>
              <th className="p-2 border">Unit Type</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plannerRows.map((row, i) => (
              <tr
                key={i}
                className={unitTypeColors[row.unit_type] || ""}
              >
                <td className="border p-2">
                  <select
                    value={row.year}
                    onChange={(e) => handleChange(i, "year", e.target.value)}
                    className="w-full border rounded p-1"
                  >
                    <option value="">Year</option>
                    {studyYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </td>

                <td className="border p-2">
                  <select
                    value={row.semester}
                    onChange={(e) => handleChange(i, "semester", e.target.value)}
                    className="w-full border rounded p-1"
                  >
                    <option value="">Semester</option>
                    {semesters.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>

                <td className="border p-2 w-48">
                  <Select
                    options={unitOptions}
                    value={
                      row.unit_code
                        ? { value: row.unit_code, code: row.unit_code, name: row.unit_name }
                        : null
                    }
                    onChange={(selected) => {
                      handleChange(i, "unit_code", selected ? selected.value : "");
                    }}
                    isClearable={false}
                    classNamePrefix="react-select"
                    menuPortalTarget={document.body}
                    styles={{
                      container: (base) => ({
                        ...base,
                        width: "100%",
                      }),
                      control: (base) => ({
                        ...base,
                        width: "100%",
                        minHeight: "32px",
                        height: "32px",
                        fontSize: "14px",
                      }),
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                    getOptionLabel={(option) => `${option.code} - ${option.name}`} // show code+name in dropdown
                    formatOptionLabel={(option, { context }) =>
                      context === "menu" ? `${option.code} - ${option.name}` : option.code
                    } // only show code when selected
                    getOptionValue={(option) => option.value}
                    filterOption={(option, input) => {
                      if (!input) return true;
                      const search = input.toLowerCase();
                      return (
                        option.data.code.toLowerCase().includes(search) ||
                        option.data.name.toLowerCase().includes(search)
                      );
                    }}
                  />
                </td>

                <td className="border p-2">{row.unit_name}</td>
                <td className="border p-2">{row.prerequisites}</td>

                <td className="border p-2">
                  <select
                    value={row.unit_type}
                    onChange={(e) => handleChange(i, "unit_type", e.target.value)}
                    className="w-full border rounded p-1"
                  >
                    <option value="">Unit Type</option>
                    {unitTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </td>

                <td className="border p-2 text-center">
                  <button
                    onClick={() => handleRemoveRow(i)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleAddRow}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        + Add Row
      </button>

      <button
        onClick={() => handleSave()}
        className={`w-full py-2 rounded mt-4 transition ${
          loading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save Planner"}
      </button>
    </div>
  );
};

export default CreateStudyPlanner;
