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
  student_type: string; 
  has_spm_bm_credit: boolean; 
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

type SortField = 'student_name' | 'student_id' | 'credit_point';
type SortDirection = 'asc' | 'desc';

// Student Modal Component (保持不变)
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

  const studentTypeOptions = [
    { value: 'malaysian', label: 'Malaysian' },
    { value: 'international', label: 'International' }
  ];

  const spmCreditOptions = [
    { value: 'true', label: 'TRUE' },
    { value: 'false', label: 'FALSE' }
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
      fontSize: "14px",
      padding: "8px 12px",
    }),
    singleValue: (base: any) => ({ ...base, color: "#212121", fontWeight: 500 }),
    placeholder: (base: any) => ({ ...base, color: "#757575" }),
    menu: (base: any) => ({ 
      ...base, 
      borderRadius: "8px", 
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)", 
      zIndex: 9999,
      maxHeight: "100px",
      overflow: "hidden",
    }),
    menuList: (base: any) => ({
      ...base,
      maxHeight: "100px",
      padding: 0,
      overflowY: "auto",
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.has_spm_bm_credit) {
      toast.error('Please select SPM BM Credit status');
      return;
    }

    if (formData.student_id && formData.student_id <= 0) {
      toast.error('Student ID must be a positive number');
      return;
    }

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

  const handleStudentTypeSelect = (option: any) => {
    setFormData({ 
      ...formData, 
      student_type: option?.value || 'malaysian' 
    });
  };

  const handleSpmCreditSelect = (option: any) => {
    setFormData({ 
      ...formData, 
      has_spm_bm_credit: option?.value === 'true' 
    });
  };

  const handleStudentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || (parseInt(value) > 0)) {
      setFormData({ ...formData, student_id: parseInt(value) || 0 });
    }
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
                onChange={handleStudentIdChange}
                min="1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
                required
                disabled={isSubmitting || mode === 'edit'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Student ID must be a positive number
              </p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Type *
              </label>
              <Select
                value={formData.student_type ? { value: formData.student_type, label: formData.student_type.charAt(0).toUpperCase() + formData.student_type.slice(1) } : { value: 'malaysian', label: 'Malaysian' }}
                onChange={handleStudentTypeSelect}
                options={studentTypeOptions}
                placeholder="Select Student Type"
                styles={swinburneStyles}
                menuPortalTarget={document.body}
                isDisabled={isSubmitting}
                maxMenuHeight={200}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Has SPM BM Credit *
              </label>
              <Select
                value={formData.has_spm_bm_credit !== undefined ? 
                  { value: formData.has_spm_bm_credit.toString(), label: formData.has_spm_bm_credit ? 'TRUE' : 'FALSE' } : 
                  null
                }
                onChange={handleSpmCreditSelect}
                options={spmCreditOptions}
                placeholder="Select SPM BM Credit Status"
                styles={swinburneStyles}
                menuPortalTarget={document.body}
                isDisabled={isSubmitting}
                maxMenuHeight={200}
                required
              />
            </div>

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
                maxMenuHeight={200}
                required
              />
            </div>

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
                maxMenuHeight={200}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  maxMenuHeight={200}
                  required
                />
              </div>

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
                  maxMenuHeight={200}
                  required
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

// Sort indicator component
const SortIndicator = ({ field, sortField, sortDirection }: { 
  field: SortField; 
  sortField: SortField | null; 
  sortDirection: SortDirection; 
}) => {
  if (sortField !== field) return null;
  
  return (
    <span className="ml-1">
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
};

export default function StudentsInformationPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
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
    credit_point: 0,
    student_type: 'malaysian',
    has_spm_bm_credit: undefined
  });
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search and Sort states - 类似 unit page 的实现
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('student_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // const API_URL = 'http://localhost:8000';
  // const API_URL = "http://127.0.0.1:8000";
  const API_URL = "https://cos40005-group17.onrender.com";


  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchIntakeYears();
  }, []);

  // Filter and sort students whenever students, searchTerm, sortField, or sortDirection change
  useEffect(() => {
    let result = students;

    // Apply search filter - 客户端实时搜索
    if (searchTerm) {
      const lowercasedSearch = searchTerm.toLowerCase();
      result = result.filter(student =>
        student.student_name.toLowerCase().includes(lowercasedSearch) ||
        student.student_id.toString().includes(searchTerm) ||
        student.student_email.toLowerCase().includes(lowercasedSearch) ||
        student.student_course.toLowerCase().includes(lowercasedSearch) ||
        student.student_major.toLowerCase().includes(lowercasedSearch)
      );
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'student_name') {
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

    setFilteredStudents(result);
  }, [students, searchTerm, sortField, sortDirection]);

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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  // Handle sort column click - 类似 unit page 的实现
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formData.student_course && formData.student_major && formData.intake_year && formData.intake_term) {
        try {
          const studyPlanCheck = await axios.get(`${API_URL}/study-plans/check`, {
            params: {
              program: formData.student_course,
              major: formData.student_major,
              intake_year: formData.intake_year,
              intake_semester: formData.intake_term
            }
          });
          
          if (!studyPlanCheck.data.exists) {
            toast.error(`No study plan found for ${formData.student_course} - ${formData.student_major} (${formData.intake_year} ${formData.intake_term}). Please contact administrator.`);
            setIsSubmitting(false);
            return;
          }
        } catch (error) {
          console.warn('Study plan check failed, proceeding with student creation...');
        }
      }

      let response;
      if (editingStudentId) {
        response = await axios.put(`${API_URL}/students/${editingStudentId}`, formData);
        toast.success('Student updated successfully');
      } else {
        response = await axios.post(`${API_URL}/students`, formData);
        toast.success('Student added successfully');
      }

      console.log('API Response:', response.data);

      setFormData({
        graduation_status: false,
        student_name: '',
        student_id: 0,
        student_email: '',
        student_course: '',
        student_major: '',
        intake_term: '',
        intake_year: '',
        credit_point: 0,
        student_type: 'malaysian',
        has_spm_bm_credit: undefined
      });
      setEditingStudentId(null);
      setIsModalOpen(false);
      
      await fetchStudents();
    } catch (err: any) {
      console.error('Error submitting student:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Operation failed';
      
      if (errorMessage.includes('study plan') || errorMessage.includes('planner')) {
        toast.error(`Student created but no study plan found. Please contact administrator to add a study plan for ${formData.student_course} - ${formData.student_major}.`);
      } else {
        toast.error(`Failed to ${editingStudentId ? 'update' : 'add'} student: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: number) => {
    const student = students.find(s => s.student_id === studentId);
    if (!student) return;

    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    setIsDeleting(studentToDelete.student_id);
    try {
      const response = await axios.delete(`${API_URL}/students/${studentToDelete.student_id}`);
      console.log('Delete response:', response.data);
      
      toast.success('Student deleted successfully');
      await fetchStudents();
    } catch (err: any) {
      console.error('Error deleting student:', err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || err.message || 'Delete failed';
      toast.error(`Failed to delete student: ${errorMessage}`);
    } finally {
      setIsDeleting(null);
      setShowDeleteModal(false);
      setStudentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };

  const openAddModal = () => {
    console.log('Opening add student modal...');
    setFormData({
      graduation_status: false,
      student_name: '',
      student_id: 0,
      student_email: '',
      student_course: '',
      student_major: '',
      intake_term: '',
      intake_year: '',
      credit_point: 0,
      student_type: 'malaysian',
      has_spm_bm_credit: undefined
    });
    setEditingStudentId(null);
    setModalMode('add');
    setIsModalOpen(true);
    toast.success('Add Student form opened');
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
      credit_point: student.credit_point,
      student_type: student.student_type || 'malaysian',
      has_spm_bm_credit: student.has_spm_bm_credit
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

  // Helper function to get badge color for graduation status
  const getGraduationBadgeColor = (graduated: boolean) => {
    return graduated ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#E31C25] mb-2">
            Students Information
          </h1>
          <p className="text-gray-600">
            Manage and organize student information efficiently
          </p>
        </div>
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

      {/* Search Bar - 类似 unit page 的实现 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by student name, ID, email, course, or major..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E31C25] focus:border-transparent"
          />
          <svg 
            className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="text-sm text-gray-600 mt-2">
            Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} matching "{searchTerm}"
          </p>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E31C25]"></div>
          <span className="ml-3 text-lg">Loading students...</span>
        </div>
      )}

      {/* Students Table */}
      {!isLoading && (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-lg font-medium">
                {searchTerm ? 'No students found matching your search' : 'No students found'}
              </p>
              <p className="text-sm">
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first student to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#E31C25]">
                  <tr>
                    <th className="px-6 py-3 text-left text-white font-medium text-sm">Graduated</th>
                    <th 
                      className="px-6 py-3 text-left text-white font-medium text-sm cursor-pointer hover:bg-[#B71C1C] transition-colors"
                      onClick={() => handleSort('student_name')}
                    >
                      <div className="flex items-center">
                        Name
                        <SortIndicator 
                          field="student_name" 
                          sortField={sortField} 
                          sortDirection={sortDirection} 
                        />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-white font-medium text-sm cursor-pointer hover:bg-[#B71C1C] transition-colors"
                      onClick={() => handleSort('student_id')}
                    >
                      <div className="flex items-center">
                        Student ID
                        <SortIndicator 
                          field="student_id" 
                          sortField={sortField} 
                          sortDirection={sortDirection} 
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-white font-medium text-sm">Email</th>
                    <th className="px-6 py-3 text-left text-white font-medium text-sm">Course</th>
                    <th className="px-6 py-3 text-left text-white font-medium text-sm">Major</th>
                    <th className="px-6 py-3 text-left text-white font-medium text-sm">Intake Term</th>
                    <th 
                      className="px-6 py-3 text-left text-white font-medium text-sm cursor-pointer hover:bg-[#B71C1C] transition-colors"
                      onClick={() => handleSort('credit_point')}
                    >
                      <div className="flex items-center">
                        Credits
                        <SortIndicator 
                          field="credit_point" 
                          sortField={sortField} 
                          sortDirection={sortDirection} 
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-white font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${getGraduationBadgeColor(student.graduation_status)}`}
                        >
                          {student.graduation_status ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-sm">{student.student_name}</td>
                      <td className="px-6 py-4 font-semibold text-sm">{student.student_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 truncate max-w-[150px]" title={student.student_email}>
                        {student.student_email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 truncate max-w-[150px]" title={student.student_course}>
                        {student.student_course}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 truncate max-w-[150px]" title={student.student_major}>
                        {student.student_major}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                          {student.intake_term} {student.intake_year}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-sm">{student.credit_point}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
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
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1 transition-colors text-center justify-center"
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
            </div>
          )}
        </div>
      )}

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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && studentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-[#E31C25]">Confirm Delete</h2>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete student <strong>{studentToDelete.student_name}</strong> (ID: {studentToDelete.student_id})? 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={confirmDelete}
                disabled={isDeleting === studentToDelete.student_id}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {isDeleting === studentToDelete.student_id ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}