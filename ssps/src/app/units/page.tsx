'use client';

import { useEffect, useState } from 'react';

type Unit = {
  id: number;
  courseId: string;
  courseName: string;
  creditHours: number;
  faculty: string;
};

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [creditHours, setCreditHours] = useState<number | ''>('');
  const [faculty, setFaculty] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCreditHours, setNewCreditHours] = useState<number | ''>('');
  const [newFaculty, setNewFaculty] = useState('');

  const API = 'http://localhost:8000'; // Replace with your actual API URL

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await fetch(`${API}/units`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUnits(data);
      } else {
        console.error('API did not return an array:', data);
        setUnits([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const addUnit = async () => {
    if (!courseId || !courseName || creditHours === '' || !faculty) return;

    await fetch(`${API}/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, courseName, creditHours, faculty }),
    });

    setCourseId('');
    setCourseName('');
    setCreditHours('');
    setFaculty('');
    fetchUnits();
  };

  const updateUnit = async (id: number) => {
    if (newCourseName.trim() === '' || newCreditHours === '' || newFaculty.trim() === '') return;

    await fetch(`${API}/units/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseName: newCourseName, creditHours: newCreditHours, faculty: newFaculty }),
    });

    setEditing(null);
    setNewCourseName('');
    setNewCreditHours('');
    setNewFaculty('');
    fetchUnits();
  };

  const deleteUnit = async (id: number) => {
    await fetch(`${API}/units/${id}`, {
      method: 'DELETE',
    });
    fetchUnits();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">📚 Manage Units</h1>

      {/* Units Form */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          onChange={(e) => setCreditHours(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Credit Hours"
          className="px-4 py-2 border rounded-md"
        />
        <input
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          placeholder="Faculty"
          className="px-4 py-2 border rounded-md"
        />
      </div>

      <button
        onClick={addUnit}
        className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 mb-6"
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
              <th className="px-4 py-2 text-left">Credit Hours</th>
              <th className="px-4 py-2 text-left">Faculty</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.length > 0 ? (
              units.map((unit) => (
                <tr key={unit.id} className="border-b">
                  <td className="px-4 py-2">{unit.courseId}</td>
                  <td className="px-4 py-2">{unit.courseName}</td>
                  <td className="px-4 py-2">{unit.creditHours}</td>
                  <td className="px-4 py-2">{unit.faculty}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(unit.id);
                          setNewCourseName(unit.courseName);
                          setNewCreditHours(unit.creditHours);
                          setNewFaculty(unit.faculty);
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
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">
                  No units available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editing Form (appears when editing a unit) */}
      {editing !== null && (
        <div className="mt-6 p-4 bg-gray-50 border rounded-md">
          <h3 className="text-xl font-semibold text-blue-700">Edit Unit</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <input
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="New Course Name"
              className="px-4 py-2 border rounded-md"
            />
            <input
              type="number"
              value={newCreditHours}
              onChange={(e) => setNewCreditHours(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="New Credit Hours"
              className="px-4 py-2 border rounded-md"
            />
            <input
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
              placeholder="New Faculty"
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
              onClick={() => setEditing(null)}
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
