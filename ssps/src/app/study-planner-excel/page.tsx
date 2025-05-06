"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import classNames from "classnames";

const ViewStudyPlannerTabs = () => {
  const [tabs, setTabs] = useState<any[]>([]);
  const [selectedPlanner, setSelectedPlanner] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchTabs = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/study-planner-tabs");
        setTabs(res.data);
        if (res.data.length > 0) {
          fetchPlanner(res.data[0]);
        }
      } catch (err) {
        console.error("Error fetching tabs", err);
        setMessage("Could not load planner tabs.");
      }
    };
    fetchTabs();
  }, []);

  const fetchPlanner = async (planner: any) => {
    try {
      setSelectedPlanner(planner);
      const res = await axios.get("http://localhost:8000/api/view-study-planner", {
        params: {
          program: planner.program,
          major: planner.major,
          intake_year: planner.intake_year,
          intake_semester: planner.intake_semester,
        },
      });
  
      console.log('Planner Data:', res.data);  // Debugging log to check the returned data
      setUnits(res.data.units);
      setMessage("");
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to load planner data.");
      setUnits([]);
    }
  };  

  const formatLabel = (tab: any) =>
    `${tab.intake_year} - ${tab.program} - ${tab.major} (${tab.intake_semester})`;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Study Planners</h2>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => fetchPlanner(tab)}
            className={classNames(
              "px-4 py-2 rounded border",
              selectedPlanner?.id === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white hover:bg-gray-100"
            )}
          >
            {formatLabel(tab)}
          </button>
        ))}
      </div>

      {message && <p className="text-red-500">{message}</p>}

      {selectedPlanner && (
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Planner Details</h3>
          <p><strong>Program:</strong> {selectedPlanner.program}</p>
          <p><strong>Major:</strong> {selectedPlanner.major}</p>
          <p><strong>Intake:</strong> {selectedPlanner.intake_semester} {selectedPlanner.intake_year}</p>
        </div>
      )}

      {units.length > 0 ? (
        <div>
          <h3 className="font-semibold text-lg mb-2">Units</h3>
          <table className="w-full border">
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
              {units.map((unit, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="border p-2">{unit.year || "N/A"}</td>
                  <td className="border p-2">{unit.semester || "N/A"}</td>
                  <td className="border p-2">{unit.unit_code || "N/A"}</td>
                  <td className="border p-2">{unit.unit_name || "N/A"}</td>
                  <td className="border p-2">{unit.prerequisites || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No units found for this planner.</p>
      )}
    </div>
  );
};

export default ViewStudyPlannerTabs;
