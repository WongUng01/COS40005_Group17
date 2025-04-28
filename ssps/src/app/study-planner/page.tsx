// 'use client'

// import React, { useEffect, useState } from 'react';

// // Define types for Unit and ScheduleSlot
// type Unit = {
//   id: number;
//   courseName: string;
//   faculty: string;
// };

// type ScheduleSlot = {
//   day: string;
//   time: string;
//   unit: Unit | null;
// };

// export default function StudyPlanner() {
//   // States to manage the units, schedule, and selected unit
//   const [units, setUnits] = useState<Unit[]>([]);
//   const [schedule, setSchedule] = useState<ScheduleSlot[][]>([]);
//   const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

//   // API endpoint
//   const API = 'http://localhost:8000';

//   // Fetch units from API on component mount
//   useEffect(() => {
//     fetchUnits();
//     initializeSchedule();
//   }, []);

//   // Fetch units from the server and set it to the state
//   const fetchUnits = async () => {
//     try {
//       const res = await fetch(`${API}/units`);
//       const data = await res.json();
//       setUnits(data); // Set units to state
//     } catch (err) {
//       console.error('Fetch error:', err);
//     }
//   };

//   // Initialize schedule structure (7 AM to 9 PM, Monday to Friday)
//   const initializeSchedule = () => {
//     const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
//     const hours = [
//       '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
//       '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', 
//       '7:00 PM', '8:00 PM'
//     ];

//     const scheduleTemplate = days.map((day) =>
//       hours.map((time) => ({ day, time, unit: null }))
//     );
//     setSchedule(scheduleTemplate); // Set the initial empty schedule
//   };

//   // Handle selecting a unit from the dropdown
//   const handleUnitSelection = (unit: Unit) => {
//     setSelectedUnit(unit); // Set selected unit
//   };

//   // Handle adding the unit to a specific time slot in the schedule
//   const handleScheduleDrop = (day: string, time: string) => {
//     if (selectedUnit) {
//       const updatedSchedule = schedule.map((daySchedule) =>
//         daySchedule.map((slot) => {
//           if (slot.day === day && slot.time === time) {
//             return { ...slot, unit: selectedUnit }; // Assign selected unit to the time slot
//           }
//           return slot;
//         })
//       );
//       setSchedule(updatedSchedule); // Update the schedule
//       setSelectedUnit(null); // Reset the selected unit
//     }
//   };

//   // Handle removing the unit from a specific time slot
//   const handleRemoveUnit = (day: string, time: string) => {
//     const updatedSchedule = schedule.map((daySchedule) =>
//       daySchedule.map((slot) => {
//         if (slot.day === day && slot.time === time) {
//           return { ...slot, unit: null }; // Remove unit from the slot
//         }
//         return slot;
//       })
//     );
//     setSchedule(updatedSchedule); // Update the schedule
//   };

//   // Handle updating the unit in a time slot
//   const handleUpdateUnit = (day: string, time: string) => {
//     if (selectedUnit) {
//       const updatedSchedule = schedule.map((daySchedule) =>
//         daySchedule.map((slot) => {
//           if (slot.day === day && slot.time === time) {
//             return { ...slot, unit: selectedUnit }; // Update the unit
//           }
//           return slot;
//         })
//       );
//       setSchedule(updatedSchedule); // Update the schedule
//     }
//   };

//   // Save schedule (for example, send it to a backend to store it permanently)
//   const saveSchedule = () => {
//     console.log('Saving schedule:', schedule);
//   };

//   return (
//     <div className="max-w-6xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
//       <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">📚 Study Planner</h1>

//       {/* Unit selection */}
//       <div className="mb-6">
//         <select
//           className="px-4 py-2 border rounded-md"
//           onChange={(e) => {
//             const selectedUnitId = parseInt(e.target.value);
//             const unit = units.find((unit) => unit.id === selectedUnitId);
//             if (unit) handleUnitSelection(unit); // Set the selected unit
//           }}
//         >
//           <option value="">Select Unit</option>
//           {units.map((unit) => (
//             <option key={unit.id} value={unit.id}>
//               {unit.courseName} - {unit.faculty}
//             </option>
//           ))}
//         </select>

//         {selectedUnit && (
//           <div className="mt-4">
//             <p>
//               <strong>{selectedUnit.courseName}</strong><br />
//               {selectedUnit.faculty}
//             </p>
//           </div>
//         )}
//       </div>

//       {/* Save button */}
//       <div className="mb-6">
//         <button
//           onClick={saveSchedule}
//           className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
//         >
//           Save Schedule
//         </button>
//       </div>

//       {/* Schedule Template */}
//       <div className="grid grid-cols-6 gap-4">
//         {/* Column for time slots */}
//         <div className="font-semibold text-center">Time</div>
//         {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
//           <div key={day} className="font-semibold text-center">{day}</div>
//         ))}

//         {/* Displaying time slots */}
//         {[
//           '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
//           '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', 
//           '7:00 PM', '8:00 PM'
//         ].map((time) => (
//           <React.Fragment key={time}>
//             <div className="text-center">{time}</div>
//             {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
//               const slot = schedule
//                 .flat()
//                 .find((s) => s.day === day && s.time === time);
//               return (
//                 <div
//                   key={`${day}-${time}`}
//                   className="border p-4 hover:bg-gray-200 cursor-pointer"
//                   onClick={() => handleScheduleDrop(day, time)} // Allow adding/removing unit
//                 >
//                   {slot && slot.unit ? (
//                     <div className="text-sm font-semibold">
//                       {slot.unit.courseName}
//                       <button
//                         onClick={() => handleRemoveUnit(day, time)}
//                         className="text-red-500 text-xs ml-2"
//                       >
//                         🗑️ Remove
//                       </button>
//                     </div>
//                   ) : (
//                     <div className="text-sm text-gray-500">Empty</div>
//                   )}
//                 </div>
//               );
//             })}
//           </React.Fragment>
//         ))}
//       </div>
//     </div>
//   );
// }


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
  const [plannerId, setPlannerId] = useState<string | null>(null);

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
  
    async function initPlanner() {
      // Create empty planner first
      const initialPlanner: Record<string, any> = {};
      plannerStructure.forEach((semester) => {
        initialPlanner[semester.id] = Array(semester.slots).fill({
          unitId: "",
          prerequisite: "",
          corequisite: "",
        });
      });
      setPlanner(initialPlanner);
  
      // Then try to fetch saved planner
      await fetchSavedPlanner();
    }
  
    fetchUnits();
    initPlanner();
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
    if (plannerId) {
      // Update existing planner
      const { error } = await supabase
        .from("hod_study_planner")
        .update({ planner_data: planner })
        .eq("id", plannerId);
  
      if (error) {
        console.error("Error updating planner:", error.message);
        toast.error("❌ Failed to update planner");
      } else {
        toast.success("✅ Planner updated successfully!");
      }
    } else {
      // Insert new planner
      const { data, error } = await supabase
        .from("hod_study_planner")
        .insert([{ planner_data: planner }])
        .select()
        .single();
  
      if (error) {
        console.error("Error saving planner:", error.message);
        toast.error("❌ Failed to save planner");
      } else {
        toast.success("✅ Planner saved successfully!");
        setPlannerId(data.id); // Save the new planner's ID
      }
    }
  }  

  async function fetchSavedPlanner() {
    const { data, error } = await supabase
      .from("hod_study_planner")
      .select("id, planner_data") // now also select ID
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
  
    if (error) {
      console.error("Error fetching saved planner:", error.message);
      toast.error("❌ Failed to load saved planner");
    } else if (data) {
      setPlanner(data.planner_data);
      setPlannerId(data.id); // << store the planner ID!
      toast.success("✅ Latest planner loaded!");
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
      <div className="flex justify-center mt-10 gap-6">
        <button
          onClick={handleSavePlanner}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          Save Planner
        </button>

        <button
          onClick={fetchSavedPlanner}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          Load Latest Plan
        </button>
      </div>
    </div>
  );
}
