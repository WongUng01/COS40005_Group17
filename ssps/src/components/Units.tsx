'use client';

import { useEffect, useState } from 'react';

type Unit = {
  id: number;
  unit_code: string;
  unit_name: string;
  prerequisites: string;
  concurrent_prerequisites: string;
  offered_terms: string;
  credit_point: number;
};

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [concurrentPrerequisites, setConcurrentPrerequisites] = useState('');
  const [offeredTerms, setOfferedTerms] = useState('');
  const [creditPoint, setCreditPoint] = useState<number | ''>('');
  const [editing, setEditing] = useState<number | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [newPrerequisites, setNewPrerequisites] = useState('');
  const [newConcurrentPrerequisites, setNewConcurrentPrerequisites] = useState('');
  const [newOfferedTerms, setNewOfferedTerms] = useState<string | null>(null);
  const [newCreditPoint, setNewCreditPoint] = useState<number | ''>('');

  const validateUnit = () => {
    return unitCode && unitName && creditPoint !== '';
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  // const API = "http://localhost:8000";
  const API = "http://127.0.0.1:8000";

  const fetchUnits = async () => {
    try {
      const res = await fetch(`${API}/api/units`);
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const addUnit = async () => {
    if (!validateUnit()) return;

    await fetch(`${API}/api/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_code: unitCode,
        unit_name: unitName,
        prerequisites,
        concurrent_prerequisites: concurrentPrerequisites,
        offered_terms: offeredTerms,
        credit_point: creditPoint,
      }),
    });

    resetForm();
    fetchUnits();
  };

  const deleteUnit = async (id: number) => {
    await fetch(`${API}/api/units/${id}`, { method: 'DELETE' });
    fetchUnits();
  };

  const updateUnit = async (id: number) => {
    if (!newUnitName || newCreditPoint === '') return;

    await fetch(`${API}/api/units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_name: newUnitName,
        prerequisites: newPrerequisites,
        concurrent_prerequisites: newConcurrentPrerequisites,
        offered_terms: newOfferedTerms,
        credit_point: newCreditPoint,
      }),
    });

    resetEditForm();
    fetchUnits();
  };

  const resetForm = () => {
    setUnitCode('');
    setUnitName('');
    setPrerequisites('');
    setConcurrentPrerequisites('');
    setOfferedTerms('');
    setCreditPoint('');
  };

  const resetEditForm = () => {
    setEditing(null);
    setNewUnitName('');
    setNewPrerequisites('');
    setNewConcurrentPrerequisites('');
    setNewOfferedTerms(null);
    setNewCreditPoint('');
  };

  return (
    <div className="max-w-6xl mx-auto p-8 mt-10 bg-white rounded-xl shadow-lg border-t-8 border-[#D6001C]">
      <h1 className="text-4xl font-extrabold text-center text-[#D6001C] mb-2 tracking-wide">
        Swinburne Unit Management
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Manage and organize your university units efficiently
      </p>

      {/* Add Unit Form */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <input
          value={unitCode}
          onChange={(e) => setUnitCode(e.target.value)}
          placeholder="Unit Code"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
        />
        <input
          value={unitName}
          onChange={(e) => setUnitName(e.target.value)}
          placeholder="Unit Name"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
        />
        <input
          type="number"
          step="0.5"
          value={creditPoint}
          onChange={(e) => setCreditPoint(Number(e.target.value) || '')}
          placeholder="Credit Points"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
        />
        <input
          value={prerequisites}
          onChange={(e) => setPrerequisites(e.target.value)}
          placeholder="Prerequisites"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
        />
        <input
          value={concurrentPrerequisites}
          onChange={(e) => setConcurrentPrerequisites(e.target.value)}
          placeholder="Concurrent Prerequisites"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
        />
        <input
          value={offeredTerms}
          onChange={(e) => setOfferedTerms(e.target.value)}
          placeholder="Offered Terms"
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
        />
      </div>

      <button
        onClick={addUnit}
        className={`px-6 py-2 font-semibold rounded-md text-white mb-6 transition ${
          validateUnit()
            ? 'bg-[#D6001C] hover:bg-[#B00018]'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        ➕ Add Unit
      </button>

      {/* Units Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 shadow-sm">
          <thead>
            <tr className="bg-[#D6001C] text-white">
              <th className="px-4 py-2 text-left font-medium">Unit Code</th>
              <th className="px-4 py-2 text-left font-medium">Unit Name</th>
              <th className="px-4 py-2 text-left font-medium">Credit Points</th>
              <th className="px-4 py-2 text-left font-medium">Prerequisites</th>
              <th className="px-4 py-2 text-left font-medium">Concurrent</th>
              <th className="px-4 py-2 text-left font-medium">Offered Terms</th>
              <th className="px-4 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="odd:bg-gray-50 even:bg-white hover:bg-gray-100 transition">
                <td className="px-4 py-2 font-semibold">{unit.unit_code}</td>
                <td className="px-4 py-2">{unit.unit_name}</td>
                <td className="px-4 py-2">{unit.credit_point}</td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {unit.prerequisites || <span className="text-gray-400">None</span>}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {unit.concurrent_prerequisites || <span className="text-gray-400">None</span>}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  {unit.offered_terms || <span className="text-gray-400">None</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setEditing(unit.id);
                        setNewUnitName(unit.unit_name);
                        setNewPrerequisites(unit.prerequisites);
                        setNewConcurrentPrerequisites(unit.concurrent_prerequisites);
                        setNewOfferedTerms(unit.offered_terms);
                        setNewCreditPoint(unit.credit_point);
                      }}
                      className="text-[#D6001C] hover:text-[#B00018] font-semibold"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteUnit(unit.id)}
                      className="text-black hover:text-[#D6001C] font-semibold"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Section */}
      {editing !== null && (
        <div className="mt-8 p-6 bg-gray-50 border-l-4 border-[#D6001C] rounded-md">
          <h3 className="text-2xl font-bold text-[#D6001C] mb-4">Edit Unit</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Unit Name"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
            />
            <input
              type="number"
              step="0.5"
              value={newCreditPoint}
              onChange={(e) => setNewCreditPoint(Number(e.target.value) || '')}
              placeholder="Credit Points"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
            />
            <input
              value={newPrerequisites}
              onChange={(e) => setNewPrerequisites(e.target.value)}
              placeholder="Prerequisites"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
            />
            <input
              value={newConcurrentPrerequisites}
              onChange={(e) => setNewConcurrentPrerequisites(e.target.value)}
              placeholder="Concurrent Prerequisites"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
            />
            <input
              value={newOfferedTerms ?? ""}
              onChange={(e) => setNewOfferedTerms(e.target.value || null)}
              placeholder="Offered Terms"
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#D6001C]"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => updateUnit(editing)}
              className="px-4 py-2 bg-[#D6001C] text-white rounded-md hover:bg-[#B00018]"
            >
              💾 Save Changes
            </button>
            <button
              onClick={resetEditForm}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            >
              ✖ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
