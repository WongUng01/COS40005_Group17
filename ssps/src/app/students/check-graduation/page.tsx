// app/students/check-graduation/page.tsx
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

type SortField = 'student_name' | 'student_id';
type SortDirection = 'asc' | 'desc';

export default function CheckGraduationPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkingGraduation, setCheckingGraduation] = useState<number | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // const API_URL = 'http://localhost:8000';
  const API_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    fetchStudents();
  }, []);

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
      toast.error('Failed to load students');
    }
  };

  // Apply sorting and filtering to display students
  const getDisplayStudents = () => {
    let result = searchResults.length > 0 ? [...searchResults] : [...students];

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (sortField === 'student_name') {
          // String comparison for names
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  };

  const displayStudents = getDisplayStudents();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

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

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const checkGraduation = async (studentId: number) => {
  try {
    setCheckingGraduation(studentId);
    
    const response = await axios.put(`${API_URL}/students/${studentId}/graduate`, null, {
      headers: { Accept: "application/json" },
      timeout: 30000
    });

    const data = response.data;
    console.log("DEBUG: Full graduation response:", data);

    // Use the updated_student from backend if available
    const updatedStudent = data.updated_student;
    
    if (updatedStudent) {
      // Update both students and searchResults states
      setStudents(prev =>
        prev.map(s =>
          s.student_id === studentId
            ? { 
                ...s, 
                credit_point: updatedStudent.credit_point, 
                graduation_status: updatedStudent.graduation_status 
              }
            : s
        )
      );
      
      setSearchResults(prev =>
        prev.map(s =>
          s.student_id === studentId
            ? { 
                ...s, 
                credit_point: updatedStudent.credit_point, 
                graduation_status: updatedStudent.graduation_status 
              }
            : s
        )
      );
    }

    // Show success message
    if (data.can_graduate) {
      toast.success("Graduation Approved - Database Updated");
      alert(`✅ Graduation Approved!\nTotal Credits: ${data.total_credits}/300\n\nStatus has been saved to database.`);
    } else {
      let message = `❌ Not Eligible for Graduation\n\n`;
      message += `Total Credits: ${data.total_credits}/300\n`;
      
      // Show messages from backend if available
      if (data.messages && data.messages.length > 0) {
        message += `\nReasons:\n`;
        data.messages.forEach((msg: string) => {
          message += `• ${msg}\n`;
        });
      } else {
        // Fallback to old message format
        message += `Missing Core: ${data.missing_core_units.join(", ") || "None"}\n`;
        message += `Missing Major: ${data.missing_major_units.join(", ") || "None"}\n`;
        message += `MPU Requirement: ${data.mpu_requirements_met ? "Met" : "Not Met"}\n`;
        if (data.mpu_types_completed) {
          message += `MPU Types Completed: ${data.mpu_types_completed.length}/3\n`;
        }
      }
      
      message += `\nStatus has been updated in the database.`;
      alert(message);
    }

  } catch (err) {
    console.error("Graduation check error:", err);
    toast.error("Graduation check failed");
  } finally {
    setCheckingGraduation(null);
  }
};
  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#E31C25]">Check Graduation</h1>
        <div className="flex gap-4">
          <Link 
            href="/students" 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Main
          </Link>
          <Link 
            href="/students/information" 
            className="px-4 py-2 bg-[#E31C25] text-white rounded hover:bg-[#B71C1C]"
          >
            View All Students
          </Link>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#E31C25]/40">
        <h2 className="text-xl font-semibold mb-4 text-[#E31C25]">Search Student by ID</h2>
        <div className="flex gap-4 flex-wrap">
          <input
            type="number"
            placeholder="Enter Student ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border rounded flex-grow border-gray-300 focus:ring-2 focus:ring-[#E31C25] text-black"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-[#E31C25] text-white rounded hover:bg-[#B71C1C] disabled:opacity-60"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-black text-white rounded hover:opacity-95"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Graduation Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {displayStudents.filter(s => s.graduation_status).length}
            </div>
            <div className="text-sm text-gray-600">Eligible to Graduate</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-yellow-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {displayStudents.filter(s => !s.graduation_status && s.credit_point >= 240).length}
            </div>
            <div className="text-sm text-gray-600">Near Completion (240+ credits)</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-red-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {displayStudents.filter(s => !s.graduation_status && s.credit_point < 240).length}
            </div>
            <div className="text-sm text-gray-600">Need More Credits</div>
          </div>
        </div>
      </div>

      {/* Students Table for Graduation Check */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#E31C25]">
            <tr>
              <th className="px-6 py-3 text-left text-white font-medium">Graduation Status</th>
              <th 
                className="px-6 py-3 text-left text-white font-medium cursor-pointer hover:bg-[#B71C1C] transition-colors"
                onClick={() => handleSort('student_name')}
              >
                <div className="flex items-center">
                  Name
                  <SortIndicator field="student_name" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-white font-medium cursor-pointer hover:bg-[#B71C1C] transition-colors"
                onClick={() => handleSort('student_id')}
              >
                <div className="flex items-center">
                  Student ID
                  <SortIndicator field="student_id" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-white font-medium">Course</th>
              <th className="px-6 py-3 text-left text-white font-medium">Major</th>
              <th className="px-6 py-3 text-left text-white font-medium">Intake Term</th>
              <th className="px-6 py-3 text-left text-white font-medium">Intake Year</th>
              <th className="px-6 py-3 text-left text-white font-medium">Credits</th>
              <th className="px-6 py-3 text-left text-white font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayStudents.map((student) => (
              <tr key={student.student_id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${
                      student.graduation_status 
                        ? 'bg-green-600' 
                        : student.credit_point >= 240 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                    }`}
                  >
                    {student.graduation_status ? 'Eligible' : student.credit_point >= 240 ? 'Near Completion' : 'Not Eligible'}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">{student.student_name}</td>
                <td className="px-6 py-4">{student.student_id}</td>
                <td className="px-6 py-4">{student.student_course}</td>
                <td className="px-6 py-4">{student.student_major}</td>
                <td className="px-6 py-4">
                  <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                    {student.intake_term}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    {student.intake_year}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${
                    student.credit_point >= 300 ? 'text-green-600' : 
                    student.credit_point >= 240 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {student.credit_point}/300
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => checkGraduation(student.student_id)}
                    disabled={checkingGraduation === student.student_id}
                    className={`px-4 py-2 rounded text-white text-sm font-medium ${
                      checkingGraduation === student.student_id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {checkingGraduation === student.student_id ? 'Checking...' : 'Check Graduation'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">Graduation Status Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <span>Eligible to Graduate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Near Completion (240+ credits)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Need More Credits</span>
          </div>
        </div>
      </div>
    </div>
  );
}
