"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";
import Select from "react-select";
import toast from "react-hot-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  Trash2,
  Plus,
} from "lucide-react";

// Improved, single-file, accessible and responsive Study Planner list + editor
// Tailwind-based, keeps the original functionality but with clearer layout,
// better spacing, and nicer action controls.

const ViewStudyPlannerTabs: React.FC = () => {
  const [tabs, setTabs] = useState<any[]>([]);
  const [filteredPlanners, setFilteredPlanners] = useState<any[]>([]);
  const [unitsMap, setUnitsMap] = useState<Record<any, any[]>>({});
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [editPlannerId, setEditPlannerId] = useState<number | null>(null);
  const [draftUnitsMap, setDraftUnitsMap] = useState<Record<any, any[]>>({});
  const [openPlanners, setOpenPlanners] = useState<Record<any, boolean>>({});
  const [deletedUnits, setDeletedUnits] = useState<Record<string, number[]>>({});
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPlannerId, setLoadingPlannerId] = useState<number | null>(null);
  const [savingPlannerId, setSavingPlannerId] = useState<number | null>(null);

  const unitTypeColors: Record<string, string> = {
    Core: "bg-blue-100",
    Major: "bg-orange-100",
    Elective: "bg-green-100",
    MPU: "bg-red-100",
    WIL: "bg-purple-100",
    Special: "bg-sky-50",
  };

  const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = "white" }) => (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" />
    </svg>
  );

  // const API = "http://127.0.0.1:8000";
  const API = "https://cos40005-group17.onrender.com";


  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await axios.get(`${API}/api/study-planner-tabs`);
        setTabs(res.data || []);
      } catch (err) {
        console.error("Error fetching tabs", err);
        setMessage("Could not load planner tabs.");
      }
    };

    const fetchAllUnits = async () => {
      try {
        const res = await axios.get(`${API}/api/units`);
        setAllUnits(res.data || []);
      } catch (err) {
        console.error("Error fetching all units", err);
      }
    };

    fetchTabs();
    fetchAllUnits();
  }, []);

  // Filters derived lists
  const years = Array.from(new Set(tabs.map((t) => t.intake_year))).sort((a, b) => b - a);
  const programs = Array.from(
    new Set(
      tabs
        .filter((t) => (selectedYears.length === 0 ? true : selectedYears.includes(String(t.intake_year))))
        .map((t) => t.program)
    )
  ).sort((a, b) => a.localeCompare(b));
  const majors = Array.from(new Set(tabs.filter((t) => !selectedProgram || t.program === selectedProgram).map((t) => t.major))).sort((a, b) => a.localeCompare(b));
  const semesterOrder = ["Feb/Mar", "Aug/Sep"];
  const semesters = Array.from(new Set(tabs.filter((t) => !selectedMajor || t.major === selectedMajor).map((t) => t.intake_semester))).sort((a, b) => semesterOrder.indexOf(a) - semesterOrder.indexOf(b));

  // compute filteredPlanners
  useEffect(() => {
    let result = [...tabs];
    if (selectedYears.length > 0) result = result.filter((t) => selectedYears.includes(String(t.intake_year)));
    if (selectedProgram) result = result.filter((t) => t.program === selectedProgram);
    if (selectedMajor) result = result.filter((t) => t.major === selectedMajor);
    if (selectedSemester) result = result.filter((t) => t.intake_semester === selectedSemester);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.program && t.program.toLowerCase().includes(q)) ||
          (t.program_code && t.program_code.toLowerCase().includes(q)) ||
          (t.major && t.major.toLowerCase().includes(q)) ||
          String(t.intake_year).includes(q) ||
          (t.intake_semester && t.intake_semester.toLowerCase().includes(q))
      );
    }

    setFilteredPlanners(result);
  }, [tabs, selectedYears, selectedProgram, selectedMajor, selectedSemester, searchQuery]);

  // lazy fetch units for a planner
  const fetchUnitsForPlanner = async (planner: any) => {
    if (unitsMap[planner.id]) return; // already fetched
    try {
      setLoadingPlannerId(planner.id);
      const res = await axios.get(`${API}/api/view-study-planner`, {
        params: {
          program: planner.program,
          major: planner.major,
          intake_year: planner.intake_year,
          intake_semester: planner.intake_semester,
        },
      });
      setUnitsMap((prev) => ({ ...prev, [planner.id]: res.data.units || [] }));
    } catch (err) {
      console.error(`Failed to fetch units for planner ${planner.id}`, err);
    } finally {
      setLoadingPlannerId(null);
    }
  };

  const handleTogglePlanner = (planner: any) => {
    const nextOpen = !openPlanners[planner.id];
    setOpenPlanners((prev) => ({ ...prev, [planner.id]: nextOpen }));
    if (nextOpen) fetchUnitsForPlanner(planner);
    // scroll into view for mobile
    setTimeout(() => document.getElementById(`planner-${planner.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const preserveScroll = (callback: () => void) => {
    const currentScroll = window.scrollY;
    callback();
    setTimeout(() => {
      window.scrollTo({ top: currentScroll, behavior: "instant" });
    }, 0);
  };

  const handleEditPlanner = (plannerId: number) => {
    preserveScroll(() => {
      setEditPlannerId(plannerId);
      setDraftUnitsMap((prev) => ({
        ...prev,
        [plannerId]: JSON.parse(JSON.stringify(unitsMap[plannerId] || [])),
      }));
      setDeletedUnits((prev) => ({ ...prev, [plannerId]: [] }));
    });
  };

  const handleCancelEdit = (plannerId: number) => {
    preserveScroll(() => {
      setEditPlannerId(null);
    });
  };

  const handleAddRow = (plannerId: number) => {
    setDraftUnitsMap((prev) => {
      const current = prev[plannerId] || [];
      const nextIndex = current.length > 0 ? Math.max(...current.map((u: any) => u.row_index ?? 0)) + 1 : 1;
      const newUnit = {
        tempId: crypto.randomUUID(),
        year: "1",
        semester: "1",
        unit_code: "",
        unit_name: "",
        prerequisites: "",
        unit_type: "Elective",
        row_index: nextIndex,
      };
      return { ...prev, [plannerId]: [...current, newUnit] };
    });
  };

  const handleRemoveRow = (plannerId: number, unit: any) => {
    if (!unit) return;

    // If unit has an id, show confirmation toast
    if (unit.id) {
      toast((t) => (
        <div className="text-sm">
          <p className="mb-2 font-medium">Delete this unit?</p>
          <p className="text-gray-500 mb-3">
            This will be removed when you press <strong>Save</strong>.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setDeletedUnits((prev) => ({ ...prev, [plannerId]: [...(prev[plannerId] || []), unit.id] }));
                setDraftUnitsMap((prev) => {
                  const current = prev[plannerId] || [];
                  return { ...prev, [plannerId]: current.filter((u) => u.id !== unit.id) };
                });
                toast.dismiss(t.id);
                toast.success("Unit marked for deletion");
              }}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ));
      return;
    }

    // For new units (no id), just remove immediately
    setDraftUnitsMap((prev) => {
      const current = prev[plannerId] || [];
      return {
        ...prev,
        [plannerId]: current.filter((u) => u.tempId !== unit.tempId),
      };
    });
  };

  const handleRemovePlanner = async (plannerId: number) => {
    toast((t) => (
      <div className="text-sm">
        <p className="mb-2 font-medium">Delete this study planner?</p>
        <p className="text-gray-500 mb-3">This action cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={async () => {
              try {
                await axios.delete(`${API}/api/delete-study-planner`, { params: { id: plannerId } });
                setTabs((prev) => prev.filter((p) => p.id !== plannerId));
                setFilteredPlanners((prev) => prev.filter((p) => p.id !== plannerId));
                const newUnitsMap = { ...unitsMap };
                delete newUnitsMap[plannerId];
                setUnitsMap(newUnitsMap);
                toast.success("Study planner removed successfully");
              } catch (err) {
                console.error(err);
                toast.error("Failed to remove study planner. Please try again.");
              }
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ));
  };

  const handleSavePlanner = async (plannerId: number) => {
    setSavingPlannerId(plannerId); // 🔹 start saving
    try {
      const draftUnits = draftUnitsMap[plannerId] || [];

      // Validate required units
      const missingUnits = draftUnits.filter(
        (u: any) =>
          (!u.unit_code || u.unit_code.trim() === "") &&
          u.unit_type?.toLowerCase() !== "elective"
      );
      if (missingUnits.length > 0) {
        toast.error(
          `Please select a unit for all non-elective rows. Missing in ${missingUnits.length} row(s).`
        );
        return;
      }

      // Delete pending units
      const pendingDeletes = deletedUnits[plannerId] || [];
      if (pendingDeletes.length > 0) {
        await Promise.all(
          pendingDeletes.map((id) =>
            axios.delete(`${API}/api/delete-study-planner-unit/${id}`)
          )
        );
        setDeletedUnits((prev) => ({ ...prev, [plannerId]: [] }));
      }

      // Update existing units' order
      const existingUnits = draftUnits.filter((u: any) => !!u.id);
      if (existingUnits.length > 0) {
        await axios.put(`${API}/api/update-study-planner-order`, {
          planner_id: plannerId,
          units: existingUnits.map((u: any) => ({
            id: u.id,
            row_index: u.row_index,
          })),
        });
      }

      // Add new units and update existing units
      await Promise.all(
        draftUnits.map(async (unit: any, index: number) => {
          if (!unit.id && unit.tempId) {
            const res = await axios.post(`${API}/api/add-study-planner-unit`, {
              planner_id: plannerId,
              year: String(unit.year ?? "1"),
              semester: String(unit.semester ?? "1"),
              unit_code: unit.unit_code,
              unit_type: unit.unit_type || null,
              row_index: index + 1,
            });
            const newUnit = res.data.unit;
            setDraftUnitsMap((prev) => ({
              ...prev,
              [plannerId]: prev[plannerId].map((u: any) =>
                u.tempId === unit.tempId ? { ...newUnit } : u
              ),
            }));
          } else if (unit.id) {
            await axios.put(`${API}/api/update-study-planner-unit`, {
              unit_id: unit.id,
              year: String(unit.year),
              semester: String(unit.semester),
              unit_code:
                !unit.unit_code || unit.unit_code === "nan"
                  ? null
                  : unit.unit_code,
              unit_type: unit.unit_type,
              prerequisites: unit.prerequisites,
              unit_name: unit.unit_name,
            });
          }
        })
      );

      // Update main units map and exit edit mode
      setUnitsMap((prev) => ({ ...prev, [plannerId]: draftUnitsMap[plannerId] }));
      setEditPlannerId(null);
      toast.success("Study planner saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save study planner. Please try again.");
    } finally {
      setSavingPlannerId(null); // 🔹 clear saving indicator
    }
  };

  const PlannerAccordion: React.FC<any> = ({ planner, isOpen, onToggle, children }) => (
    <div id={`planner-${planner.id}`} className="mb-4 border rounded shadow-sm overflow-hidden">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{planner.program}</span>
            <span className="text-xs text-gray-500">{planner.major}</span>
          </div>
          <div className="ml-2 text-xs text-gray-600">{planner.intake_semester} {planner.intake_year}</div>
        </div>
        <div className="flex items-center gap-2">
          {loadingPlannerId === planner.id ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : isOpen ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </div>
      </button>

      {isOpen && <div className="p-4 bg-gray-50">{children}</div>}
    </div>
  );

  const FilterRow: React.FC<any> = ({ title, options, selected, onSelect }) => (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="font-medium w-24 text-sm">{title}:</span>
      {options.map((opt: any) => {
        const isSelected = selected === opt || (Array.isArray(selected) && selected.includes(String(opt)));
        return (
          <button
            key={opt}
            onClick={() => onSelect(isSelected ? null : opt)}
            className={classNames(
              "px-3 py-1 rounded text-sm border",
              isSelected ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 hover:bg-gray-100"
            )}
            type="button"
          >
            {opt}
          </button>
        );
      })}
    </div>
  );

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
        ? "#d32f2f" // red when selected
        : state.isFocused
        ? "#ffcdd2" // light red on hover
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
      zIndex: 10,
    }),
  };

  // Add this helper somewhere at the top of your component
  const displayValue = (val: any) =>
    val === null || val === undefined || val === "nan" || val === "0" || val === 0
      ? ""
      : val;

  return (
    <div className="p-6 max-w-screen-2xl mx-30">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Study Planners</h2>
        </div>

        <div className="w-full md:w-auto flex items-center gap-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search program, major, year or semester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-3 py-2 w-full border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
      </header>

      {message && <div className="mb-4 text-red-600">{message}</div>}

      <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <div className="mb-2 text-sm font-medium">Year</div>
          <Select
            styles={swinburneStyles}
            value={
              selectedYears.length > 0
                ? { value: selectedYears[0], label: selectedYears[0] }
                : null
            }
            onChange={(option) => {
              const value = option?.value || null;
              setSelectedYears(value ? [value] : []);
            }}
            options={[
              { value: "", label: "All years" },
              ...years.map((year) => ({ value: String(year), label: String(year) })),
            ]}
            placeholder="Select a year..."
            isClearable
          />
        </div>

        <div className="col-span-1">
          <div className="mb-2 text-sm font-medium">Program</div>
          <Select
            styles={swinburneStyles}
            value={
              selectedProgram
                ? { value: selectedProgram, label: selectedProgram }
                : null
            }
            onChange={(option) => {
              const value = option?.value || null;
              setSelectedProgram(value);
              setSelectedMajor(null);
            }}
            options={[
              { value: "", label: "All programs" },
              ...programs.map((p) => ({ value: p, label: p })),
            ]}
            placeholder="Select a program..."
          />
        </div>

        <div className="col-span-1">
          <div className="mb-2 text-sm font-medium">Semester</div>
          <div className="flex gap-2">
            {semesters.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSemester((prev) => (prev === s ? null : s))}
                className={classNames(
                  "px-3 py-1 rounded text-sm border",
                  selectedSemester === s ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 hover:bg-gray-100"
                )}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --- Major Selection Row --- */}
      {selectedProgram && selectedProgram !== "All programs" && majors.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-start gap-3 border-b border-gray-200 pb-3">
          {majors.map((major) => {
            const isActive = selectedMajor === major;
            return (
              <button
                key={major}
                onClick={() => setSelectedMajor((prev) => (prev === major ? null : major))}
                className={classNames(
                  "px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm",
                  isActive
                    ? "bg-red-600 text-white ring-2 ring-red-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {major}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        {Object.entries(unitTypeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${color} border`} />
            <span className="text-sm">{type}</span>
          </div>
        ))}
      </div>

      <main>
        {filteredPlanners.length === 0 ? (
          <div className="py-10 text-center text-gray-600">No planners found for the selected filters.</div>
        ) : (
          filteredPlanners
            .sort((a, b) => {
              const yearCompare = Number(b.intake_year) - Number(a.intake_year);
              if (yearCompare !== 0) return yearCompare;
              const progCompare = a.program.localeCompare(b.program);
              if (progCompare !== 0) return progCompare;
              const majorCompare = a.major.localeCompare(b.major);
              if (majorCompare !== 0) return majorCompare;
              const indexA = semesterOrder.indexOf(a.intake_semester);
              const indexB = semesterOrder.indexOf(b.intake_semester);
              return indexA - indexB;
            })
            .map((planner) => (
              <PlannerAccordion key={planner.id} planner={planner} isOpen={!!openPlanners[planner.id]} onToggle={() => handleTogglePlanner(planner)}>
                <div className="mb-3 flex items-center gap-3">
                  {editPlannerId === planner.id ? (
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => handleSavePlanner(planner.id)}
                        disabled={savingPlannerId !== null}
                        className={classNames(
                          "flex items-center gap-2 px-3 py-1 rounded text-sm",
                          savingPlannerId === planner.id
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-green-600 text-white"
                        )}
                      >
                        {savingPlannerId === planner.id ? (
                          <>
                            <Spinner size={14} color="white" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save size={14} /> Save
                          </>
                        )}
                      </button>

                      <button onClick={() => handleCancelEdit(planner.id)} className="flex items-center gap-2 px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm">
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="ml-auto">
                      <button
                        onClick={() => handleEditPlanner(planner.id)}
                        disabled={savingPlannerId !== null}
                        className={classNames(
                          "flex items-center gap-2 px-3 py-1 rounded text-sm",
                          savingPlannerId !== null ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-blue-600 text-white"
                        )}
                      >
                        <Edit2 size={14} /> Edit Planner
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative overflow-x-auto rounded bg-white">
                  <table className="min-w-full divide-y table-auto">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm">Year</th>
                        <th className="px-3 py-2 text-left text-sm">Semester</th>
                        <th className="px-3 py-2 text-left text-sm">Unit Code</th>
                        <th className="px-3 py-2 text-left text-sm">Unit Name</th>
                        <th className="px-3 py-2 text-left text-sm">Prerequisites</th>
                        {editPlannerId === planner.id && <th className="px-3 py-2 text-left text-sm">Type</th>}
                        {editPlannerId === planner.id && <th className="px-3 py-2 text-left text-sm">Actions</th>}
                      </tr>
                    </thead>

                    <DragDropContext
                      onDragEnd={(result) => {
                        const { source, destination } = result;
                        if (!destination || destination.index === source.index) return;
                        setDraftUnitsMap((prev) => {
                          const updated = [...(prev[planner.id] || [])];
                          const [moved] = updated.splice(source.index, 1);
                          updated.splice(destination.index, 0, moved);
                          return { ...prev, [planner.id]: updated.map((u, i) => ({ ...u, row_index: i + 1 })) };
                        });
                      }}
                    >
                      <Droppable droppableId={`planner-${planner.id}`}>
                        {(provided) => (
                          <tbody ref={provided.innerRef} {...provided.droppableProps} className="bg-white">
                            {((editPlannerId === planner.id ? draftUnitsMap[planner.id] : unitsMap[planner.id]) || [])
                              .sort((a: any, b: any) => (a.row_index ?? 0) - (b.row_index ?? 0))
                              .map((unit: any, index: number) => (
                                <Draggable
                                  key={unit.id ?? unit.tempId ?? `row-${index}`}
                                  draggableId={(unit.id ?? unit.tempId ?? `row-${index}`).toString()}
                                  index={index}
                                  isDragDisabled={editPlannerId !== planner.id || savingPlannerId === planner.id} // ⬅️ added saving check
                                >
                                  {(provided, snapshot) => (
                                    <tr
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={classNames(
                                        "transition-colors",
                                        snapshot.isDragging ? "ring-2 ring-offset-2 ring-yellow-300" : "",
                                        unitTypeColors[unit.unit_type] || "bg-white"
                                      )}
                                    >
                                      <td className="px-3 py-2 text-sm align-top">
                                        {editPlannerId === planner.id ? (
                                          <select value={unit.year} disabled={savingPlannerId === planner.id} onChange={(e) => {
                                            const newValue = e.target.value;
                                            setDraftUnitsMap((prev) => {
                                              const newUnits = [...(prev[planner.id] || [])];
                                              newUnits[index] = { ...unit, year: newValue };
                                              return { ...prev, [planner.id]: newUnits };
                                            });
                                          }} className="px-2 py-1 border rounded text-sm w-20">
                                            {["1", "2", "3", "4", "5"].map((y) => <option key={y} value={y}>{y}</option>)}
                                          </select>
                                        ) : (
                                          <span className="text-sm">{unit.year}</span>
                                        )}
                                      </td>

                                      <td className="px-3 py-2 align-top text-sm">
                                        {editPlannerId === planner.id ? (
                                          <select value={unit.semester} disabled={savingPlannerId === planner.id} onChange={(e) => {
                                            const newValue = e.target.value;
                                            setDraftUnitsMap((prev) => {
                                              const newUnits = [...(prev[planner.id] || [])];
                                              newUnits[index] = { ...unit, semester: newValue };
                                              return { ...prev, [planner.id]: newUnits };
                                            });
                                          }} className="px-2 py-1 border rounded text-sm w-28">
                                            {["1", "2", "3", "4", "Summer", "Winter", "Term 1", "Term 2", "Term 3", "Term 4"].map((s) => <option key={s} value={s}>{s}</option>)}
                                          </select>
                                        ) : (
                                          <span className="text-sm">{unit.semester}</span>
                                        )}
                                      </td>

                                      <td className="px-3 py-2 align-top text-sm w-48">
                                        {editPlannerId === planner.id ? (
                                          <Select
                                          isDisabled={savingPlannerId === planner.id}
                                          menuPortalTarget={document.body} // ⬅️ makes dropdown render outside scroll container
                                          styles={{
                                            menuPortal: (base) => ({ ...base, zIndex: 9999 }), // ⬅️ ensures it's visible above everything
                                          }}
                                            value={unit.unit_code ? { value: unit.unit_code, label: `${unit.unit_code} ${unit.unit_name ? `- ${unit.unit_name}` : ""}` } : null}
                                            onChange={(selectedOption: any) => {
                                              const newCode = selectedOption?.value || "";
                                              const selectedUnit = allUnits.find((u) => u.unit_code === newCode);
                                              setDraftUnitsMap((prev) => {
                                                const newUnits = [...(prev[planner.id] || [])];
                                                newUnits[index] = {
                                                  ...unit,
                                                  unit_code: selectedUnit?.unit_code || newCode,
                                                  unit_name: selectedUnit?.unit_name || "",
                                                  prerequisites: selectedUnit?.prerequisites || "",
                                                  unit_type: selectedUnit?.unit_type || "Elective",
                                                };
                                                return { ...prev, [planner.id]: newUnits };
                                              });
                                            }}
                                            options={allUnits.sort((a, b) => a.unit_code.localeCompare(b.unit_code)).map((u) => ({ value: u.unit_code, label: `${u.unit_code} - ${u.unit_name}` }))}
                                            isSearchable
                                            className="w-full"
                                          />
                                        ) : (
                                          <span className="text-sm">{displayValue(unit.unit_code)}</span>
                                        )}
                                      </td>

                                      <td className="px-3 py-2 align-top text-sm">{unit.unit_name}</td>

                                      <td className="px-3 py-2 align-top text-sm">{displayValue(unit.prerequisites)}</td>

                                      {editPlannerId === planner.id && (
                                        <td className="px-3 py-2 align-top text-sm">
                                          <select value={unit.unit_type} onChange={(e) => {
                                            const newValue = e.target.value;
                                            setDraftUnitsMap((prev) => {
                                              const newUnits = [...(prev[planner.id] || [])];
                                              newUnits[index] = { ...unit, unit_type: newValue };
                                              return { ...prev, [planner.id]: newUnits };
                                            });
                                          }} className="px-2 py-1 border rounded text-sm w-28">
                                            {["Elective", "Core", "Major", "MPU", "WIL"].map((t) => <option key={t} value={t}>{t}</option>)}
                                          </select>
                                        </td>
                                      )}

                                      {editPlannerId === planner.id && (
                                        <td className="px-3 py-2 align-top text-sm">
                                          <div className="flex gap-2 items-center">
                                            <button onClick={() => handleRemoveRow(planner.id, unit)} disabled={savingPlannerId === planner.id} className="text-red-600 hover:underline flex items-center gap-1 text-sm">
                                              <Trash2 size={14}/> Remove
                                            </button>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </tbody>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </table>
                </div>

                <div className="mt-4 flex justify-between items-center">
                  {editPlannerId === planner.id && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAddRow(planner.id)} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm">
                        <Plus size={14}/> Add Row
                      </button>
                      <button onClick={() => handleRemovePlanner(planner.id)} className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
                        <Trash2 size={14}/> Remove Planner
                      </button>
                    </div>
                  )}

                  <div className="text-sm text-gray-500">Rows: {(editPlannerId === planner.id ? (draftUnitsMap[planner.id] || []).length : (unitsMap[planner.id] || []).length) || 0}</div>
                </div>
              </PlannerAccordion>
            ))
        )}
      </main>

      <footer className="mt-8 text-center text-xs text-gray-400">© 2025 Swinburne SSPS</footer>
    </div>
  );
};

export default ViewStudyPlannerTabs;