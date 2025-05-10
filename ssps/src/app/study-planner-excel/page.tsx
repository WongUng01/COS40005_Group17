"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";

const ViewStudyPlannerTabs = () => {
  const [tabs, setTabs] = useState<any[]>([]);
  const [filteredPlanners, setFilteredPlanners] = useState<any[]>([]);
  const [unitsMap, setUnitsMap] = useState<Record<number, any[]>>({});
  const [message, setMessage] = useState("");

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  

  // Color mapping based on unit type
  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-200",
    Major: "bg-orange-200",
    Elective: "bg-green-200",
    MPU: "bg-red-200",
    WIL: "bg-purple-200",
  };

  const displayValue = (value: any) =>
    value && value.toString().toLowerCase() !== "nan" ? value : "";

  const years = Array.from(new Set(tabs.map(t => t.intake_year))).sort((a, b) => b - a);
  const programs = Array.from(new Set(tabs.filter(t => (!selectedYear || t.intake_year === selectedYear)).map(t => t.program)));
  const majors = Array.from(new Set(tabs.filter(t => (!selectedProgram || t.program === selectedProgram)).map(t => t.major)));
  const semesterOrder = ["Feb/Mar", "Aug/Sep"];

  const semesters = Array.from(
    new Set(tabs.filter(t => (!selectedMajor || t.major === selectedMajor)).map(t => t.intake_semester))
  ).sort((a, b) => {
    const indexA = semesterOrder.indexOf(a);
    const indexB = semesterOrder.indexOf(b);
    return indexA - indexB;
  });

  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/study-planner-tabs");
        setTabs(res.data);
        if (res.data.length > 0) {
          const latestYear = res.data.sort((a: any, b: any) => b.intake_year - a.intake_year)[0].intake_year;
          setSelectedYear(latestYear);
        }
      } catch (err) {
        console.error("Error fetching tabs", err);
        setMessage("Could not load planner tabs.");
      }
    };
    fetchTabs();
  }, []);

  useEffect(() => {
    const fetchPlannerUnits = async () => {
      let result = [...tabs];
      if (selectedYear) result = result.filter(t => t.intake_year === selectedYear);
      if (selectedProgram) result = result.filter(t => t.program === selectedProgram);
      if (selectedMajor) result = result.filter(t => t.major === selectedMajor);
      if (selectedSemester) result = result.filter(t => t.intake_semester === selectedSemester);

      setFilteredPlanners(result);

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      const fetchInSequence = async () => {
        for (const planner of result) {
          if (!unitsMap[planner.id]) {
            try {
              const res = await axios.get("http://localhost:8000/api/view-study-planner", {
                params: {
                  program: planner.program,
                  major: planner.major,
                  intake_year: planner.intake_year,
                  intake_semester: planner.intake_semester,
                },
              });
              setUnitsMap(prev => ({ ...prev, [planner.id]: res.data.units }));
            } catch (err) {
              console.error(`Failed to fetch units for planner ${planner.id}`, err);
            }
            await delay(200);
          }
        }
      };

      fetchInSequence();
    };

    fetchPlannerUnits();
  }, [selectedYear, selectedProgram, selectedMajor, selectedSemester, tabs]);

  const FilterRow = ({ title, options, selected, onSelect }: any) => (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      <span className="font-medium w-24">{title}:</span>
      {options.map((opt: any) => (
        <button
          key={opt}
          onClick={() => onSelect(selected === opt ? null : opt)}
          className={classNames(
            "px-3 py-1 rounded border",
            selected === opt
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-gray-100 text-blue-600 hover:bg-gray-200"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Study Planners</h2>

      {message && <p className="text-red-500">{message}</p>}

      <FilterRow title="Year" options={years} selected={selectedYear} onSelect={setSelectedYear} />
      <FilterRow
        title="Program"
        options={programs}
        selected={selectedProgram}
        onSelect={(program: string | null) => {
          setSelectedProgram(program);
          setSelectedMajor(null);
        }}
      />
      {selectedProgram && (
        <FilterRow
          title="Major"
          options={majors}
          selected={selectedMajor}
          onSelect={setSelectedMajor}
        />
      )}
      <FilterRow title="Semester" options={semesters} selected={selectedSemester} onSelect={setSelectedSemester} />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(unitTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-sm">{type}</span>
          </div>
        ))}
      </div>

      {filteredPlanners.length > 0 ? (
        filteredPlanners.map(planner => (
          <div key={planner.id} className="mb-10 border rounded shadow-sm p-4">
            <h3 className="font-semibold text-lg mb-1">
              {planner.program} - {planner.major} ({planner.intake_semester} {planner.intake_year})
            </h3>

            <table className="w-full border mt-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Year</th>
                  <th className="border p-2">Semester</th>
                  <th className="border p-2">Unit Code</th>
                  <th className="border p-2">Unit Name</th>
                  <th className="border p-2">Prerequisites</th>
                </tr>
              </thead>
              <tbody>
                {(unitsMap[planner.id] || [])
                  .sort((a, b) => {
                    // Sort by year first
                    if (a.year !== b.year) return a.year - b.year;

                    // Define a custom semester order
                    const semesterOrder = ["1", "2", "Summer", "Winter"];
                    const semesterA = semesterOrder.indexOf(a.semester);
                    const semesterB = semesterOrder.indexOf(b.semester);
                    if (semesterA !== semesterB) return semesterA - semesterB;

                    // Define unit type priority
                    const typePriority: Record<string, number> = {
                      Major: 0,
                      Core: 1,
                      Elective: 2,
                      MPU: 3,
                    };

                    const priorityA = typePriority[a.unit_type as keyof typeof typePriority] ?? 99;
                    const priorityB = typePriority[b.unit_type as keyof typeof typePriority] ?? 99;

                    if (priorityA !== priorityB) return priorityA - priorityB;

                    // Optional: sort by unit code or name
                    return a.unit_code.localeCompare(b.unit_code);
                  })
                  .map((unit, i) => (
                  <tr
                    key={i}
                    className={classNames(
                      "hover:bg-opacity-80",
                      unitTypeColors[unit.unit_type] || "bg-gray-100"
                    )}
                  >
                    <td className="border p-2">{displayValue(unit.year)}</td>
                    <td className="border p-2">{displayValue(unit.semester)}</td>
                    <td className="border p-2">{displayValue(unit.unit_code)}</td>
                    <td className="border p-2">{displayValue(unit.unit_name)}</td>
                    <td className="border p-2">{displayValue(unit.prerequisites)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className="text-gray-600">No planners match the selected filters.</p>
      )}
    </div>
  );
};

export default ViewStudyPlannerTabs;
