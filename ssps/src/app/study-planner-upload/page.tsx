"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function UploadPlanner() {
  const years = ["2024", "2023", "2022", "2021"];
  const [selectedYear, setSelectedYear] = useState("2024");
  const [pdfsByYear, setPdfsByYear] = useState<{ [year: string]: string[] }>({});
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("uploadedPdfsByYear");
    if (stored) {
      setPdfsByYear(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("uploadedPdfsByYear", JSON.stringify(pdfsByYear));
  }, [pdfsByYear]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("year", selectedYear);  // Include the year in the form data

      try {
        const response = await fetch("http://localhost:8000/upload_planner/", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const data = await response.json();
        uploadedUrls.push(`http://localhost:8000${data.url}`);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }

    setPdfsByYear((prev) => ({
      ...prev,
      [selectedYear]: [...(prev[selectedYear] || []), ...uploadedUrls],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFileUpload(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDelete = (index: number) => {
    setPdfsByYear((prev) => {
      const updated = { ...prev };
      updated[selectedYear] = updated[selectedYear].filter((_, i) => i !== index);
      return updated;
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Upload Study Planners</h2>

      {/* Year Tabs */}
      <div className="flex gap-2 mb-6">
        {years.map((year) => (
          <button
            key={year}
            className={`px-4 py-2 border-b-2 ${
              selectedYear === year
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center transition-all ${
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
          <svg
            className="w-10 h-10 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16v-4a4 4 0 014-4h0a4 4 0 014 4v4m1 4H6a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v3h3a2 2 0 012 2v6a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-700 font-medium">Drag and drop your PDFs here</p>
          <p className="text-sm text-gray-500">or click to select files</p>
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleChange}
          accept="application/pdf"
          multiple
          className="hidden"
        />
      </motion.div>

      {/* Previews */}
      <div className="mt-8 space-y-8">
        <AnimatePresence>
          {pdfsByYear[selectedYear]?.length > 0 && (
            <>
              <motion.h3
                className="text-xl font-semibold mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                Study Planner {selectedYear}
              </motion.h3>
              {pdfsByYear[selectedYear].map((url, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.6 }}
                  className="relative"
                >
                  <button
                    onClick={() => handleDelete(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    title="Delete this file"
                  >
                    ✕
                  </button>
                  <iframe
                    src={url}
                    width="100%"
                    height="600px"
                    title={`Study Planner ${index + 1}`}
                    className="border rounded shadow"
                  />
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
