"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";
import Select from "react-select";

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
  const [searchQuery, setSearchQuery] = useState(""); // ✅ new search state

  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-200",
    Major: "bg-orange-200",
    Elective: "bg-green-200",
    MPU: "bg-red-200",
    WIL: "bg-purple-200",
    Special: "bg-sky-100",
  };

  const displayValue = (value: any) =>
    value && value.toString().toLowerCase() !== "nan" ? value : "";

  const years = Array.from(new Set(tabs.map((t) => t.intake_year))).sort(
    (a, b) => b - a
  );
  const programs = Array.from(
    new Set(
      tabs
        .filter((t) => !selectedYear || t.intake_year === selectedYear)
        .map((t) => t.program)
    )
  ).sort((a, b) => a.localeCompare(b));
  const majors = Array.from(
    new Set(
      tabs
        .filter((t) => !selectedProgram || t.program === selectedProgram)
        .map((t) => t.major)
    )
  ).sort((a, b) => a.localeCompare(b));
  const semesterOrder = ["Feb/Mar", "Aug/Sep"];

  const semesters = Array.from(
    new Set(
      tabs
        .filter((t) => !selectedMajor || t.major === selectedMajor)
        .map((t) => t.intake_semester)
    )
  ).sort((a, b) => {
    const indexA = semesterOrder.indexOf(a);
    const indexB = semesterOrder.indexOf(b);
    return indexA - indexB;
  });

  // const API = "https://cos40005-group17.onrender.com";

  const API = "http://127.0.0.1:8000";

  // --- Fetch tabs and all units once on mount ---
  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await axios.get(`${API}/api/study-planner-tabs`);
        setTabs(res.data);
        if (res.data.length > 0) {
          const latestYear = res.data.sort(
            (a: any, b: any) => b.intake_year - a.intake_year
          )[0].intake_year;
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
    if (selectedYear) result = result.filter((t) => t.intake_year === selectedYear);
    if (selectedProgram) result = result.filter((t) => t.program === selectedProgram);
    if (selectedMajor) result = result.filter((t) => t.major === selectedMajor);
    if (selectedSemester)
      result = result.filter((t) => t.intake_semester === selectedSemester);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.program.toLowerCase().includes(q) ||
          t.major.toLowerCase().includes(q) ||
          t.intake_year.toString().includes(q) ||
          t.intake_semester.toLowerCase().includes(q)
      );
    }

    setFilteredPlanners(result);
  }, [
    selectedYear,
    selectedProgram,
    selectedMajor,
    selectedSemester,
    searchQuery,
    tabs,
  ]);

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
      setUnitsMap((prev) => ({ ...prev, [planner.id]: res.data.units }));
    } catch (err) {
      console.error(`Failed to fetch units for planner ${planner.id}`, err);
    }
  };

  // --- Toggle open state ---
  const handleTogglePlanner = (planner: any) => {
    const prevScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    const wasOpen = !!openPlanners[planner.id];
    const nextOpen = !wasOpen;
    setOpenPlanners((prev) => ({ ...prev, [planner.id]: nextOpen }));

    if (nextOpen && !unitsMap[planner.id]) {
      fetchUnitsForPlanner(planner);
    }

    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: prevScrollY });
        });
      });
    }
  };

  const handleRemoveRow = async (plannerId: number, unitId: number) => {
    const units = unitsMap[plannerId] || [];
    const isLastUnit = units.length === 1;

    const confirmMessage = isLastUnit
      ? "⚠️ You are removing the last unit in this planner. This may delete the study planner as well. Continue?"
      : "Are you sure you want to remove this unit?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await axios.delete(`${API}/api/delete-study-planner-unit`, {
        params: { id: unitId },
      });

      if (isLastUnit) {
        // Remove planner entirely
        await handleRemovePlanner(plannerId);
      } else {
        // Just remove unit
        setUnitsMap((prev) => ({
          ...prev,
          [plannerId]: units.filter((unit) => unit.id !== unitId),
        }));
      }
    } catch (err) {
      console.error("Failed to remove row", err);
      setMessage("❌ Failed to remove unit.");
    }
  };

  const handleRemovePlanner = async (plannerId: number) => {
  if (!window.confirm("Are you sure you want to remove this study planner? This action cannot be undone.")) {
    return;
  }
  try {
    await axios.delete(`${API}/api/delete-study-planner`, {
      params: { id: plannerId },
    });
    setTabs((prev) => prev.filter((p) => p.id !== plannerId));
    setFilteredPlanners((prev) => prev.filter((p) => p.id !== plannerId));
    const newUnitsMap = { ...unitsMap };
    delete newUnitsMap[plannerId];
    setUnitsMap(newUnitsMap);
  } catch (err) {
    console.error("Failed to remove planner", err);
    setMessage("❌ Failed to remove study planner.");
  }
};

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

      {/* Filters */}
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
      <FilterRow
        title="Semester"
        options={semesters}
        selected={selectedSemester}
        onSelect={setSelectedSemester}
      />

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(unitTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-sm">{type}</span>
          </div>
        ))}
      </div>

      {/* ✅ Search Bar */}
      <div className="flex justify-end mb-6">
        <input
          type="text"
          placeholder="Search planners by program, major, year, or semester..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-110 px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Accordion List */}
      {filteredPlanners.length > 0 ? (
        filteredPlanners
          .sort((a, b) => {
            const progCompare = a.program.localeCompare(b.program);
            if (progCompare !== 0) return progCompare;
            const majorCompare = a.major.localeCompare(b.major);
            if (majorCompare !== 0) return majorCompare;
            const semesterOrder = ["Feb/Mar", "Aug/Sep"];
            const indexA = semesterOrder.indexOf(a.intake_semester);
            const indexB = semesterOrder.indexOf(b.intake_semester);
            return indexA - indexB;
          })
          .map((planner) => (
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
              {editPlannerId === planner.id && (
                <button
                  type="button"
                  onClick={() => handleRemovePlanner(planner.id)}
                  className="text-sm px-3 py-1 bg-red-500 text-white rounded"
                >
                  Remove Planner
                </button>
              )}
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
                                    {year}
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
                                {["1", "2", "Summer", "Winter", "Term 1", "Term 2", "Term 3", "Term 4"].map((sem) => (
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
                              <Select
                                value={{ value: unit.unit_code, label: `${unit.unit_code} - ${unit.unit_name}` }}
                                onChange={async (selectedOption) => {
                                  const newCode = selectedOption?.value || "";
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
                                options={allUnits
                                  .sort((a, b) => a.unit_code.localeCompare(b.unit_code))
                                  .map((u) => ({
                                    value: u.unit_code,
                                    label: `${u.unit_code} - ${u.unit_name}`,
                                  }))
                                }
                                isClearable={false}
                                isSearchable
                                components={{ ClearIndicator: undefined }} // 🚫 removes the "x"
                                className="w-64"
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    minHeight: "32px", // slimmer height
                                    height: "32px",
                                    fontSize: "0.875rem",
                                    borderRadius: "4px",
                                    borderColor: "#d1d5db", // Tailwind gray-300
                                    boxShadow: "none",
                                    "&:hover": { borderColor: "#2563eb" }, // Tailwind blue-600
                                  }),
                                  valueContainer: (base) => ({
                                    ...base,
                                    padding: "0 6px",
                                  }),
                                  input: (base) => ({
                                    ...base,
                                    margin: 0,
                                    padding: 0,
                                  }),
                                  indicatorsContainer: (base) => ({
                                    ...base,
                                    height: "32px",
                                  }),
                                  option: (base, state) => ({
                                    ...base,
                                    fontSize: "0.875rem",
                                    padding: "4px 8px",
                                    backgroundColor: state.isFocused ? "#bfdbfe" : "white", // Tailwind blue-200 hover
                                    color: "#111827", // Tailwind gray-900
                                  }),
                                  menu: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                    fontSize: "0.875rem",
                                  }),
                                }}
                              />

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
