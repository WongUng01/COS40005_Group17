"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";

// Create the Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define semester structure
const plannerStructure = [
  { id: "year1sem1", label: "Year 1 Sem 1", slots: 5 },
  { id: "year1sem2", label: "Year 1 Sem 2", slots: 4 },
  { id: "year2sem1", label: "Year 2 Sem 1", slots: 4 },
  { id: "year2sem2", label: "Year 2 Sem 2", slots: 4 },
  { id: "year3sem1", label: "Year 3 Sem 1", slots: 4 },
  { id: "year3sem2", label: "Year 3 Sem 2", slots: 3 },
];

export default function StudyPlannerPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [planner, setPlanner] = useState<Record<string, any>>({});
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]); // To track selected unit IDs

  useEffect(() => {
    async function fetchUnits() {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_code, unit_name");

      if (error) {
        console.error("Error fetching units:", error.message);
        return;
      }
      setUnits(data || []);
    }

    fetchUnits();

    // Initialize empty planner
    const initialPlanner: Record<string, any> = {};
    plannerStructure.forEach((semester) => {
      initialPlanner[semester.id] = Array(semester.slots).fill({
        unitId: "",
        prerequisite: "",
        corequisite: "",
      });
    });
    setPlanner(initialPlanner);
  }, []);

  function handleUnitChange(semesterId: string, slotIndex: number, field: string, value: string) {
    setPlanner((prev) => {
      const updatedSemester = [...prev[semesterId]];
      const previousUnitId = updatedSemester[slotIndex]?.unitId;
      updatedSemester[slotIndex] = {
        ...updatedSemester[slotIndex],
        [field]: value,
      };

      // Update selected units
      setSelectedUnits((prevSelected) => {
        let newSelected = [...prevSelected];
        if (previousUnitId) {
          newSelected = newSelected.filter((id) => id !== previousUnitId);
        }
        if (value) {
          newSelected.push(value);
        }
        return newSelected;
      });

      return {
        ...prev,
        [semesterId]: updatedSemester,
      };
    });
  }

  async function handleSavePlanner() {
    const { data, error } = await supabase.from("planners").insert([
      { planner_data: planner },
    ]);

    if (error) {
      console.error("Error saving planner:", error.message);
      toast.error("❌ Failed to save planner");
    } else {
      toast.success("✅ Planner saved successfully!");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-10 text-center text-blue-700">📚 Study Planner</h1>

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-200 text-lg">
              <th className="border border-gray-400 px-4 py-2">#</th>
              <th className="border border-gray-400 px-4 py-2">Unit (Code + Name)</th>
              <th className="border border-gray-400 px-4 py-2">Pre-requisite</th>
              <th className="border border-gray-400 px-4 py-2">Co-requisite</th>
            </tr>
          </thead>
          <tbody>
            {plannerStructure.map((semester) => (
              <React.Fragment key={semester.id}>
                <tr>
                  <td
                    colSpan={4}
                    className="bg-blue-200 text-blue-800 font-bold text-center py-3 text-xl border border-gray-400"
                  >
                    {semester.label}
                  </td>
                </tr>

                {planner[semester.id]?.map((slot: any, index: number) => (
                  <tr key={`${semester.id}-slot-${index}`}>
                    <td className="border border-gray-400 px-4 py-2 text-center">
                      {index + 1}
                    </td>

                    {/* Unit Code + Name Dropdown */}
                    <td className="border border-gray-400 px-4 py-2">
                      <select
                        value={slot.unitId}
                        onChange={(e) =>
                          handleUnitChange(semester.id, index, "unitId", e.target.value)
                        }
                        className="w-full p-1 border rounded"
                      >
                        <option value="">-- Select Unit --</option>
                        {units
                          .filter((unit) => !selectedUnits.includes(unit.id) || unit.id === slot.unitId)
                          .map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.unit_code} - {unit.unit_name}
                            </option>
                          ))}
                      </select>
                    </td>

                    {/* Pre-requisite Input */}
                    <td className="border border-gray-400 px-4 py-2">
                      <input
                        type="text"
                        placeholder="Prerequisite"
                        value={slot.prerequisite}
                        onChange={(e) =>
                          handleUnitChange(semester.id, index, "prerequisite", e.target.value)
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>

                    {/* Corequisite Input */}
                    <td className="border border-gray-400 px-4 py-2">
                      <input
                        type="text"
                        placeholder="Corequisite"
                        value={slot.corequisite}
                        onChange={(e) =>
                          handleUnitChange(semester.id, index, "corequisite", e.target.value)
                        }
                        className="w-full p-1 border rounded"
                      />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="flex justify-center mt-10">
        <button
          onClick={handleSavePlanner}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          Save Planner
        </button>
      </div>
    </div>
  );
}
