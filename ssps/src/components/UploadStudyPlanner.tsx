"use client";

import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";

const API = "https://cos40005-group17.onrender.com";

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
    "Bachelor of Information and Communication Technology",
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
  };

  const selectedMajors = majors[program as keyof typeof majors];

  const years = ["2026", "2025", "2024", "2023", "2022", "2021"];
  const semesters = ["Feb/Mar", "Aug/Sep"];

  type UploadErrorDetail = {
    existing?: boolean;
    message?: string;
  };

  type UploadErrorResponse = {
    detail?: string | UploadErrorDetail;
  };


  const handleUpload = async (overwrite = false) => {
    if (!file || !program || !major || !intakeYear || !intakeSemester) {
      toast.error("Please fill in all fields.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
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
          await handleUpload(true); // retry
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
    <div className="p-6 max-w-xl mx-auto space-y-4 bg-white shadow-md rounded-xl">
      <h2 className="text-2xl font-bold text-center mb-4">Upload Study Planner</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      <select
        value={program}
        onChange={(e) => {
          setProgram(e.target.value);
          setMajor(""); // reset major when program changes
        }}
        className="border p-2 w-full rounded"
      >
        <option value="">Select Program</option>
        {programs.map((prog) => (
          <option key={prog} value={prog}>
            {prog}
          </option>
        ))}
      </select>

      <select
        value={major}
        onChange={(e) => setMajor(e.target.value)}
        className="border p-2 w-full rounded"
        disabled={!selectedMajors || selectedMajors.length === 0}
      >
        <option value="">Select Major</option>
        {selectedMajors?.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={intakeYear}
        onChange={(e) => setIntakeYear(e.target.value)}
        className="border p-2 w-full rounded"
      >
        <option value="">Select Intake Year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select
        value={intakeSemester}
        onChange={(e) => setIntakeSemester(e.target.value)}
        className="border p-2 w-full rounded"
      >
        <option value="">Select Intake Semester</option>
        {semesters.map((sem) => (
          <option key={sem} value={sem}>
            {sem}
          </option>
        ))}
      </select>

      <button 
        onClick={() => handleUpload()}
        className={`w-full py-2 rounded flex items-center justify-center transition duration-200 ${
          loading || !isFormValid
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        disabled={loading || !isFormValid}
      >
        {loading && (
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
        )}
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default UploadStudyPlanner;
