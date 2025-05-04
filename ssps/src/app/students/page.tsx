'use client';
import { useEffect, useState } from 'react';

type Student = {
  id: number;
  student_name: string;
  student_id: number;
  student_email: string;
  student_course: string;
  created_at: string;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState<Partial<Student>>({
    student_name: '',
    student_id: 0,
    student_email: '',
    student_course: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
  
      if (!res.ok) {
        console.error('Failed to load students:', data);
        return;  // bail out here rather than calling setStudents(data)
      }
  
      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };
  
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `${API_URL}/students/${editingId}` : `${API_URL}/students`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Operation failed');
      }

      setFormData({ student_name: '', student_id: 0, student_email: '', student_course: '' });
      setEditingId(null);
      await fetchStudents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
      await fetchStudents();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Management</h1>

      {/* Student Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.student_name}
            onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="number"
            placeholder="Student ID"
            value={formData.student_id}
            onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
            className="p-2 border rounded"
            required
            disabled={!!editingId}
            />
          <input
            type="email"
            placeholder="Email"
            value={formData.student_email}
            onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Course"
            value={formData.student_course}
            onChange={(e) => setFormData({ ...formData, student_course: e.target.value })}
            className="p-2 border rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {editingId ? 'Update Student' : 'Add Student'}
        </button>
      </form>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Student ID</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Course</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4">{student.student_name}</td>
                <td className="px-6 py-4">{student.student_id}</td>
                <td className="px-6 py-4">{student.student_email}</td>
                <td className="px-6 py-4">{student.student_course}</td>
                <td className="px-6 py-4 space-x-2">
                  <button
                    onClick={() => {
                      setEditingId(student.id);
                      setFormData({
                        student_name: student.student_name,
                        student_id: student.student_id,
                        student_email: student.student_email,
                        student_course: student.student_course
                      });
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}