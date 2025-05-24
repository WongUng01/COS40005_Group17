"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";

const ViewStudyPlannerTabs = () => {
  const [tabs, setTabs] = useState<any[]>([]);
  const [filteredPlanners, setFilteredPlanners] = useState<any[]>([]);
  const [unitsMap, setUnitsMap] = useState<Record<number, any[]>>({});
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [editPlannerId, setEditPlannerId] = useState<number | null>(null);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);

  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-200",
    Major: "bg-orange-200",
    Elective: "bg-green-200",
    MPU: "bg-red-200",
    WIL: "bg-purple-200",
  };

  const semesterOrderMap: Record<string, number> = {
    "Feb/Mar": 1,
    "Aug/Sep": 2,
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

  // const handleAddRow = async (plannerId: number) => {
  //   try {
  //     const res = await axios.post("http://localhost:8000/api/add-study-planner-unit", {
  //       planner_id: plannerId,
  //     });

  //     const newUnit = res.data; // expect backend to return the new blank unit
  //     setUnitsMap((prev) => ({
  //       ...prev,
  //       [plannerId]: [...(prev[plannerId] || []), newUnit],
  //     }));
  //   } catch (err) {
  //     console.error("Failed to add row", err);
  //   }
  // };

const handleRemoveRow = async (plannerId: number, unitId: number) => {
  try {
    await axios.delete("http://localhost:8000/api/delete-study-planner-unit", {
      params: { id: unitId }
    });
    setUnitsMap((prev) => ({
      ...prev,
      [plannerId]: (prev[plannerId] || []).filter((unit) => unit.id !== unitId),
    }));
  } catch (err) {
    console.error("Failed to remove row", err);
  }
};

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

    const fetchAllUnits = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/units");
        setAllUnits(res.data);
      } catch (err) {
        console.error("Error fetching all units", err);
      }
    };
    fetchAllUnits();
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

              const sortedUnits = [...res.data.units].sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                const semA = semesterOrderMap[a.semester] || 99;
                const semB = semesterOrderMap[b.semester] || 99;
                if (semA !== semB) return semA - semB;
                return a.unit_code.localeCompare(b.unit_code);
              });

              setUnitsMap(prev => ({ ...prev, [planner.id]: sortedUnits }));
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
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">
                {planner.program} - {planner.major} ({planner.intake_semester} {planner.intake_year})
              </h3>
              <button
                onClick={() => setEditPlannerId(editPlannerId === planner.id ? null : planner.id)}
                className="text-sm px-3 py-1 bg-blue-500 text-white rounded"
              >
                {editPlannerId === planner.id ? "Done" : "Edit Planner"}
              </button>
            </div>

            <div className="relative pb-3">
            <table className="w-full border mt-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Year</th>
                  <th className="border p-2">Semester</th>
                  <th className="border p-2">Unit Code</th>
                  <th className="border p-2">Unit Name</th>
                  <th className="border p-2">Prerequisites</th>
                  {editPlannerId === planner.id && <th className="border p-2">Type</th>}
                </tr>
              </thead>
              <tbody>
                {[...(unitsMap[planner.id] || [])]
                  .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    const semesterOrder = ['1', '2', 'Summer', 'Winter'];
                    const semesterIndexA = semesterOrder.indexOf(a.semester);
                    const semesterIndexB = semesterOrder.indexOf(b.semester);
                    if (semesterIndexA !== semesterIndexB) return semesterIndexA - semesterIndexB;
                    const typeOrder = ['Major', 'Core', 'Elective', 'MPU', 'WIL'];
                    const typeIndexA = typeOrder.indexOf(a.unit_type);
                    const typeIndexB = typeOrder.indexOf(b.unit_type);
                    return typeIndexA - typeIndexB;
                  })
                  .map((unit, index) => {
                    const unitIndex = (unitsMap[planner.id] || []).findIndex(u => u.id === unit.id);
                    return (
                      <tr
                        key={unit.id ?? unit.tempId ?? `fallback-${index}`}
                        className={classNames("hover:bg-opacity-80", unitTypeColors[unit.unit_type] || "bg-gray-100")}
                      >
                        <td className="border p-2">
                          {editPlannerId === planner.id ? (
                            <select
                              value={unit.year}
                              onChange={async (e) => {
                                const newValue = e.target.value;
                                const updatedUnit = { ...unit, year: newValue };
                                const newUnits = [...(unitsMap[planner.id] || [])];
                                newUnits[unitIndex] = updatedUnit;
                                setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));
                                try {
                                  await axios.put("http://localhost:8000/api/update-study-planner-unit", {
                                    unit_id: unit.id,
                                    field: "year",
                                    value: newValue,
                                  });
                                } catch (err) {
                                  console.error("Failed to update year", err);
                                }
                              }}
                              className="w-full px-2 py-1 border rounded"
                            >
                              {["1", "2", "3", "4"].map((year) => (
                                <option key={year} value={year}>
                                  Year {year}
                                </option>
                              ))}
                            </select>
                          ) : (
                            unit.year
                          )}
                        </td>

                        <td className="border p-2">
                          {editPlannerId === planner.id ? (
                            <select
                              value={unit.semester}
                              onChange={async (e) => {
                                const newValue = e.target.value;
                                const updatedUnit = { ...unit, semester: newValue };
                                const newUnits = [...(unitsMap[planner.id] || [])];
                                newUnits[unitIndex] = updatedUnit;
                                setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));
                                try {
                                  await axios.put("http://localhost:8000/api/update-study-planner-unit", {
                                    unit_id: unit.id,
                                    field: "semester",
                                    value: newValue,
                                  });
                                } catch (err) {
                                  console.error("Failed to update semester", err);
                                }
                              }}
                              className="w-full px-2 py-1 border rounded"
                            >
                              {["1", "2", "Summer", "Winter"].map((sem) => (
                                <option key={sem} value={sem}>
                                  {sem}
                                </option>
                              ))}
                            </select>
                          ) : (
                            unit.semester
                          )}
                        </td>

                        <td className="border p-2">
                          {editPlannerId === planner.id ? (
                            <select
                              value={unit.unit_code}
                              onChange={async (e) => {
                                const newCode = e.target.value;
                                const selectedUnit = allUnits.find(u => u.unit_code === newCode);
                                const updatedUnit = {
                                  ...unit,
                                  unit_code: selectedUnit?.unit_code || newCode,
                                  unit_name: selectedUnit?.unit_name || "",
                                  prerequisites: selectedUnit?.prerequisites || "",
                                  unit_type: selectedUnit?.unit_type || "Elective",
                                };
                                const newUnits = [...(unitsMap[planner.id] || [])];
                                newUnits[unitIndex] = updatedUnit;
                                setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));

                                try {
                                  await axios.put("http://localhost:8000/api/update-study-planner-unit", {
                                    unit_id: unit.id,
                                    field: "unit_code",
                                    value: newCode,
                                  });
                                } catch (err) {
                                  console.error("Failed to update unit code", err);
                                }
                              }}
                              className="w-full px-2 py-1 border rounded"
                            >
                              {allUnits.map((u) => (
                                <option key={u.unit_code} value={u.unit_code}>
                                  {u.unit_code}
                                </option>
                              ))}
                            </select>
                          ) : (
                            displayValue(unit.unit_code)
                          )}
                        </td>

                        <td className="border p-2">{(unit.unit_name)}</td>
                        <td className="border p-2">{displayValue(unit.prerequisites)}</td>

                        {editPlannerId === planner.id && (
                          <td className="border p-2">
                            <select
                              value={unit.unit_type}
                              onChange={async (e) => {
                                const newValue = e.target.value;
                                const updatedUnit = { ...unit, unit_type: newValue };
                                const newUnits = [...(unitsMap[planner.id] || [])];
                                newUnits[unitIndex] = updatedUnit;
                                setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));
                                try {
                                  await axios.put("http://localhost:8000/api/update-study-planner-unit", {
                                    unit_id: unit.id,
                                    field: "unit_type",
                                    value: newValue,
                                  });
                                } catch (err) {
                                  console.error("Failed to update unit type", err);
                                }
                              }}
                              className="w-full px-2 py-1 border rounded"
                            >
                              {["Major", "Core", "Elective", "MPU", "WIL"].map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        {editPlannerId === planner.id && (
                          <td className="border p-2">
                            <button
                              onClick={() => handleRemoveRow(planner.id, unit.id)}
                              className="text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            </div>
            {/* {editPlannerId === planner.id && (
              <button
                onClick={() => handleAddRow(planner.id)}
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                Add Row
              </button>
            )} */}
          </div>
        ))
      ) : (
        <p>No planners found for the selected filters.</p>
      )}
    </div>
  );
};

export default ViewStudyPlannerTabs;