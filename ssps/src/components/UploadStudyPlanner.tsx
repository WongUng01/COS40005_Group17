"use client";

import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="bg-[#e60028] text-white rounded-t-2xl py-4 px-6">
          <h2 className="text-2xl font-bold text-center">
            Upload Study Planner
          </h2>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">
              Upload Excel File (.xlsx)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm border border-gray-300 rounded-lg cursor-pointer bg-gray-50 p-2
                         file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
                         file:text-white file:bg-[#e60028] hover:file:bg-[#cc0023]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Program
              </label>
              <select
                value={program}
                onChange={(e) => {
                  setProgram(e.target.value);
                  setMajor("");
                }}
                className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-[#e60028] focus:outline-none"
              >
                <option value="">Select Program</option>
                {programs.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Major
              </label>
              <select
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                disabled={!selectedMajors?.length}
                className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-[#e60028] focus:outline-none disabled:bg-gray-100"
              >
                <option value="">Select Major</option>
                {selectedMajors?.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Intake Year
              </label>
              <select
                value={intakeYear}
                onChange={(e) => setIntakeYear(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-[#e60028] focus:outline-none"
              >
                <option value="">Select Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Intake Semester
              </label>
              <select
                value={intakeSemester}
                onChange={(e) => setIntakeSemester(e.target.value)}
                className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-[#e60028] focus:outline-none"
              >
                <option value="">Select Semester</option>
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => handleUpload()}
            disabled={loading || !isFormValid}
            className={`w-full py-2 mt-4 rounded-lg font-semibold transition duration-200 flex items-center justify-center
              ${
                loading || !isFormValid
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-[#e60028] hover:bg-[#cc0023] text-white shadow-md"
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
              "Upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadStudyPlanner;
