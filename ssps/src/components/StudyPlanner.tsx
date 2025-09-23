"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";

const ViewStudyPlannerTabs = () => {
  const [tabs, setTabs] = useState<any[]>([]);
  const [filteredPlanners, setFilteredPlanners] = useState<any[]>([]);
  const [unitsMap, setUnitsMap] = useState<Record<any, any[]>>({});
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [editPlannerId, setEditPlannerId] = useState<number | null>(null);
  const [openPlanners, setOpenPlanners] = useState<Record<any, boolean>>({});

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

  const API = "https://cos40005-group17.onrender.com";

  //const API = "http://127.0.0.1:8000";

  // --- Fetch tabs and all units once on mount ---
  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await axios.get(`${API}/api/study-planner-tabs`);
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
        const res = await axios.get(`${API}/api/units`);
        setAllUnits(res.data);
      } catch (err) {
        console.error("Error fetching all units", err);
      }
    };
    fetchAllUnits();
  }, []);

  // --- Compute filteredPlanners only (no mass-fetching) ---
  useEffect(() => {
    let result = [...tabs];
    if (selectedYear) result = result.filter(t => t.intake_year === selectedYear);
    if (selectedProgram) result = result.filter(t => t.program === selectedProgram);
    if (selectedMajor) result = result.filter(t => t.major === selectedMajor);
    if (selectedSemester) result = result.filter(t => t.intake_semester === selectedSemester);

    setFilteredPlanners(result);
    // don't prefetch units here (we fetch lazily when opening an accordion)
  }, [selectedYear, selectedProgram, selectedMajor, selectedSemester, tabs]);

  // --- lazy fetch units for a single planner ---
  const fetchUnitsForPlanner = async (planner: any) => {
    try {
      const res = await axios.get(`${API}/api/view-study-planner`, {
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
  };

  // --- Toggle open state while preserving scroll and lazily fetching units when opened ---
  const handleTogglePlanner = (planner: any) => {
    // Save current scroll
    const prevScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    const wasOpen = !!openPlanners[planner.id];
    const nextOpen = !wasOpen;
    setOpenPlanners(prev => ({ ...prev, [planner.id]: nextOpen }));

    // If we are opening now, lazy fetch units (only if not already loaded)
    if (nextOpen && !unitsMap[planner.id]) {
      fetchUnitsForPlanner(planner);
    }

    // Restore scroll after DOM update to avoid jump
    // double requestAnimationFrame to run after React paint / layout
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: prevScrollY });
        });
      });
    }
  };

  const handleRemoveRow = async (plannerId: number, unitId: number) => {
    try {
      await axios.delete(`${API}/api/delete-study-planner-unit`, {
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

  // Accordion component (header is a real button with type="button")
  const PlannerAccordion = ({
    planner,
    isOpen,
    onToggle,
    children,
  }: {
    planner: any;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => {
    return (
      <div className="mb-4 border rounded">
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex justify-between items-center p-3 bg-gray-100 hover:bg-gray-200"
        >
          <span className="font-semibold">
            {planner.program} - {planner.major} ({planner.intake_semester}{" "}
            {planner.intake_year})
          </span>
          <span>{isOpen ? "▲" : "▼"}</span>
        </button>

        {/* Conditional render (keeps DOM lighter). We restore scroll after toggle. */}
        {isOpen && <div className="p-4">{children}</div>}
      </div>
    );
  };

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
          type="button"
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
          <PlannerAccordion
            key={planner.id}
            planner={planner}
            isOpen={!!openPlanners[planner.id]}
            onToggle={() => handleTogglePlanner(planner)}
          >
            <div className="flex justify-between items-center mb-2">
              <button
                type="button"
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
                  {(unitsMap[planner.id] || [])
                    .sort((a, b) => a.row_index - b.row_index)
                    .map((unit, index) => {
                      return (
                        <tr
                          key={unit.id ?? unit.tempId ?? `fallback-${index}`}
                          className={classNames(
                            "hover:bg-opacity-80",
                            unitTypeColors[unit.unit_type] || "bg-gray-100"
                          )}
                        >
                          {/* Year */}
                          <td className="border p-2">
                            {editPlannerId === planner.id ? (
                              <select
                                value={unit.year}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  const updatedUnit = { ...unit, year: newValue };
                                  const newUnits = [...(unitsMap[planner.id] || [])];
                                  newUnits[index] = updatedUnit;
                                  setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));
                                  try {
                                    await axios.put(`${API}/api/update-study-planner-unit`, {
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

                          {/* Semester */}
                          <td className="border p-2">
                            {editPlannerId === planner.id ? (
                              <select
                                value={unit.semester}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  const updatedUnit = { ...unit, semester: newValue };
                                  const newUnits = [...(unitsMap[planner.id] || [])];
                                  newUnits[index] = updatedUnit;
                                  setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));
                                  try {
                                    await axios.put(`${API}/api/update-study-planner-unit`, {
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

                          {/* Unit Code */}
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
                                  newUnits[index] = updatedUnit;
                                  setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));

                                  try {
                                    await axios.put(`${API}/api/update-study-planner-unit`, {
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

                          {/* Unit Name */}
                          <td className="border p-2">{unit.unit_name}</td>

                          {/* Prerequisites */}
                          <td className="border p-2">{displayValue(unit.prerequisites)}</td>

                          {/* Unit Type (only editable in edit mode) */}
                          {editPlannerId === planner.id && (
                            <td className="border p-2">
                              <select
                                value={unit.unit_type}
                                onChange={async (e) => {
                                  const newValue = e.target.value;
                                  const updatedUnit = { ...unit, unit_type: newValue };
                                  const newUnits = [...(unitsMap[planner.id] || [])];
                                  newUnits[index] = updatedUnit;
                                  setUnitsMap((prev) => ({ ...prev, [planner.id]: newUnits }));
                                  try {
                                    await axios.put(`${API}/api/update-study-planner-unit`, {
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
                                {["Elective", "Core", "Major", "MPU", "WIL"].map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}

                          {/* Remove Button */}
                          {editPlannerId === planner.id && (
                            <td className="border p-2">
                              <button
                                onClick={() => handleRemoveRow(planner.id, unit.id)}
                                className="text-red-600 hover:underline"
                                type="button"
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
          </PlannerAccordion>
        ))
      ) : (
        <p>No planners found for the selected filters.</p>
      )}
    </div>
  );
};

export default ViewStudyPlannerTabs;
