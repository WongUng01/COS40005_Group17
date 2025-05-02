"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function UploadExcel() {
  const [selectedYear, setSelectedYear] = useState("2024");
  const [excelData, setExcelData] = useState<{ [year: string]: any[][][] }>({}); // Store data for multiple files
  const [dragActive, setDragActive] = useState(false);

  const years = ["2024", "2023", "2022", "2021"];

  useEffect(() => {
    const fetchExcelData = async () => {
      try {
        const res = await fetch(`http://localhost:8000/get_excel_data/${selectedYear}`);
        if (res.status === 404) {
          console.log(`No Excel file found for year ${selectedYear}`);
          setExcelData((prev) => ({ ...prev, [selectedYear]: [] }));
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch data");

        const parsedData: any[][][] = await res.json(); // Expecting an array of arrays (for each file)
        setExcelData((prev) => ({ ...prev, [selectedYear]: parsedData }));
      } catch (err) {
        console.error(`Failed to fetch Excel data for ${selectedYear}:`, err);
      }
    };

    if (!excelData[selectedYear]) {
      fetchExcelData();
    }
  }, [selectedYear]);

  const handleExcelUpload = async (files: FileList | null) => {
    if (!files) return;
    
    // Handle multiple file uploads
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file); // Append each file to formData
    });
    formData.append("year", selectedYear);

    try {
      const res = await fetch("http://localhost:8000/upload_excel/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const parsedData: any[][][] = await res.json(); // Backend returns table-like 2D array for each file
      setExcelData((prev) => ({ ...prev, [selectedYear]: parsedData }));
    } catch (err) {
      console.error("Excel upload failed:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleExcelUpload(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleExcelUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Upload Excel Study Planner</h2>

      {/* Year Tabs */}
      <div className="flex gap-2 mb-6">
        {years.map((year) => (
          <button
            key={year}
            className={`px-4 py-2 border-b-2 ${
              selectedYear === year
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-black"
            }`}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Upload Dropzone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-md p-8 flex flex-col items-center justify-center transition-all ${
          dragActive ? "border-green-500 bg-green-50" : "border-gray-300"
        }`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center space-y-2">
          📄
          <p className="text-gray-700 font-medium">Drag and drop your Excel files here</p>
          <p className="text-sm text-gray-500">or click to select (.xlsx)</p>
        </label>
        <input
          id="excel-upload"
          type="file"
          onChange={handleChange}
          accept=".xlsx"
          multiple
          className="hidden"
        />
      </motion.div>

      {/* Table Preview */}
      <div className="mt-8 overflow-x-auto">
        {excelData[selectedYear]?.length > 0 && (
          <div>
            {excelData[selectedYear].map((fileData, index) => {
              // Check if fileData is an array before trying to map over it
              if (Array.isArray(fileData) && Array.isArray(fileData[0])) {
                return (
                  <div key={index}>
                    <h3 className="font-semibold text-lg">File {index + 1}</h3>
                    <table className="min-w-full border rounded shadow text-sm">
                      <thead className="bg-gray-100 font-semibold">
                        <tr>
                          {fileData[0].map((cell, i) => (
                            <th key={i} className="border px-4 py-2 text-left">
                              {cell}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.slice(1).map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {row.map((cell, colIndex) => (
                              <td key={colIndex} className="border px-4 py-1">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              } else {
                return <p key={index}>Invalid data format for file {index + 1}</p>;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
