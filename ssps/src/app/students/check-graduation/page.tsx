// app/students/check-graduation/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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

type GraduationResult = {
  can_graduate: boolean;
  total_credits: number;
  messages: string[];
  missing_core_units: string[];
  missing_major_units: string[];
  student_id: number;
};

export default function CheckGraduationPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkingGraduation, setCheckingGraduation] = useState<number | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [graduationResult, setGraduationResult] = useState<GraduationResult | null>(null);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const router = useRouter();

  // const API_URL = 'http://localhost:8000';
  // const API_URL = "http://127.0.0.1:8000";
  const API_URL = "https://cos40005-group17.onrender.com";


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
    const result = searchResults.length > 0 ? [...searchResults] : [...students];

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

      // Store the graduation result and show modal instead of alert
      const result: GraduationResult = {
        can_graduate: data.can_graduate,
        total_credits: data.total_credits,
        messages: data.messages || [],
        missing_core_units: data.missing_core_units || [],
        missing_major_units: data.missing_major_units || [],
        student_id: studentId
      };

      setGraduationResult(result);
      setShowResultModal(true);

      // Show toast for database update
      toast.success("Graduation check completed - Database Updated");

    } catch (err) {
      console.error("Graduation check error:", err);
      toast.error("Graduation check failed");
    } finally {
      setCheckingGraduation(null);
    }
  };

  const handleViewDetails = () => {
    if (graduationResult) {
      // Navigate to student details page
      router.push(`/student-units/${graduationResult.student_id}`);
    }
    setShowResultModal(false);
  };

  const handleCloseModal = () => {
    setShowResultModal(false);
    setGraduationResult(null);
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

  // Graduation Result Modal Component
  const GraduationResultModal = () => {
    if (!showResultModal || !graduationResult) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#E31C25]">
              Graduation Check Result
            </h2>
            <button
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {graduationResult.can_graduate ? (
              <div className="text-center">
                <div className="text-4xl mb-4">🎓</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Graduation Approved!</h3>
                <p className="text-gray-600 mb-4">
                  Congratulations! The student is eligible to graduate.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-semibold">
                    Total Credits: {graduationResult.total_credits}/300
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-4">❌</div>
                <h3 className="text-2xl font-bold text-red-600 mb-2">Not Eligible for Graduation</h3>
                <p className="text-gray-600 mb-4">
                  The student does not meet all graduation requirements.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-semibold mb-2">
                    Total Credits: {graduationResult.total_credits}/300
                  </p>
                  
                  {graduationResult.messages.length > 0 ? (
                    <div className="text-left">
                      <p className="font-semibold text-red-700 mb-2">Reasons:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {graduationResult.messages.map((message, index) => (
                          <li key={index} className="text-red-700 text-sm">{message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-left">
                      {graduationResult.missing_core_units.length > 0 && (
                        <p className="text-red-700 text-sm">
                          Missing Core: {graduationResult.missing_core_units.join(", ") || "None"}
                        </p>
                      )}
                      {graduationResult.missing_major_units.length > 0 && (
                        <p className="text-red-700 text-sm">
                          Missing Major: {graduationResult.missing_major_units.join(", ") || "None"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-500 text-center mb-4">
              Status has been updated in the database.
            </p>
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleViewDetails}
              className="flex-1 px-4 py-3 bg-[#E31C25] text-white rounded-lg hover:bg-[#B71C1C] font-medium"
            >
              View Student Details
            </button>
            <button
              onClick={handleCloseModal}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
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

      {/* Graduation Result Modal */}
      <GraduationResultModal />
    </div>
  );
}