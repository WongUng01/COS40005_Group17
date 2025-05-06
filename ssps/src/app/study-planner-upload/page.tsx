"use client";

import React, { useState } from "react";
import axios from "axios";

const UploadStudyPlanner = () => {
  const [file, setFile] = useState<File | null>(null);
  const [program, setProgram] = useState("");
  const [major, setMajor] = useState("");
  const [intakeYear, setIntakeYear] = useState("");
  const [intakeSemester, setIntakeSemester] = useState("");
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("program", program);
    formData.append("major", major);
    formData.append("intake_year", intakeYear);
    formData.append("intake_semester", intakeSemester);

    try {
      const response = await axios.post("http://localhost:8000/api/upload-study-planner", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage(response.data.message);
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.message || "Unknown error";
      console.error("Console Error", err);
      setMessage(`Upload failed: ${status}: ${detail}`);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Upload Study Planner</h2>

      <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />

      <input
        type="text"
        placeholder="Program"
        value={program}
        onChange={(e) => setProgram(e.target.value)}
        className="border p-2 block w-full"
      />

      <input
        type="text"
        placeholder="Major"
        value={major}
        onChange={(e) => setMajor(e.target.value)}
        className="border p-2 block w-full"
      />

      <input
        type="number"
        placeholder="Intake Year"
        value={intakeYear}
        onChange={(e) => setIntakeYear(e.target.value)}
        className="border p-2 block w-full"
      />

      <input
        type="text"
        placeholder="Intake Semester (e.g., March)"
        value={intakeSemester}
        onChange={(e) => setIntakeSemester(e.target.value)}
        className="border p-2 block w-full"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Upload
      </button>

      {message && <p className="text-sm mt-4">{message}</p>}
    </div>
  );
};

export default UploadStudyPlanner;
