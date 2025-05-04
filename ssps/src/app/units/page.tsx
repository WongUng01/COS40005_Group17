'use client';

import { useEffect, useState } from 'react';

type Unit = {
  id: number;
  courseId: string;
  courseName: string;
  creditHours: number;
  faculty: string;
  prequisites: string;
};

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [creditHours, setCreditHours] = useState<number | ''>('');
  const [faculty, setFaculty] = useState('');
  const [prequisites, setPrequisites] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCreditHours, setNewCreditHours] = useState<number | ''>('');
  const [newFaculty, setNewFaculty] = useState('');
  const [newPrequisites, setNewPrequisites] = useState('');

  const API = 'http://localhost:8000';

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await fetch(`${API}/units`);
      const data = await res.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const validateUnit = () => {
    return courseId && courseName && creditHours !== '' && faculty;
  };

  const addUnit = async () => {
    if (!validateUnit()) return;

    await fetch(`${API}/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        courseName,
        creditHours,
        faculty,
        prequisites
      }),
    });

    resetForm();
    fetchUnits();
  };

  const updateUnit = async (id: number) => {
    if (!newCourseName || newCreditHours === '' || !newFaculty) return;

    await fetch(`${API}/units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseName: newCourseName,
        creditHours: newCreditHours,
        faculty: newFaculty,
        prequisites: newPrequisites
      }),
    });

    resetEditForm();
    fetchUnits();
  };

  const deleteUnit = async (id: number) => {
    await fetch(`${API}/units/${id}`, { method: 'DELETE' });
    fetchUnits();
  };

  const resetForm = () => {
    setCourseId('');
    setCourseName('');
    setCreditHours('');
    setFaculty('');
    setPrequisites('');
  };

  const resetEditForm = () => {
    setEditing(null);
    setNewCourseName('');
    setNewCreditHours('');
    setNewFaculty('');
    setNewPrequisites('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">📚 Manage Units</h1>

      {/* Add Unit Form */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <input
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="Course ID"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="Course Name"
          className="px-4 py-2 border rounded-md"
        />
        <input
          type="number"
          value={creditHours}
          onChange={(e) => setCreditHours(Number(e.target.value) || '')}
          placeholder="Credit Hours"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          placeholder="Faculty"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={prequisites}
          onChange={(e) => setPrequisites(e.target.value)}
          placeholder="Prerequisites (comma separated)"
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
              <th className="px-4 py-2 text-left">Course ID</th>
              <th className="px-4 py-2 text-left">Course Name</th>
              <th className="px-4 py-2 text-left">Credits</th>
              <th className="px-4 py-2 text-left">Faculty</th>
              <th className="px-4 py-2 text-left">Prerequisites</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-b">
                <td className="px-4 py-2">{unit.courseId}</td>
                <td className="px-4 py-2">{unit.courseName}</td>
                <td className="px-4 py-2">{unit.creditHours}</td>
                <td className="px-4 py-2">{unit.faculty}</td>
                <td className="px-4 py-2">
                  {unit.prequisites ? (
                    unit.prequisites
                      .split(',')
                      .filter(Boolean)
                      .map((preq, i) => (
                        <span key={i} className="bg-gray-100 px-2 py-1 rounded mr-1 mb-1">
                          {preq.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">No prerequisites</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(unit.id);
                        setNewCourseName(unit.courseName);
                        setNewCreditHours(unit.creditHours);
                        setNewFaculty(unit.faculty);
                        setNewPrequisites(unit.prequisites);
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
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="Course Name"
              className="px-4 py-2 border rounded-md"
            />
            <input
              type="number"
              value={newCreditHours}
              onChange={(e) => setNewCreditHours(Number(e.target.value) || '')}
              placeholder="Credit Hours"
              className="px-4 py-2 border rounded-md"
            />
            <input
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
              placeholder="Faculty"
              className="px-4 py-2 border rounded-md"
            />
            <input
              value={newPrequisites}
              onChange={(e) => setNewPrequisites(e.target.value)}
              placeholder="Prerequisites (comma separated)"
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