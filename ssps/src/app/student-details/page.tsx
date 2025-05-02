"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const plannerStructure = [
  { id: "year1sem1", label: "Year 1 - Sem 1", slots: 5 },
  { id: "year1sem2", label: "Year 1 - Sem 2", slots: 5 },
  { id: "year2sem1", label: "Year 2 - Sem 1", slots: 5 },
  { id: "year2sem2", label: "Year 2 - Sem 2", slots: 5 },
  { id: "year3sem1", label: "Year 3 - Sem 1", slots: 5 },
  { id: "year3sem2", label: "Year 3 - Sem 2", slots: 5 },
];

export default function StudyPlannerPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [savedPlanners, setSavedPlanners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "view">("create");

  useEffect(() => {
    async function fetchUnits() {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_code, unit_name, prerequisites");

      if (error) {
        console.error("Error fetching units:", error.message);
        toast.error("Failed to load units");
        return;
      }
      setUnits(data || []);
    }

    async function fetchSavedPlanners() {
      const { data, error } = await supabase
        .from("hod_study_planner")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching saved planners:", error.message);
      } else {
        setSavedPlanners(data || []);
      }
    }

    // Load from cache
    const cachedTemplates = localStorage.getItem("studyPlannerTemplates");
    if (cachedTemplates) {
      setTemplates(JSON.parse(cachedTemplates));
    }

    fetchUnits();
    fetchSavedPlanners();
  }, []);

  // Sync cache on template change
  useEffect(() => {
    localStorage.setItem("studyPlannerTemplates", JSON.stringify(templates));
  }, [templates]);

  function createEmptyPlanner() {
    const planner: Record<string, any> = {};
    plannerStructure.forEach((semester) => {
      planner[semester.id] = Array(semester.slots).fill({
        unitId: "",
        prerequisite: "",
      });
    });
    return planner;
  }

  function handleCreateTemplate() {
    const name = prompt("Enter a name for your new template:");
    if (!name) return;

    const newTemplateId = `template_${Date.now()}`;
    setTemplates((prev) => [
      ...prev,
      {
        id: newTemplateId,
        name,
        planner: createEmptyPlanner(),
        selectedUnits: [],
      },
    ]);
  }

  function handleRemoveTemplate(id: string) {
    if (confirm("Are you sure you want to remove this template?")) {
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
    }
  }

  async function handleRemoveSavedPlanner(id: string) {
    const { error } = await supabase
      .from("hod_study_planner")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error removing saved planner:", error.message);
      toast.error("❌ Failed to remove saved planner");
    } else {
      setSavedPlanners((prev) => prev.filter((planner) => planner.id !== id));
      toast.success("✅ Saved planner removed!");
    }
  }

  function handleUnitChange(templateIndex: number, semesterId: string, slotIndex: number, field: string, value: string) {
    setTemplates((prev) => {
      const updatedTemplates = [...prev];
      const currentTemplate = { ...updatedTemplates[templateIndex] };
      const updatedSemester = [...currentTemplate.planner[semesterId]];
      const previousUnitId = updatedSemester[slotIndex]?.unitId;

      const updatedSlot = {
        ...updatedSemester[slotIndex],
        [field]: value,
      };

      if (field === "unitId") {
        const selectedUnit = units.find((u) => u.id === value);
        updatedSlot.prerequisite = selectedUnit?.prerequisites || "";
      }

      updatedSemester[slotIndex] = updatedSlot;
      currentTemplate.planner[semesterId] = updatedSemester;

      let selectedUnits = [...currentTemplate.selectedUnits];
      if (previousUnitId && previousUnitId !== value) {
        selectedUnits = selectedUnits.filter((id) => id !== previousUnitId);
      }
      if (value && !selectedUnits.includes(value)) {
        selectedUnits.push(value);
      }

      currentTemplate.selectedUnits = selectedUnits;
      updatedTemplates[templateIndex] = currentTemplate;
      return updatedTemplates;
    });
  }

  async function handleSavePlanner(template: any) {
    const payload = plannerStructure.map((semester) => ({
      semester_id: semester.id,
      label: semester.label,
      units: template.planner[semester.id],
    }));

    const { error } = await supabase.from("hod_study_planner").insert([
      { planner_data: payload, template_name: template.name, created_at: new Date() },
    ]);

    if (error) {
      console.error("Error saving planner:", error.message);
      toast.error("❌ Failed to save planner");
    } else {
      toast.success(`✅ ${template.name} saved successfully!`);
    }
  }

  function handleResumeSavedPlanner(plannerId: string) {
    const plannerToResume = savedPlanners.find((p) => p.id === plannerId);
    if (plannerToResume) {
      setTemplates((prev) => [
        {
          id: `template_${Date.now()}`,
          name: plannerToResume.template_name || "Resumed Planner",
          planner: plannerToResume.planner_data,
          selectedUnits: [],
        },
        ...prev,
      ]);
      setActiveTab("create");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-blue-700">📚 Study Planner</h1>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-6 space-x-4">
        <button
          onClick={() => setActiveTab("create")}
          className={`px-6 py-2 rounded ${activeTab === "create" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        >
          Create Planner
        </button>
        <button
          onClick={() => setActiveTab("view")}
          className={`px-6 py-2 rounded ${activeTab === "view" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        >
          View Saved Planners
        </button>
      </div>

      {activeTab === "create" && (
        <div>
          <button
            onClick={handleCreateTemplate}
            className="mb-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded"
          >
            + Create New Template
          </button>

          {templates.map((template, templateIndex) => (
            <div key={template.id} className="mb-12 border p-4 rounded shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-blue-700">{template.name}</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRemoveTemplate(template.id)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    ❌ Remove
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-auto border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-200 text-lg">
                      <th className="border border-gray-400 px-4 py-2">#</th>
                      <th className="border border-gray-400 px-4 py-2">Unit (Code + Name)</th>
                      <th className="border border-gray-400 px-4 py-2">Pre-requisite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plannerStructure.map((semester) => (
                      <React.Fragment key={semester.id}>
                        <tr>
                          <td
                            colSpan={3}
                            className="bg-blue-100 text-blue-800 font-semibold text-center py-2 text-lg border border-gray-400"
                          >
                            {semester.label}
                          </td>
                        </tr>

                        {template.planner[semester.id]?.map((slot: any, index: number) => (
                          <tr key={`${semester.id}-${index}`}>
                            <td className="border border-gray-400 px-4 py-2 text-center">{index + 1}</td>

                            <td className="border border-gray-400 px-4 py-2">
                              <select
                                value={slot.unitId}
                                onChange={(e) =>
                                  handleUnitChange(templateIndex, semester.id, index, "unitId", e.target.value)
                                }
                                className="w-full p-1 border rounded"
                              >
                                <option value="">-- Select Unit --</option>
                                {units
                                  .filter(
                                    (unit) =>
                                      !template.selectedUnits.includes(unit.id) ||
                                      unit.id === slot.unitId
                                  )
                                  .map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                      {unit.unit_code} - {unit.unit_name}
                                    </option>
                                  ))}
                              </select>
                            </td>

                            <td className="border border-gray-400 px-4 py-2">
                              <input
                                type="text"
                                value={slot.prerequisite}
                                readOnly
                                className="w-full p-1 border rounded bg-gray-100"
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => handleSavePlanner(template)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "view" && (
        <div>
          {savedPlanners.length === 0 ? (
            <p className="text-gray-600 text-center mt-10">No planners saved yet.</p>
          ) : (
            savedPlanners.map((planner) => (
              <div key={planner.id} className="mb-10 border p-4 rounded shadow-md">
                <h2 className="text-xl font-semibold text-blue-600 mb-3">{planner.template_name || "Saved Planner"}</h2>
                <div className="flex justify-between">
                  <button
                    onClick={() => handleResumeSavedPlanner(planner.id)}
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleRemoveSavedPlanner(planner.id)}
                    className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
