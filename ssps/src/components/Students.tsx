
//student page
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';


type Student = {
  id: number;
  graduation_status: boolean;
  student_name: string;
  student_id: number;
  student_email: string;
  student_course: string;
  student_major: string;
  intake_term: string;
  intake_year: string;
  credit_point: number;
  created_at: string;
};

const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState<Partial<Student>>({
    graduation_status: false,
    student_name: '',
    student_id: 0,
    student_email: '',
    student_course: '',
    student_major: '',
    intake_term: '',
    intake_year: '',
    credit_point: 0
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchStudents();
  }, []);

  

const checkGraduation = async (studentId: number) => {
  try {
    const response = await axios.put(
      `${API_URL}/students/${studentId}/graduate`
    );
    const result = response.data;

    // Refresh student list
    await fetchStudents();

    if (result.can_graduate) {
      alert(`✅ Graduation Approved!\n
        Total Credits: ${result.total_credits}/300\n
        Core Units Completed: ${result.core_completed}/${result.core_completed + result.missing_core_units.length}\n
        Major Units Completed: ${result.major_completed}/${result.major_completed + result.missing_major_units.length}`);
    } else {
      let message = `❌ Not Eligible\nCredits: ${result.total_credits}/300`;
      
      if (result.missing_core_units.length > 0) {
        message += `\nMissing Core: ${result.missing_core_units.join(', ')}`;
      }
      
      if (result.missing_major_units.length > 0) {
        message += `\nMissing Major: ${result.missing_major_units.join(', ')}`;
      }

      alert(message);
    }
  } catch (err) {
    let errorMessage = 'Error checking graduation status';
    
    if (axios.isAxiosError(err)) {
      errorMessage = err.response?.data?.detail || err.message;
      
      if (err.response?.status === 400) {
        errorMessage += "\n(Please check your study plan)";
      }
    }
    
    alert(errorMessage);
  }
};

  // 在StudentsPage组件中添加处理函数
const handleFileUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  studentId: number
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    // 1. Validate student exists
    const studentCheck = await axios.get(`${API_URL}/students/${studentId}`);
    if (!studentCheck.data) {
      toast.error('学生不存在，请先创建学生档案');
      return;
    }

    // 2. Validate file
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('仅支持 Excel 文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小超过 10MB 限制');
      return;
    }

    // 3. Proceed with upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwrite', 'true');

    const response = await axios.post(
      `${API_URL}/students/${studentId}/upload-units`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 }
    );

    toast.success(response.data.message);
    await fetchStudents();
  } catch (err) {
    let errorMessage = '上传失败';
    
    if (axios.isAxiosError(err)) {
      errorMessage = err.response?.data?.detail || err.message;
      
      // Handle specific error codes
      if (err.response?.status === 404) {
        errorMessage = '关联学生不存在';
      } else if (err.response?.status === 400) {
        errorMessage = '数据格式错误';
      }
    }
    
    toast.error(errorMessage);
  } finally {
    e.target.value = '';
  }
};

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();
  
      if (!res.ok) {
        console.error('Failed to load students:', data);
        return;
      }
  
      setStudents(data);
    } catch (err) {
    let errorMessage = 'Upload failed';
    
    if (axios.isAxiosError(err)) {
      // Handle Chinese error messages
      const serverMessage = err.response?.data?.detail || 
                           (typeof err.response?.data === 'string' ? err.response.data : '');
      
      // Special handling for file validation errors
      if (err.response?.status === 413) {
        errorMessage = '文件过大：请上传小于10MB的文件';
      } else if (err.response?.status === 400) {
        errorMessage = '文件类型错误：仅支持Excel文件';
      } else {
        errorMessage = `上传失败：${serverMessage || '未知错误'}`;
      }

      console.error('Error Details:', {
        status: err.response?.status,
        error: err.response?.data
      });
    }
    
    toast.error(errorMessage);
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

      setFormData({
        graduation_status: false,
        student_name: '',
        student_id: 0,
        student_email: '',
        student_course: '',
        student_major: '',
        intake_term: '',
        intake_year: '',
        credit_point: 0
      });
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
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.graduation_status || false}
              onChange={(e) => setFormData({ ...formData, graduation_status: e.target.checked })}
              className="mr-2"
            />
            <label>Graduation Status</label>
          </div>
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
          <input
            type="text"
            placeholder="Major"
            value={formData.student_major}
            onChange={(e) => setFormData({ ...formData, student_major: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Intake Term"
            value={formData.intake_term}
            onChange={(e) => setFormData({ ...formData, intake_term: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Intake Year"
            value={formData.intake_year}
            onChange={(e) => setFormData({ ...formData, intake_year: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="number"
            step="0.5"
            placeholder="Credit Points"
            value={formData.credit_point}
            onChange={(e) => setFormData({ ...formData, credit_point: Number(e.target.value) })}
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
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Graduated</th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Student ID</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Course</th>
              <th className="px-6 py-3 text-left">Major</th>
              <th className="px-6 py-3 text-left">Intake Term</th>
              <th className="px-6 py-3 text-left">Intake Year</th>
              <th className="px-6 py-3 text-left">Credit Points</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4">
                  {student.graduation_status ? '✅' : '❌'}
                </td>
                <td className="px-6 py-4">{student.student_name}</td>
                <td className="px-6 py-4">{student.student_id}</td>
                <td className="px-6 py-4">{student.student_email}</td>
                <td className="px-6 py-4">{student.student_course}</td>
                <td className="px-6 py-4">{student.student_major}</td>
                <td className="px-6 py-4">{student.intake_term}</td>
                <td className="px-6 py-4">{student.intake_year}</td>
                <td className="px-6 py-4">{student.credit_point}</td>
                <td className="px-6 py-4 space-x-2">
                <div className="relative inline-block">
    <input
      type="file"
      accept=".xlsx,.xls"
      onChange={(e) => handleFileUpload(e, student.student_id)}
      className="hidden"
      id={`upload-${student.student_id}`}
    />
    <label
      htmlFor={`upload-${student.student_id}`}
      className="text-blue-600 hover:text-blue-800 cursor-pointer"
    >
      Upload Completed Units
    </label>
  </div>
  <button 
    onClick={() => checkGraduation(student.student_id)}
    className="text-purple-600 hover:text-purple-800"
  >
    Check Graduation
  </button>
<Link
                    href={`/student_units/${student.student_id}`}
                    className="text-green-600 hover:text-green-800"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => {
                    setEditingId(student.id);
                    setFormData({
                        graduation_status: student.graduation_status,
                        student_name: student.student_name,
                        student_id: student.student_id,
                        student_email: student.student_email,
                        student_course: student.student_course,
                        student_major: student.student_major,
                        intake_term: student.intake_term,
                        intake_year: student.intake_year,
                        credit_point: student.credit_point
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

