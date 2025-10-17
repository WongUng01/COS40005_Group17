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
  const API_URL = 'http://localhost:8000';
  const [uploadingStudents, setUploadingStudents] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  // Check graduation eligibility for a student
  type GraduationStatus = {
    can_graduate: boolean;
    total_credits: number;
    core_credits: number;
    major_credits: number;
    core_completed: number;
    major_completed: number;
    missing_core_units: string[];
    missing_major_units: string[];
    planner_info: string;
  };

// Check graduation eligibility for a student
// Replace your existing checkGraduation with this
const checkGraduation = async (studentId: number) => {
  try {
    const response = await axios.put(`${API_URL}/students/${studentId}/graduate`, null, {
      headers: { Accept: "application/json" },
      // optional: extend timeout if your server sometimes runs slowly
      timeout: 30000
    });

    const data = response.data;
    console.log("DEBUG: graduation PUT response raw:", data);

    // existing handling (your code used this earlier and is fine)
    const gradResult = data?.graduation_result ?? data;
    const updatedStudent = data?.updated_student ?? null;

    if (!gradResult) {
      console.warn("DEBUG: graduation result missing in response", data);
      toast.error("Graduation check returned unexpected shape; see console.");
      return;
    }

    // update local state (same as your original code)
    if (updatedStudent && typeof updatedStudent === "object") {
      setStudents(prev =>
        prev.map(s =>
          s.student_id === studentId
            ? { ...s, credit_point: updatedStudent.credit_point, graduation_status: updatedStudent.graduation_status }
            : s
        )
      );
      console.log("DEBUG: Local state updated from updated_student:", updatedStudent);
    } else {
      setStudents(prev =>
        prev.map(s =>
          s.student_id === studentId
            ? { ...s, credit_point: gradResult.total_credits ?? s.credit_point, graduation_status: !!gradResult.can_graduate }
            : s
        )
      );
      console.log("DEBUG: Local state updated from graduation_result:", {
        credit_point: gradResult.total_credits,
        graduation_status: gradResult.can_graduate
      });
    }

    // show messages
    if (gradResult.can_graduate) {
      toast.success("Graduation Approved");
      alert(`✅ Graduation Approved!\nTotal Credits: ${gradResult.total_credits}/300\nPlanner: ${gradResult.planner_info ?? "Unknown"}`);
    } else {
      let message = `❌ Not Eligible for Graduation\n\n`;
      message += `Total Credits: ${gradResult.total_credits ?? "N/A"}/300\n`;
      message += `Missing Core: ${Array.isArray(gradResult.missing_core_units) ? gradResult.missing_core_units.join(", ") : "N/A"}\n`;
      message += `Missing Major: ${Array.isArray(gradResult.missing_major_units) ? gradResult.missing_major_units.join(", ") : "N/A"}\n`;
      alert(message);
    }

  } catch (err) {
    console.error("Graduation check error (frontend):", err);

    // Axios error details
    if (axios.isAxiosError(err)) {
      console.log("DEBUG: error.toJSON():", err.toJSON ? err.toJSON() : err);
      console.log("DEBUG: error.response:", err.response);
      console.log("DEBUG: error.request:", err.request);
      const status = err.response?.status;
      const respData = err.response?.data;
      const respHeaders = err.response?.headers;
      console.log("DEBUG: status:", status);
      console.log("DEBUG: response data:", respData);
      console.log("DEBUG: response headers:", respHeaders);

      // If backend returned JSON with `detail` (our endpoint does on exceptions), show it
      const serverMsg = respData?.detail ?? respData?.message ?? JSON.stringify(respData);
      toast.error(`Graduation check failed (status ${status}).`);
      // show the server message in an alert for immediate visibility
      alert(`Graduation check failed (status ${status})\n\nServer message:\n${serverMsg}`);
    } else {
      toast.error("Graduation check failed (non-Axios error). See console.");
    }
  }
};


  // 替代的批量上传函数 - 使用现有的批量上传接口
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

      // 使用 FormData 上传整个文件
      const formData = new FormData();
      formData.append('file', file);

      // 使用批量上传接口
      const response = await axios.post(
        `${API_URL}/api/upload-students`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000 
        }
      );

      console.log('DEBUG: Bulk upload response:', response.data);

      // 显示结果
      const data = response.data;
      let message = `Bulk Upload Completed!\n\n`;
      message += `📊 Total Rows Processed: ${data.summary.total_rows}\n`;
      message += `✅ Successfully Inserted: ${data.summary.inserted}\n`;
      message += `⏭️ Skipped Existing: ${data.summary.skipped_existing}\n`;
      message += `❌ Errors: ${data.summary.errors}\n\n`;
      
      if (data.details.errors && data.details.errors.length > 0) {
        message += `Errors (first 5):\n${data.details.errors.slice(0, 5).join('\n')}`;
        if (data.details.errors.length > 5) {
          message += `\n... and ${data.details.errors.length - 5} more errors`;
        }
      }

      alert(message);
      
      if (data.summary.inserted > 0) {
        toast.success(`Successfully created ${data.summary.inserted} new students`);
        await fetchStudents(); // 刷新列表
      } else if (data.summary.errors > 0) {
        toast.error('No new students were created due to errors');
      }
      
    } catch (err: any) {
      console.error('Upload error:', err);
      
      let errorMessage = 'Upload failed';
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setUploadingStudents(false);
      if (e.target) e.target.value = '';
    }
  };

  // 改进的文件上传函数 - 支持更新现有数据
  // const handleFileUpload = async (
  //   e: React.ChangeEvent<HTMLInputElement>,
  //   studentId: number
  // ) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   try {
  //     // 显示上传状态
  //     toast.loading('Uploading units file...');

  //     // 1. 验证学生存在性
  //     const studentCheck = await axios.get(`${API_URL}/students/${studentId}`);
  //     if (!studentCheck.data) {
  //       toast.dismiss();
  //       toast.error('Student does not exist. Please create the profile first.');
  //       return;
  //     }

  //     const studentName = studentCheck.data.student_name;

  //     // 2. 验证文件类型和大小
  //     if (!file.name.match(/\.(xlsx|xls)$/i)) {
  //       toast.dismiss();
  //       toast.error('Only Excel files (.xlsx, .xls) are supported.');
  //       return;
  //     }

  //     if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
  //       toast.dismiss();
  //       toast.error('File exceeds 10MB size limit.');
  //       return;
  //     }

  //     // 3. 询问用户如何处理现有数据
  //     const overwrite = window.confirm(
  //       `Upload units for ${studentName} (ID: ${studentId})?\n\n` +
  //       'This will REPLACE all existing units for this student.\n\n' +
  //       'Click OK to continue, Cancel to abort.'
  //     );

  //     if (!overwrite) {
  //       toast.dismiss();
  //       toast(`Found ${unmatchedFiles.length} file(s) that need manual student assignment`);
  //       return;
  //     }

  //     // 4. 上传文件
  //     const formData = new FormData();
  //     formData.append('file', file);
  //     formData.append('overwrite', 'true');

  //     const response = await axios.post(
  //       `${API_URL}/students/${studentId}/upload-units`,
  //       formData,
  //       { 
  //         headers: { 'Content-Type': 'multipart/form-data' }, 
  //         timeout: 30000,
  //         onUploadProgress: (progressEvent) => {
  //           if (progressEvent.total) {
  //             const percentCompleted = Math.round(
  //               (progressEvent.loaded * 100) / progressEvent.total
  //             );
  //             toast.loading(`Uploading: ${percentCompleted}%`);
  //           }
  //         }
  //       }
  //     );

  //     toast.dismiss();
  //     toast.success(response.data.message);
      
  //     // 显示详细信息
  //     const unitCount = response.data.message.match(/\d+/)?.[0] || 'some';
  //     alert(`✅ Successfully uploaded ${unitCount} units for ${studentName}`);

  //     // 5. 刷新学生列表和学分
  //     await fetchStudents();

  //   } catch (err) {
  //     toast.dismiss();
      
  //     let errorMessage = 'Upload failed';
      
  //     if (axios.isAxiosError(err)) {
  //       const serverMessage = err.response?.data?.detail || err.message;
  //       errorMessage = `Upload failed: ${serverMessage}`;

  //       if (err.response?.status === 404) {
  //         errorMessage = 'Associated student not found';
  //       } else if (err.response?.status === 400) {
  //         errorMessage = 'Invalid data format in Excel file';
  //       } else if (err.response?.status === 413) {
  //         errorMessage = 'File too large: Please upload a file smaller than 10MB';
  //       } else if (err.code === 'ECONNABORTED') {
  //         errorMessage = 'Upload timeout: Please try again with a smaller file';
  //       }
  //     }

  //     toast.error(errorMessage);
  //     console.error('File upload error:', err);
  //   } finally {
  //     // 重置文件输入
  //     if (e.target) e.target.value = '';
  //   }
  // };

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

  // 添加这些状态变量
  const [uploadingBulkUnits, setUploadingBulkUnits] = useState(false);
  const [bulkUnitsResults, setBulkUnitsResults] = useState<any[]>([]);
  const [selectedStudentForUnits, setSelectedStudentForUnits] = useState<number | null>(null);
  const [showUnitAssignment, setShowUnitAssignment] = useState(false);
  const [pendingUnits, setPendingUnits] = useState<any[]>([]);
  const [unmatchedFiles, setUnmatchedFiles] = useState<Array<{
    filename: string;
    extractedStudentId: string;
    units: any[];
  }>>([]);

  // 从文件名提取学生ID的函数
  const extractStudentIdFromFilename = (filename: string): string => {
    // 移除文件扩展名
    const nameWithoutExt = filename.replace(/\.(xlsx|xls)$/i, '');
    
    // 尝试匹配常见的学号模式：纯数字或字母+数字
    const studentIdMatch = nameWithoutExt.match(/^(\d+|[a-zA-Z]+\d+)$/);
    
    if (studentIdMatch) {
      return studentIdMatch[1];
    }
    
    // 如果文件名包含下划线，尝试提取第一部分（例如：12345_张三.xlsx）
    const parts = nameWithoutExt.split('_');
    if (parts.length > 1) {
      const firstPart = parts[0];
      if (firstPart.match(/^\d+$/)) {
        return firstPart;
      }
    }
    
    return '';
  };

  // 多文件批量上传单元
  // 统一的批量上传函数
  // 更新批量上传函数
// 更新批量上传函数 - 使用适配的批量上传端点
const handleBulkUnitsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  try {
    setUploadingBulkUnits(true);
    toast.loading('Starting bulk upload...');

    const formData = new FormData();
    
    // 添加所有文件
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    formData.append('overwrite', 'true');

    console.log('DEBUG: Uploading', files.length, 'files to adapted endpoint');

    // 使用适配的批量上传端点
    const response = await axios.post(
      `${API_URL}/students/bulk-upload-units-adapted`,  // 使用适配的批量端点
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 
      }
    );

    toast.dismiss();
    console.log('DEBUG: Bulk upload response:', response.data);

    // 处理结果显示
    const data = response.data;
    let successCount = 0;
    let errorCount = 0;

    let message = `📊 Bulk Upload Completed!\n\n`;
    message += `📁 Total Files: ${data.summary.total_files}\n`;
    message += `✅ Successful: ${data.summary.successful_files}\n`;
    message += `❌ Failed: ${data.summary.failed_files}\n\n`;

    // 显示每个文件的结果
    data.results.forEach((result: any) => {
      if (result.status === 'success') {
        successCount++;
        message += `✅ ${result.filename}\n`;
        message += `   Student ID: ${result.student_id}, Units: ${result.units_processed}\n\n`;
      } else {
        errorCount++;
        message += `❌ ${result.filename}: ${result.message}\n\n`;
      }
    });

    message += `Total Units Processed: ${data.summary.total_units_processed || 0}`;

    alert(message);

    if (successCount > 0) {
      toast.success(`Successfully processed ${successCount} files`);
      await fetchStudents(); // 刷新学生列表
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} files failed to process`);
    }

  } catch (err: any) {
    toast.dismiss();
    console.error('Bulk upload error:', err);
    
    let errorMessage = 'Bulk upload failed';
    if (axios.isAxiosError(err)) {
      errorMessage = err.response?.data?.detail || err.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setUploadingBulkUnits(false);
    if (e.target) e.target.value = '';
  }
};

  // 批量更新所有学生的单元数据
// 批量更新所有学生的单元数据
// 批量更新所有学生的单元数据
const handleBulkUpdateAllStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  try {
    setUploadingBulkUnits(true);
    toast.loading('Starting bulk update for all students...');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('overwrite', 'true');

    // 使用新的批量上传接口
    const response = await axios.post(
      `${API_URL}/students/bulk-upload-units`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 
      }
    );

    console.log('DEBUG: Bulk upload response:', response.data);
    
    toast.dismiss();
    
    // 显示结果
    const data = response.data;
    let message = `Bulk Update Completed!\n\n`;
    message += `📁 Total Files: ${data.summary.total_files}\n`;
    message += `✅ Successful: ${data.summary.successful_files}\n`;
    message += `❌ Failed: ${data.summary.failed_files}\n`;
    
    if (data.summary.total_units_processed) {
      message += `📚 Total Units Processed: ${data.summary.total_units_processed}\n`;
    }

    // 显示每个文件的结果
    if (data.results && data.results.length > 0) {
      data.results.forEach((result: any) => {
        if (result.status === 'success') {
          message += `\n✅ ${result.filename}: ${result.message}`;
          if (result.student_id) {
            message += ` (Student ID: ${result.student_id})`;
          }
        } else {
          message += `\n❌ ${result.filename}: ${result.message}`;
        }
      });
    }

    alert(message);

    if (data.summary.successful_files > 0) {
      toast.success(`Updated ${data.summary.successful_files} files successfully`);
      await fetchStudents(); // 刷新学生列表
    }

  } catch (err: any) {
    toast.dismiss();
    console.error('Bulk update error:', err);
    
    let errorMessage = 'Bulk update failed';
    if (axios.isAxiosError(err)) {
      errorMessage = err.response?.data?.detail || err.message;
    }
    toast.error(errorMessage);
  } finally {
    setUploadingBulkUnits(false);
    if (e.target) e.target.value = '';
  }
};

  // 添加表检查函数
  const checkStudentUnitsTable = async () => {
    try {
      const response = await axios.get(`${API_URL}/debug/check-student-units-table`);
      console.log('DEBUG: Table check result:', response.data);
      alert(`Table Status: ${response.data.table_status}\nTest Insert: ${response.data.test_insert}`);
    } catch (err) {
      console.error('DEBUG: Table check failed:', err);
      alert('Table check failed - see console for details');
    }
  };

  const handleBulkUnitsUploadFixed = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  try {
    setUploadingBulkUnits(true);
    toast.loading('Uploading files with fixed processor...');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('overwrite', 'true');

    const response = await axios.post(
      `${API_URL}/students/bulk-upload-units-fixed`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 
      }
    );

    toast.dismiss();
    console.log('DEBUG: Fixed upload response:', response.data);

    // 处理结果显示
    const data = response.data;
    let message = `Fixed Bulk Upload Results:\n\n`;
    
    data.results.forEach((result: any) => {
      if (result.status === 'success') {
        message += `✅ ${result.filename}: ${result.message}\n`;
        message += `   Student: ${result.student_id}, Units: ${result.units_processed}, Credits: ${result.total_credits}\n`;
      } else if (result.status === 'partial') {
        message += `⚠️ ${result.filename}: ${result.message}\n`;
        message += `   Student: ${result.student_id}, Units: ${result.units_processed}\n`;
      } else {
        message += `❌ ${result.filename}: ${result.message}\n`;
      }
    });

    message += `\nSummary: ${data.message}`;
    
    alert(message);

    if (data.summary.successful_files > 0) {
      toast.success(`Successfully processed ${data.summary.successful_files} files`);
      await fetchStudents();
    }

  } catch (err: any) {
    toast.dismiss();
    console.error('Fixed upload error:', err);
    
    let errorMessage = 'Upload failed';
    if (axios.isAxiosError(err)) {
      errorMessage = err.response?.data?.detail || err.message;
    }
    
    toast.error(errorMessage);
  } finally {
    setUploadingBulkUnits(false);
    if (e.target) e.target.value = '';
  }
};

// 更新前端的 handleFileUpload 函数
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, studentId: number) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    toast.loading('Uploading units file...');

    // 验证学生存在
    const studentCheck = await axios.get(`${API_URL}/students/${studentId}`);
    if (!studentCheck.data) {
      toast.dismiss();
      toast.error('Student does not exist. Please create the profile first.');
      return;
    }

    const studentName = studentCheck.data.student_name;

    // 验证文件类型和大小
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.dismiss();
      toast.error('Only Excel files (.xlsx, .xls) are supported.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.dismiss();
      toast.error('File exceeds 10MB size limit.');
      return;
    }

    // 确认上传
    const overwrite = window.confirm(
      `Upload units for ${studentName} (ID: ${studentId})?\n\n` +
      'This will REPLACE all existing units for this student.\n\n' +
      'Click OK to continue, Cancel to abort.'
    );

    if (!overwrite) {
      toast.dismiss();
      return;
    }

    // 使用适配的上传端点
    const formData = new FormData();
    formData.append('file', file);
    formData.append('overwrite', 'true');

    const response = await axios.post(
      `${API_URL}/students/${studentId}/upload-units-adapted`,  // 使用适配端点
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' }, 
        timeout: 30000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            toast.loading(`Uploading: ${percentCompleted}%`);
          }
        }
      }
    );

    toast.dismiss();
    
    // 显示成功信息
    const data = response.data;
    toast.success(data.message);
    
    alert(`✅ ${data.message}\nStudent: ${data.student_name}\nTotal Credits: ${data.total_credits}`);

    // 刷新学生列表和学分
    await fetchStudents();

  } catch (err) {
    toast.dismiss();
    
    let errorMessage = 'Upload failed';
    
    if (axios.isAxiosError(err)) {
      const serverMessage = err.response?.data?.detail || err.message;
      errorMessage = `Upload failed: ${serverMessage}`;

      if (err.response?.status === 404) {
        errorMessage = 'Student not found';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid data format in Excel file';
      } else if (err.response?.status === 413) {
        errorMessage = 'File too large';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout';
      }
    }

    toast.error(errorMessage);
    console.error('File upload error:', err);
  } finally {
    if (e.target) e.target.value = '';
  }
};

  // 把你组件里的 `return ( ... )` 整段替换为下面内容
return (
  <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
    <h1 className="text-3xl font-bold mb-6 text-[#E31C25]">Student Management</h1>

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

    {/* Students Table */}
    <div className="bg-white rounded-lg shadow-md overflow-x-auto border border-gray-200">
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
          {(searchResults.length > 0 ? searchResults : students).map((student) => (
            <tr key={student.student_id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 rounded text-white text-sm font-semibold ${
                    student.graduation_status ? 'bg-green-600' : 'bg-gray-400'
                  }`}
                >
                  {student.graduation_status ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="px-6 py-4">{student.student_name}</td>
              <td className="px-6 py-4">{student.student_id}</td>
              <td className="px-6 py-4">{student.student_email}</td>
              <td className="px-6 py-4">{student.student_course}</td>
              <td className="px-6 py-4">{student.student_major}</td>
              <td className="px-6 py-4">{student.intake_term}</td>
              <td className="px-6 py-4">{student.intake_year}</td>
              <td className="px-6 py-4">{student.credit_point}</td>
              <td className="px-6 py-4 flex gap-2">
                <button onClick={() => { setEditingId(student.id); setFormData({ graduation_status: student.graduation_status, student_name: student.student_name, student_id: student.student_id, student_email: student.student_email, student_course: student.student_course, student_major: student.student_major, intake_term: student.intake_term, intake_year: student.intake_year, credit_point: student.credit_point }); }} className="text-black px-2 py-1 rounded border border-gray-200 hover:bg-red-50" >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(student.student_id)}
                  className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
                >
                  Delete
                </button>
                <button
                  onClick={() => checkGraduation(student.student_id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Check Grad
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Bulk Upload Section */}
    <div className="bg-white p-6 rounded-lg shadow-md mt-6 border border-[#E31C25]/40">
      <h2 className="text-xl font-semibold mb-4 text-[#E31C25]">Bulk Upload Students</h2>
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleUploadStudents}
          disabled={uploadingStudents}
          className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-[#E31C25] text-black"
        />
        <button
          onClick={() => document.getElementById('bulk-file-input')?.click()}
          className="px-4 py-2 bg-[#E31C25] text-white rounded hover:bg-[#B71C1C]"
        >
          Upload
        </button>
      </div>
    </div>

        {/* 统一的批量上传部分 */}
<div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#E31C25]/20">
  <h2 className="text-xl font-semibold mb-4 text-[#E31C25]">Bulk Upload Student Units</h2>
  
  <div className="flex gap-4 items-center mb-4">
    <div className="relative flex-grow">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleBulkUnitsUpload}
        disabled={uploadingBulkUnits}
        className="hidden"
        id="bulk-units-upload"
        multiple
      />
      <label
        htmlFor="bulk-units-upload"
        className={`block w-full p-3 rounded cursor-pointer border-2 border-dashed ${
          uploadingBulkUnits 
            ? 'bg-gray-100 border-gray-300 text-gray-500' 
            : 'bg-white border-[#E31C25]/60 hover:border-[#E31C25] hover:bg-[#FDECEA] text-black'
        } transition-colors text-center`}
      >
        {uploadingBulkUnits ? 'Uploading...' : 'Choose Multiple Excel Files for Bulk Upload'}
      </label>
    </div>
  </div>

  {/* 文件命名指南 */}
  <div className="mt-4 p-4 bg-[#FDECEA] rounded border border-[#E31C25]/30">
    <h4 className="font-semibold text-[#E31C25] mb-2">✅ File Requirements (Adapted for Current Database):</h4>
    <ul className="text-sm text-[#B71C1C] space-y-1">
      <li>• <strong>Required columns:</strong> Course, Status</li>
      <li>• <strong>Optional columns:</strong> Course Title, Grade, Credits, Earned, Term</li>
      <li>• <strong>Student ID:</strong> Must be included in filename (e.g., <code className="bg-white px-1 rounded">12345.xlsx</code>)</li>
      <li>• <strong>Database compatibility:</strong> Uses only existing columns: student_id, unit_code, unit_name, grade, completed</li>
    </ul>
  </div>
</div>

  </div>
);
}