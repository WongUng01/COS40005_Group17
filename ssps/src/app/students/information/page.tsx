// app/students/information/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import Select from 'react-select';

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

type Program = {
  id: number;
  program_name: string;
  program_code: string;
};

type Major = {
  id: number;
  major_name: string;
  program_id: number;
};

// Student Modal Component
function StudentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  mode,
  isSubmitting,
  programs,
  majors,
  intakeYears
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  formData: Partial<Student>;
  setFormData: (data: Partial<Student>) => void;
  mode: 'add' | 'edit';
  isSubmitting: boolean;
  programs: Program[];
  majors: Major[];
  intakeYears: number[];
}) {
  const semesters = [
    { value: 'Feb/Mar', label: 'Feb/Mar' },
    { value: 'Aug/Sep', label: 'Aug/Sep' }
  ];

  const swinburneStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "white",
      borderColor: state.isFocused ? "#b71c1c" : "#ccc",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(183, 28, 28, 0.2)" : "none",
      borderWidth: "1.5px",
      borderRadius: "8px",
      padding: "2px",
      "&:hover": { borderColor: "#d32f2f" },
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#d32f2f"
        : state.isFocused
        ? "#ffcdd2"
        : "white",
      color: state.isSelected ? "white" : "#333",
      cursor: "pointer",
    }),
    singleValue: (base: any) => ({ ...base, color: "#212121", fontWeight: 500 }),
    placeholder: (base: any) => ({ ...base, color: "#757575" }),
    menu: (base: any) => ({ ...base, borderRadius: "8px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", zIndex: 9999 }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(e);
  };

  const handleProgramSelect = (option: any) => {
    setFormData({ 
      ...formData, 
      student_course: option?.value || '' 
    });
  };

  const handleMajorSelect = (option: any) => {
    setFormData({ 
      ...formData, 
      student_major: option?.value || '' 
    });
  };

  const handleYearSelect = (option: any) => {
    setFormData({ 
      ...formData, 
      intake_year: option?.value || '' 
    });
  };

  const handleSemesterSelect = (option: any) => {
    setFormData({ 
      ...formData, 
      intake_term: option?.value || '' 
    });
  };

  const programOptions = programs
    .sort((a, b) => a.program_name.localeCompare(b.program_name))
    .map(p => ({ value: p.program_name, label: p.program_name }));

  const majorOptions = majors
    .sort((a, b) => a.major_name.localeCompare(b.major_name))
    .map(m => ({ value: m.major_name, label: m.major_name }));

  const yearOptions = intakeYears
    .sort((a, b) => b - a)
    .map(y => ({ value: y.toString(), label: y.toString() }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-[#E31C25]">
            {mode === 'add' ? 'Add New Student' : 'Edit Student'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Name *
              </label>
              <input
                type="text"
                placeholder="Enter student name"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID *
              </label>
              <input
                type="number"
                placeholder="Enter student ID"
                value={formData.student_id || ''}
                onChange={(e) => setFormData({ ...formData, student_id: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
                required
                disabled={isSubmitting || mode === 'edit'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Email *
              </label>
              <input
                type="email"
                placeholder="Enter student email"
                value={formData.student_email}
                onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Program Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program *
              </label>
              <Select
                value={formData.student_course ? { value: formData.student_course, label: formData.student_course } : null}
                onChange={handleProgramSelect}
                options={programOptions}
                placeholder="Select Program"
                styles={swinburneStyles}
                menuPortalTarget={document.body}
                isDisabled={isSubmitting}
              />
            </div>

            {/* Major Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Major *
              </label>
              <Select
                value={formData.student_major ? { value: formData.student_major, label: formData.student_major } : null}
                onChange={handleMajorSelect}
                options={majorOptions}
                placeholder="Select Major"
                styles={swinburneStyles}
                menuPortalTarget={document.body}
                isDisabled={isSubmitting || !formData.student_course}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Intake Year Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intake Year *
                </label>
                <Select
                  value={formData.intake_year ? { value: formData.intake_year, label: formData.intake_year } : null}
                  onChange={handleYearSelect}
                  options={yearOptions}
                  placeholder="Select Year"
                  styles={swinburneStyles}
                  menuPortalTarget={document.body}
                  isDisabled={isSubmitting}
                />
              </div>

              {/* Intake Semester Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intake Term *
                </label>
                <Select
                  value={formData.intake_term ? { value: formData.intake_term, label: formData.intake_term } : null}
                  onChange={handleSemesterSelect}
                  options={semesters}
                  placeholder="Select Term"
                  styles={swinburneStyles}
                  menuPortalTarget={document.body}
                  isDisabled={isSubmitting}
                />
              </div>
            </div>

            {mode === 'edit' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Points
                  </label>
                  <input
                    type="number"
                    value={formData.credit_point || 0}
                    onChange={(e) => setFormData({ ...formData, credit_point: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Graduation Status
                  </label>
                  <select
                    value={formData.graduation_status ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, graduation_status: e.target.value === 'true' })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value="false">Not Graduated</option>
                    <option value="true">Graduated</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#E31C25] text-white rounded-lg hover:bg-[#B71C1C] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {mode === 'add' ? 'Adding...' : 'Updating...'}
                </span>
              ) : (
                mode === 'add' ? 'Add Student' : 'Update Student'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentsInformationPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [intakeYears, setIntakeYears] = useState<number[]>([]);
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
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchIntakeYears();
  }, []);

  // Fetch majors when program changes
  useEffect(() => {
    if (formData.student_course) {
      const selectedProgram = programs.find(p => p.program_name === formData.student_course);
      if (selectedProgram) {
        fetchMajors(selectedProgram.id);
      }
    }
  }, [formData.student_course, programs]);

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/students`);
      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to load students:', data);
        toast.error('Failed to load students');
        return;
      }

      setStudents(data);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to load students');
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await fetch(`${API_URL}/api/programs`);
      const data = await res.json();
      setPrograms(data || []);
    } catch (err) {
      console.error('Error fetching programs:', err);
      toast.error('Failed to load programs');
    }
  };

  const fetchMajors = async (programId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/majors/${programId}`);
      const data = await res.json();
      setMajors(data || []);
    } catch (err) {
      console.error('Error fetching majors:', err);
    }
  };

  const fetchIntakeYears = async () => {
    try {
      const res = await fetch(`${API_URL}/api/intake-years`);
      const data = await res.json();
      setIntakeYears(data || []);
    } catch (err) {
      console.error('Error fetching intake years:', err);
      toast.error('Failed to load intake years');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let response;
      if (editingStudentId) {
        response = await axios.put(`${API_URL}/students/${editingStudentId}`, formData);
        toast.success('Student updated successfully');
      } else {
        response = await axios.post(`${API_URL}/students`, formData);
        toast.success('Student added successfully');
      }

      console.log('API Response:', response.data);

      // Reset form and close modal
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
      setEditingStudentId(null);
      setIsModalOpen(false);
      
      // Refresh the students list
      await fetchStudents();
    } catch (err: any) {
      console.error('Error submitting student:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Operation failed';
      toast.error(`Failed to ${editingStudentId ? 'update' : 'add'} student: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: number) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;

    setIsDeleting(studentId);
    try {
      const response = await axios.delete(`${API_URL}/students/${studentId}`);
      console.log('Delete response:', response.data);
      
      toast.success('Student deleted successfully');
      await fetchStudents();
    } catch (err: any) {
      console.error('Error deleting student:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Delete failed';
      toast.error(`Failed to delete student: ${errorMessage}`);
    } finally {
      setIsDeleting(null);
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
      if (response.data.length === 0) {
        toast('No students found with that ID', {
          icon: 'ℹ️',
        });
      } else {
        toast.success(`Found ${response.data.length} student(s)`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      if (err.response?.status === 404) {
        setSearchResults([]);
        toast.error('No student found with that ID');
      } else {
        const errorMessage = err.response?.data?.detail || err.message || 'Search failed';
        toast.error(`Search failed: ${errorMessage}`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const openAddModal = () => {
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
    setEditingStudentId(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    console.log('Editing student:', student);
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
    setEditingStudentId(student.student_id);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setEditingStudentId(null);
    }
  };

  const displayStudents = searchResults.length > 0 ? searchResults : students;

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#E31C25]">Students Information</h1>
        <div className="flex gap-4">
          <Link 
            href="/students" 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Back to Main
          </Link>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-[#E31C25] text-white rounded hover:bg-[#B71C1C] flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
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
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="p-3 border rounded flex-grow border-gray-300 focus:ring-2 focus:ring-[#E31C25] text-black"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-3 bg-[#E31C25] text-white rounded hover:bg-[#B71C1C] disabled:opacity-60 transition-colors min-w-24"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={clearSearch}
              className="px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
        {displayStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No students found. {searchResults.length > 0 ? 'Try a different search term.' : 'Add your first student to get started.'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#E31C25]">
              <tr>
                <th className="px-6 py-3 text-left text-white font-medium">Graduated</th>
                <th className="px-6 py-3 text-left text-white font-medium">Name</th>
                <th className="px-6 py-3 text-left text-white font-medium">Student ID</th>
                <th className="px-6 py-3 text-left text-white font-medium">Email</th>
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
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-white text-sm font-semibold ${
                        student.graduation_status ? 'bg-green-600' : 'bg-gray-400'
                      }`}
                    >
                      {student.graduation_status ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{student.student_name}</td>
                  <td className="px-6 py-4 font-semibold">{student.student_id}</td>
                  <td className="px-6 py-4">{student.student_email}</td>
                  <td className="px-6 py-4">{student.student_course}</td>
                  <td className="px-6 py-4">{student.student_major}</td>
                  <td className="px-6 py-4">{student.intake_term}</td>
                  <td className="px-6 py-4">{student.intake_year}</td>
                  <td className="px-6 py-4 font-semibold">{student.credit_point}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={() => openEditModal(student)} 
                        disabled={isDeleting === student.student_id}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student.student_id)}
                        disabled={isDeleting === student.student_id}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isDeleting === student.student_id ? (
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                        {isDeleting === student.student_id ? 'Deleting...' : 'Delete'}
                      </button>
                      <Link
                        href={`/student-units/${student.student_id}`}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Student Modal */}
      <StudentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        mode={modalMode}
        isSubmitting={isSubmitting}
        programs={programs}
        majors={majors}
        intakeYears={intakeYears}
      />
    </div>
  );
}