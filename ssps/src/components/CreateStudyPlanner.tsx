"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Select from "react-select";
import { Plus, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Alert modal state
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

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
  const semesters = ["Feb/Mar", "Aug/Sep"];
  const studyYears = ["1", "2", "3", "4"];
  const unitTypes = ["Major", "Core", "Elective", "MPU", "WIL"];

  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-100 text-blue-800",
    Major: "bg-red-100 text-red-800",
    Elective: "bg-green-100 text-green-800",
    MPU: "bg-yellow-100 text-yellow-800",
    WIL: "bg-purple-100 text-purple-800",
  };

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
    singleValue: (base: any) => ({
      ...base,
      color: "#212121",
      fontWeight: 500,
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#757575",
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      zIndex: 9999,
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
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
      setAlertMessage(
        "Please complete all program, major, year, and semester fields before saving."
      );
      setShowAlert(true);
      return;
    }
    if (plannerRows.length === 0) {
      setAlertMessage("Please add at least one planner row before saving.");
      setShowAlert(true);
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
        setAlertMessage(`Please complete all fields in row ${i + 1}.`);
        setShowAlert(true);
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#a00000] to-[#e60028] text-white py-5 px-6 rounded-t-2xl shadow-md max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center tracking-wide">
          Create Study Planner
        </h1>
      </div>

      {/* MAIN CARD */}
      <div className="max-w-6xl mx-auto bg-white/90 backdrop-blur-sm shadow-lg rounded-b-2xl p-8 space-y-6 border border-gray-200">
        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Program */}
          <Select
            value={program ? { value: program, label: program } : null}
            onChange={(option) => {
              setProgram(option?.value || "");
              setMajor("");
            }}
            options={programs.map((p) => ({ value: p, label: p }))}
            placeholder="Select Program"
            styles={swinburneStyles}
            menuPortalTarget={document.body}
          />

          {/* Major */}
          <Select
            value={major ? { value: major, label: major } : null}
            onChange={(option) => setMajor(option?.value || "")}
            options={
              (majors[program] || []).map((m) => ({ value: m, label: m })) || []
            }
            placeholder="Select Major"
            isDisabled={!majors[program]}
            styles={swinburneStyles}
            menuPortalTarget={document.body}
          />

          {/* Year */}
          <Select
            value={intakeYear ? { value: intakeYear, label: intakeYear } : null}
            onChange={(option) => setIntakeYear(option?.value || "")}
            options={years.map((y) => ({ value: y, label: y }))}
            placeholder="Select Year"
            styles={swinburneStyles}
            menuPortalTarget={document.body}
          />

          {/* Semester */}
          <Select
            value={
              intakeSemester
                ? { value: intakeSemester, label: intakeSemester }
                : null
            }
            onChange={(option) => setIntakeSemester(option?.value || "")}
            options={semesters.map((s) => ({ value: s, label: s }))}
            placeholder="Select Semester"
            styles={swinburneStyles}
            menuPortalTarget={document.body}
          />
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10 text-gray-700">
              <tr>
                {[
                  "Year",
                  "Semester",
                  "Unit Code",
                  "Unit Name",
                  "Prerequisites",
                  "Unit Type",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="p-3 border font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plannerRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center text-gray-500 p-4 italic"
                  >
                    No rows added yet.
                  </td>
                </tr>
              ) : (
                plannerRows.map((row, i) => (
                  <tr key={i} className="even:bg-gray-50 hover:bg-gray-100">
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
                        onChange={(e) =>
                          handleChange(i, "semester", e.target.value)
                        }
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
                            ? {
                                value: row.unit_code,
                                code: row.unit_code,
                                name: row.unit_name,
                              }
                            : null
                        }
                        onChange={(selected) =>
                          handleChange(i, "unit_code", selected?.value || "")
                        }
                        menuPortalTarget={document.body}
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: "32px",
                            fontSize: "13px",
                          }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        getOptionLabel={(option) =>
                          `${option.code} - ${option.name}`
                        }
                        formatOptionLabel={(option, { context }) =>
                          context === "menu"
                            ? `${option.code} - ${option.name}`
                            : option.code
                        }
                      />
                    </td>
                    <td className="p-2 border">{row.unit_name}</td>
                    <td className="p-2 border">{row.prerequisites}</td>
                    <td className="p-2 border">
                      <select
                        value={row.unit_type}
                        onChange={(e) =>
                          handleChange(i, "unit_type", e.target.value)
                        }
                        className={`border p-1 rounded w-full text-center ${
                          unitTypeColors[row.unit_type] || ""
                        }`}
                      >
                        <option value="">Type</option>
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
                        className="text-red-600 hover:underline font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-between items-center pt-4">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            <Plus size={16} /> Add Row
          </button>
          <button
            onClick={() => handleSave()}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2 rounded-md font-semibold text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#e60028] hover:bg-[#cc0023]"
            }`}
          >
            <Save size={18} />
            {loading ? "Saving..." : "Save Planner"}
          </button>
        </div>
      </div>

      {/* Animated Alert Modal */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowAlert(false)}
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 250, damping: 20 }}
              onClick={(e) => e.stopPropagation()} // Prevent close on modal click
            >
              <div className="bg-[#e60028] text-white px-5 py-3 font-semibold text-lg text-center">
                Alert
              </div>
              <div className="p-6 text-gray-700 text-center">
                <p className="text-base font-medium">{alertMessage}</p>
              </div>
              <div className="flex justify-center border-t border-gray-200 py-4">
                <button
                  onClick={() => setShowAlert(false)}
                  className="bg-[#e60028] text-white px-6 py-2 rounded-md hover:bg-[#cc0023] transition font-semibold shadow-sm hover:shadow-md"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateStudyPlanner;
