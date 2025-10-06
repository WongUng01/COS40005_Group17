// Student Page
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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

interface ExcelStudentRow {
  Name?: string;
  name?: string;
  StudentName?: string;
  Id?: number | string;
  id?: number | string;
  StudentID?: number | string;
  StudentId?: number | string;
  Email?: string;
  email?: string;
  StudentEmail?: string;
  Course?: string;
  course?: string;
  StudentCourse?: string;
  Major?: string;
  major?: string;
  StudentMajor?: string;
  'Intake Term'?: string;
  intake_term?: string;
  IntakeTerm?: string;
  'Intake Year'?: number | string;
  intake_year?: number | string;
  IntakeYear?: number | string;
}

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const API_URL = 'https://cos40005-group17.onrender.com';
  const [uploadingStudents, setUploadingStudents] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  // Check graduation eligibility for a student
  // Update the GraduationStatus type to include planner_info
type GraduationStatus = {
  can_graduate: boolean;
  total_credits: number;
  core_credits: number;
  major_credits: number;
  core_completed: number;
  major_completed: number;
  missing_core_units: string[];
  missing_major_units: string[];
  planner_info?: string;
};

// Check graduation eligibility for a student
const checkGraduation = async (studentId: number) => {
  try {
    const response = await axios.put(`${API_URL}/students/${studentId}/graduate`);
    const result: GraduationStatus = response.data;

    // Refresh student list
    await fetchStudents();

    if (result.can_graduate) {
      alert(`✅ Graduation Approved!\n
        Study Plan: ${result.planner_info || 'Unknown'}\n
        Total Credits: ${result.total_credits}/300\n
        Core Units Completed: ${result.core_completed}\n
        Major Units Completed: ${result.major_completed}`);
    } else {
      let message = `❌ Not Eligible for Graduation\n\n`;
      message += `Study Plan: ${result.planner_info || 'Unknown'}\n\n`;
      message += `Total Credits: ${result.total_credits}/300\n`;
      message += `Core Units Completed: ${result.core_completed}\n`;
      message += `Major Units Completed: ${result.major_completed}\n\n`;
      
      if (result.missing_core_units.length > 0) {
        message += `Missing Core Units (${result.missing_core_units.length}):\n${result.missing_core_units.join(', ')}\n\n`;
      } else {
        message += `✅ All Core Units Completed\n\n`;
      }
      
      if (result.missing_major_units.length > 0) {
        message += `Missing Major Units (${result.missing_major_units.length}):\n${result.missing_major_units.join(', ')}`;
      } else {
        message += `✅ All Major Units Completed`;
      }

      alert(message);
    }
  } catch (err) {
    let errorMessage = 'Error checking graduation status';
    
    if (axios.isAxiosError(err)) {
      errorMessage = err.response?.data?.detail || err.message;
      
      if (err.response?.status === 400) {
        errorMessage += "\n(Please check the study plan)";
      }
    }
    
    alert(errorMessage);
    console.error('Graduation check error:', err);
  }
};

const handleUploadStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setUploadingStudents(true);
    
    // 验证文件类型
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Only Excel files are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error('File exceeds 10MB size limit.');
      return;
    }

    // 使用动态导入来避免构建时的问题
    const XLSX = await import('xlsx');
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelStudentRow[];
        
        console.log('Processed Excel data:', jsonData);

        if (!jsonData.length) {
          toast.error('No data found in Excel file');
          return;
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // 逐条创建学生
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          try {
            // 处理不同的列名格式
            const studentData = {
              graduation_status: false,
              student_name: row.Name || row.name || row.StudentName || '',
              student_id: parseInt(String(row.Id || row.id || row.StudentID || row.StudentId || '0')),
              student_email: row.Email || row.email || row.StudentEmail || '',
              student_course: row.Course || row.course || row.StudentCourse || '',
              student_major: row.Major || row.major || row.StudentMajor || '',
              intake_term: row['Intake Term'] || row.intake_term || row.IntakeTerm || '',
              intake_year: String(row['Intake Year'] || row.intake_year || row.IntakeYear || ''),
              credit_point: 0
            };

            // 验证必需字段
            if (!studentData.student_name || !studentData.student_email || 
                !studentData.student_course || !studentData.student_major) {
              throw new Error('Missing required fields');
            }

            if (studentData.student_id === 0) {
              throw new Error('Invalid student ID');
            }

            // 使用现有的创建学生接口
            await axios.post(`${API_URL}/students`, studentData);
            successCount++;
            
            // 添加小延迟避免服务器过载
            if (i % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
          } catch (err: any) {
            errorCount++;
            const studentName = row.Name || row.name || row.StudentName || `Row ${i + 2}`;
            let errorMsg = `${studentName}: `;
            
            if (axios.isAxiosError(err)) {
              if (err.response?.status === 400) {
                errorMsg += 'Student already exists or invalid data';
              } else {
                errorMsg += err.response?.data?.detail || err.message;
              }
            } else {
              errorMsg += err.message;
            }
            
            errors.push(errorMsg);
            console.error(`Error creating student ${studentName}:`, err);
          }
        }

        // 显示结果
        let message = `Processed ${jsonData.length} students.\n\n`;
        message += `✅ Successfully created: ${successCount}\n`;
        message += `❌ Failed: ${errorCount}\n\n`;
        
        if (errors.length > 0) {
          message += `Errors (first 5):\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more errors`;
          }
        }

        // 使用确认对话框显示结果
        alert(message);
        
        if (successCount > 0) {
          toast.success(`Successfully created ${successCount} new students`);
          await fetchStudents(); // 刷新列表
        } else if (errorCount > 0) {
          toast.error('No students were created due to errors');
        }
        
      } catch (err) {
        console.error('Error processing Excel file:', err);
        toast.error('Error reading Excel file. Please check the format.');
      } finally {
        setUploadingStudents(false);
        if (e.target) e.target.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
      setUploadingStudents(false);
      if (e.target) e.target.value = '';
    };

    reader.readAsArrayBuffer(file);
    
  } catch (err) {
    console.error('Upload error:', err);
    toast.error('Upload failed');
    setUploadingStudents(false);
    if (e.target) e.target.value = '';
  }
};

  // Handle file upload (Excel) for unit records
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    studentId: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 1. Ensure the student exists
      const studentCheck = await axios.get(`${API_URL}/students/${studentId}`);
      if (!studentCheck.data) {
        toast.error('Student does not exist. Please create the profile first.');
        return;
      }

      // 2. Validate file type and size
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Only Excel files are supported.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error('File exceeds 10MB size limit.');
        return;
      }

      // 3. Upload file
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
      let errorMessage = 'Upload failed';
      
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message;

        if (err.response?.status === 404) {
          errorMessage = 'Associated student not found';
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid data format';
        }
      }

      toast.error(errorMessage);
    } finally {
      e.target.value = '';
    }
  };

  // Fetch all students from backend
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
      let errorMessage = 'Failed to load students';

      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.detail || 
                             (typeof err.response?.data === 'string' ? err.response.data : '');

        if (err.response?.status === 413) {
          errorMessage = 'File too large: Please upload a file smaller than 10MB';
        } else if (err.response?.status === 400) {
          errorMessage = 'Unsupported file type: Only Excel files allowed';
        } else {
          errorMessage = `Failed to load: ${serverMessage || 'Unknown error'}`;
        }

        console.error('Error Details:', {
          status: err.response?.status,
          error: err.response?.data
        });
      }

      toast.error(errorMessage);
    }
  };

  // Handle form submission to add or update a student
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

  // Delete a student record
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
      await fetchStudents();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  // Search for a student by ID
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a student ID to search');
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`${API_URL}/students/search/${searchTerm}`);
      setSearchResults(response.data);
      toast.success(`Found ${response.data.length} student(s)`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSearchResults([]);
        toast.error('No student found with that ID');
      } else {
        toast.error('Search failed: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
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

       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Upload Students from Excel</h2>
      <div className="flex gap-4 items-center">
        <div className="relative flex-grow">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUploadStudents}
            disabled={uploadingStudents}
            className="hidden"
            id="upload-students-file"
          />
          <label
            htmlFor="upload-students-file"
            className={`block w-full p-2 border rounded cursor-pointer ${
              uploadingStudents ? 'bg-gray-200 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
            }`}
          >
            {uploadingStudents ? 'Uploading...' : 'Choose Excel File'}
          </label>
        </div>
        <div className="text-sm text-gray-600">
          <p>Required columns: Name, Id, Email, Course, Major, Intake Term, Intake Year</p>
        </div>
      </div>
    </div>

      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Student by ID</h2>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="Enter Student ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border rounded flex-grow"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

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
            {(searchResults.length > 0 ? searchResults : students).map((student) => (
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
                    href={`/student-units/${student.student_id}`}
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
        {searchResults.length > 0 && (
          <div className="p-4 text-center text-gray-500">
            Showing {searchResults.length} search result(s)
          </div>
        )}
      </div>
    </div>
  );
}