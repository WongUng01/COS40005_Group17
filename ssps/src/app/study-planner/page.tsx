"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudyPlannerPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [savedPlanners, setSavedPlanners] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "view">("create");

  const [templateName, setTemplateName] = useState("");
  const [form, setForm] = useState({
    year: "1",
    semester: "1",
    unitId: "",
    unitName: "",
    prerequisite: "",
  });

  useEffect(() => {
    async function fetchUnits() {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_code, unit_name, prerequisites");

      if (error) {
        console.error("Error fetching units:", error.message);
        toast.error("Failed to load units");
      } else {
        setUnits(data || []);
      }
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

    fetchUnits();
    fetchSavedPlanners();
  }, []);

  async function handleSimpleSavePlanner() {
    if (!templateName || !form.unitId) {
      toast.error("Please enter a template name and select a unit.");
      return;
    }

    const payload = {
      template_name: templateName,
      created_at: new Date(),
      planner_data: [
        {
          year: form.year,
          semester: form.semester,
          unitId: form.unitId,
          unitName: form.unitName,
          prerequisite: form.prerequisite,
        },
      ],
    };

    const { error } = await supabase.from("hod_study_planner").insert([payload]);

    if (error) {
      console.error("Error saving planner:", error.message);
      toast.error("Failed to save planner.");
    } else {
      toast.success("Planner saved successfully!");
      setForm({ year: "1", semester: "1", unitId: "", unitName: "", prerequisite: "" });
      setTemplateName("");
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

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-center text-blue-700">Study Planner</h1>

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
          Saved Planners
        </button>
      </div>

      {activeTab === "create" && (
        <>
          <div className="mb-4">
            <label className="block font-semibold mb-1">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter template name"
            />
          </div>

          <div className="grid grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block mb-1 font-semibold">Year</label>
              <input
                type="number"
                min={1}
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="w-full border px-2 py-1 rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Semester</label>
              <input
                type="number"
                min={1}
                max={2}
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="w-full border px-2 py-1 rounded"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Unit Code</label>
              <select
                value={form.unitId}
                onChange={(e) => {
                  const selectedUnit = units.find((u) => u.id === e.target.value);
                  setForm({
                    ...form,
                    unitId: e.target.value,
                    unitName: selectedUnit?.unit_name || "",
                    prerequisite: selectedUnit?.prerequisites || "",
                  });
                }}
                className="w-full border px-2 py-1 rounded"
              >
                <option value="">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-semibold">Unit Name</label>
              <input
                type="text"
                value={form.unitName}
                readOnly
                className="w-full border px-2 py-1 rounded bg-gray-100"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold">Prerequisite</label>
              <input
                type="text"
                value={form.prerequisite}
                readOnly
                className="w-full border px-2 py-1 rounded bg-gray-100"
              />
            </div>
          </div>

          <button
            onClick={handleSimpleSavePlanner}
            className="bg-blue-600 text-white font-bold px-6 py-2 rounded hover:bg-blue-700"
          >
            Save Planner
          </button>
        </>
      )}

      {activeTab === "view" && (
        <div>
          {savedPlanners.length === 0 ? (
            <p className="text-gray-600 text-center mt-10">No planners saved yet.</p>
          ) : (
            savedPlanners.map((planner) => (
              <div key={planner.id} className="mb-6 border p-4 rounded shadow-md">
                <h3 className="text-2xl font-bold text-blue-700">{planner.template_name}</h3>
                <pre className="bg-gray-100 p-2 rounded mt-2 text-sm overflow-x-auto">
                  {JSON.stringify(planner.planner_data, null, 2)}
                </pre>
                <button
                  onClick={() => handleRemoveSavedPlanner(planner.id)}
                  className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-4 rounded"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
