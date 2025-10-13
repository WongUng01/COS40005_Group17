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
  const [newOfferedTerms, setNewOfferedTerms] = useState('');
  const [newCreditPoint, setNewCreditPoint] = useState<number | ''>('');

  const validateUnit = () => {
    return unitCode && unitName && creditPoint !== '';
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const API = "http://localhost:8000";

  const fetchUnits = async () => {
    try {
      const res = await fetch(`${API}/units`);
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const addUnit = async () => {
    if (!validateUnit()) return;

    await fetch(`${API}/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_code: unitCode,
        unit_name: unitName,
        prerequisites,
        concurrent_prerequisites: concurrentPrerequisites,
        offered_terms: offeredTerms,
        credit_point: creditPoint
      }),
    });

    resetForm();
    fetchUnits();
  };

  
  const deleteUnit = async (id: number) => {
    await fetch(`${API}/units/${id}`, { method: 'DELETE' });
    fetchUnits();
  };

  const updateUnit = async (id: number) => {
    if (!newUnitName || newCreditPoint === '') return;

    await fetch(`${API}/units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_name: newUnitName,
        prerequisites: newPrerequisites,
        concurrent_prerequisites: newConcurrentPrerequisites,
        offered_terms: newOfferedTerms,
        credit_point: newCreditPoint
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
    setNewOfferedTerms('');
    setNewCreditPoint('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">📚 Manage Units</h1>

      {/* Add Unit Form */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <input
          value={unitCode}
          onChange={(e) => setUnitCode(e.target.value)}
          placeholder="Unit Code"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={unitName}
          onChange={(e) => setUnitName(e.target.value)}
          placeholder="Unit Name"
          className="px-4 py-2 border rounded-md"
        />
        <input
          type="number"
          step="0.5"
          value={creditPoint}
          onChange={(e) => setCreditPoint(Number(e.target.value) || '')}
          placeholder="Credit Points"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={prerequisites}
          onChange={(e) => setPrerequisites(e.target.value)}
          placeholder="Prerequisites"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={concurrentPrerequisites}
          onChange={(e) => setConcurrentPrerequisites(e.target.value)}
          placeholder="Concurrent Prerequisites"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={offeredTerms}
          onChange={(e) => setOfferedTerms(e.target.value)}
          placeholder="Offered Terms"
          className="px-4 py-2 border rounded-md"
        />
      </div>

      <button
        onClick={addUnit}
        className={`px-6 py-2 text-white font-semibold rounded-md mb-6 ${
          validateUnit() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        Add Unit
      </button>

      {/* Units Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-blue-100">
              <th className="px-4 py-2 text-left">Unit Code</th>
              <th className="px-4 py-2 text-left">Unit Name</th>
              <th className="px-4 py-2 text-left">Credit Points</th>
              <th className="px-4 py-2 text-left">Prerequisites</th>
              <th className="px-4 py-2 text-left">Concurrent Prerequisites</th>
              <th className="px-4 py-2 text-left">Offered Terms</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-b">
                <td className="px-4 py-2">{unit.unit_code}</td>
                <td className="px-4 py-2">{unit.unit_name}</td>
                <td className="px-4 py-2">{unit.credit_point}</td>
                <td className="px-4 py-2">
                  {unit.prerequisites ? (
                    unit.prerequisites
                      .split(',')
                      .filter(Boolean)
                      .map((preq, i) => (
                        <span key={i} className="bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                          {preq.trim()}
                        </span>
                      ))
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {unit.concurrent_prerequisites ? (
                    unit.concurrent_prerequisites
                      .split(',')
                      .filter(Boolean)
                      .map((preq, i) => (
                        <span key={i} className="bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                          {preq.trim()}
                        </span>
                      ))
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {unit.offered_terms ? (
                    unit.offered_terms
                      .split(',')
                      .filter(Boolean)
                      .map((term, i) => (
                        <span key={i} className="bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                          {term.trim()}
                        </span>
                      ))
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(unit.id);
                        setNewUnitName(unit.unit_name);
                        setNewPrerequisites(unit.prerequisites);
                        setNewConcurrentPrerequisites(unit.concurrent_prerequisites);
                        setNewOfferedTerms(unit.offered_terms);
                        setNewCreditPoint(unit.credit_point);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteUnit(unit.id)}
                      className="text-red-600 hover:text-red-800"
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

      {/* Edit Unit Form */}
      {editing !== null && (
        <div className="mt-6 p-4 bg-gray-50 border rounded-md">
          <h3 className="text-xl font-semibold text-blue-700">Edit Unit</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <input
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Unit Name"
              className="px-4 py-2 border rounded-md"
            />
            <input
              type="number"
              step="0.5"
              value={newCreditPoint}
              onChange={(e) => setNewCreditPoint(Number(e.target.value) || '')}
              placeholder="Credit Points"
              className="px-4 py-2 border rounded-md"
            />
            <input
              value={newPrerequisites}
              onChange={(e) => setNewPrerequisites(e.target.value)}
              placeholder="Prerequisites"
              className="px-4 py-2 border rounded-md"
            />
            <input
              value={newConcurrentPrerequisites}
              onChange={(e) => setNewConcurrentPrerequisites(e.target.value)}
              placeholder="Concurrent Prerequisites"
              className="px-4 py-2 border rounded-md"
            />
            <input
              value={newOfferedTerms}
              onChange={(e) => setNewOfferedTerms(e.target.value)}
              placeholder="Offered Terms"
              className="px-4 py-2 border rounded-md"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => updateUnit(editing)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Save Changes
            </button>
            <button
              onClick={resetEditForm}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}