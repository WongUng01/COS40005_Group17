"use client";

import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";
import { UploadCloud } from "lucide-react";
import Select from "react-select";

const API = "http://127.0.0.1:8000";

const UploadStudyPlanner = () => {
  const [file, setFile] = useState<File | null>(null);
  const [program, setProgram] = useState("");
  const [major, setMajor] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [intakeSemester, setIntakeSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isFormValid = file && program && major && intakeYear && intakeSemester;

  const programs = [
    "Bachelor of Computer Science",
    "Bachelor of Engineering",
    "Bachelor of Information and Communication Technology",
    "Diploma of Information Technology",
    "Master of Information Technology",
  ];

  const majors = {
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

  const selectedMajors = majors[program as keyof typeof majors];
  const years = ["2026", "2025", "2024", "2023", "2022", "2021"];
  const semesters = ["Feb/Mar", "Aug/Sep"];

  type UploadErrorDetail = { existing?: boolean; message?: string };
  type UploadErrorResponse = { detail?: string | UploadErrorDetail };

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

  const handleUpload = async (overwrite = false) => {
    if (!isFormValid) {
      toast.error("Please fill in all fields.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file!);
    formData.append("program", program);
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
      setMajor("");
      setIntakeYear("");
      setIntakeSemester("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const axiosError = err as AxiosError<UploadErrorResponse>;
      const data = axiosError.response?.data;

      if (
        axiosError.response?.status === 409 &&
        typeof data?.detail === "object" &&
        (data.detail as UploadErrorDetail).existing
      ) {
        const confirm = window.confirm(
          "A planner for this intake already exists. Do you want to overwrite it?"
        );
        if (confirm) {
          await handleUpload(true);
          return;
        } else {
          toast("Upload canceled.");
          return;
        }
      }

      const detail = data?.detail;
      const errorMessage =
        typeof detail === "string"
          ? detail
          : typeof detail === "object"
          ? detail.message || JSON.stringify(detail)
          : axiosError.message;

      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition hover:shadow-2xl">
        {/* Header */}
        <div className="bg-[#e60028] text-white py-5 px-6 text-center">
          <h1 className="text-3xl font-bold tracking-wide">
            Upload Study Planner
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Upload your Excel (.xlsx) file and planner details
          </p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Excel File (.xlsx)
            </label>
            <div
              className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg
                         hover:border-[#e60028] hover:bg-red-50 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 text-[#e60028] mb-2" />
              <p className="text-gray-700 text-sm">
                {file ? (
                  <span className="font-medium">{file.name}</span>
                ) : (
                  "Click or drag to upload your file"
                )}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {/* Dropdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Program */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Program
              </label>
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
            </div>

            {/* Major */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Major
              </label>
              <Select
                value={major ? { value: major, label: major } : null}
                onChange={(option) => setMajor(option?.value || "")}
                options={
                  selectedMajors?.map((m) => ({ value: m, label: m })) || []
                }
                placeholder="Select Major"
                isDisabled={!selectedMajors?.length}
                styles={swinburneStyles}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Intake Year
              </label>
              <Select
                value={intakeYear ? { value: intakeYear, label: intakeYear } : null}
                onChange={(option) => setIntakeYear(option?.value || "")}
                options={years.map((y) => ({ value: y, label: y }))}
                placeholder="Select Year"
                styles={swinburneStyles}
                menuPortalTarget={document.body}
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Intake Semester
              </label>
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
          </div>

          {/* Submit Button */}
          <button
            onClick={() => handleUpload()}
            disabled={loading || !isFormValid}
            className={`w-full py-3 rounded-lg font-semibold transition duration-200 flex items-center justify-center
              ${
                loading || !isFormValid
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-[#e60028] hover:bg-[#cc0023] text-white shadow-md hover:shadow-lg"
              }`}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Uploading...
              </>
            ) : (
              "Upload Study Planner"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 py-3 text-center text-sm text-gray-500 border-t">
          © 2025 Swinburne SSPS
        </div>
      </div>
    </div>
  );
};

export default UploadStudyPlanner;
