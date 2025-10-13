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
const checkGraduation = async (studentId: number) => {
  try {
    const response = await axios.put(`${API_URL}/students/${studentId}/graduate`);
    const data = response.data;
    console.log('DEBUG: graduation PUT response raw:', data);

    // 兼容两种后端返回格式：
    // 1) { graduation_result: {...}, updated_student: {...} }
    // 2) { can_graduate, total_credits, ... }  <- 旧格式
    const gradResult = data?.graduation_result ?? data;
    const updatedStudent = data?.updated_student ?? null;

    if (!gradResult) {
      console.warn('DEBUG: graduation result missing in response', data);
      toast.error('毕业检查返回格式异常，请查看控制台。');
      return;
    }

    // 用后端返回的真实 student（如果存在）更新本地 state
    if (updatedStudent && typeof updatedStudent === 'object') {
      setStudents(prev =>
        prev.map(s =>
          s.student_id === studentId
            ? { ...s, credit_point: updatedStudent.credit_point, graduation_status: updatedStudent.graduation_status }
            : s
        )
      );
      console.log('DEBUG: Local state updated from updated_student:', updatedStudent);
    } else {
      // 没有返回 updated_student：用 gradResult 填回页面（回退方案）
      setStudents(prev =>
        prev.map(s =>
          s.student_id === studentId
            ? { ...s, credit_point: gradResult.total_credits ?? s.credit_point, graduation_status: !!gradResult.can_graduate }
            : s
        )
      );
      console.log('DEBUG: Local state updated from graduation_result:', {
        credit_point: gradResult.total_credits,
        graduation_status: gradResult.can_graduate
      });
    }

    // 显示信息（使用 gradResult，不管是哪种格式）
    if (gradResult.can_graduate) {
      toast.success('Graduation Approved');
      alert(`✅ Graduation Approved!\nStudy Plan: ${gradResult.planner_info || 'Unknown'}\nTotal Credits: ${gradResult.total_credits}/300`);
    } else {
      let message = `❌ Not Eligible for Graduation\n\n`;
      message += `Study Plan: ${gradResult.planner_info || 'Unknown'}\n\n`;
      message += `Total Credits: ${gradResult.total_credits ?? 'N/A'}/300\n`;
      message += `Core Units Completed: ${gradResult.core_completed ?? 'N/A'}\n`;
      message += `Major Units Completed: ${gradResult.major_completed ?? 'N/A'}\n\n`;

      if (Array.isArray(gradResult.missing_core_units) && gradResult.missing_core_units.length > 0) {
        message += `Missing Core Units (${gradResult.missing_core_units.length}):\n${gradResult.missing_core_units.join(', ')}\n\n`;
      } else {
        message += `✅ All Core Units Completed\n\n`;
      }

      if (Array.isArray(gradResult.missing_major_units) && gradResult.missing_major_units.length > 0) {
        message += `Missing Major Units (${gradResult.missing_major_units.length}):\n${gradResult.missing_major_units.join(', ')}`;
      } else {
        message += `✅ All Major Units Completed`;
      }

      alert(message);
    }

    // （可选）再次 fetch 整个学生列表以保证完全同步（视情况取消注释）
    // await fetchStudents();

  } catch (err) {
    console.error('Graduation check error (frontend):', err);
    if (axios.isAxiosError(err)) {
      console.log('DEBUG: error.response:', err.response?.status, err.response?.data);
    }
    toast.error('Graduation check failed. See console/network for details.');
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
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    studentId: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 显示上传状态
      toast.loading('Uploading units file...');

      // 1. 验证学生存在性
      const studentCheck = await axios.get(`${API_URL}/students/${studentId}`);
      if (!studentCheck.data) {
        toast.dismiss();
        toast.error('Student does not exist. Please create the profile first.');
        return;
      }

      const studentName = studentCheck.data.student_name;

      // 2. 验证文件类型和大小
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

      // 3. 询问用户如何处理现有数据
      const overwrite = window.confirm(
        `Upload units for ${studentName} (ID: ${studentId})?\n\n` +
        'This will REPLACE all existing units for this student.\n\n' +
        'Click OK to continue, Cancel to abort.'
      );

      if (!overwrite) {
        toast.dismiss();
        toast(`Found ${unmatchedFiles.length} file(s) that need manual student assignment`);
        return;
      }

      // 4. 上传文件
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', 'true');

      const response = await axios.post(
        `${API_URL}/students/${studentId}/upload-units`,
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
      toast.success(response.data.message);
      
      // 显示详细信息
      const unitCount = response.data.message.match(/\d+/)?.[0] || 'some';
      alert(`✅ Successfully uploaded ${unitCount} units for ${studentName}`);

      // 5. 刷新学生列表和学分
      await fetchStudents();

    } catch (err) {
      toast.dismiss();
      
      let errorMessage = 'Upload failed';
      
      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.detail || err.message;
        errorMessage = `Upload failed: ${serverMessage}`;

        if (err.response?.status === 404) {
          errorMessage = 'Associated student not found';
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid data format in Excel file';
        } else if (err.response?.status === 413) {
          errorMessage = 'File too large: Please upload a file smaller than 10MB';
        } else if (err.code === 'ECONNABORTED') {
          errorMessage = 'Upload timeout: Please try again with a smaller file';
        }
      }

      toast.error(errorMessage);
      console.error('File upload error:', err);
    } finally {
      // 重置文件输入
      if (e.target) e.target.value = '';
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
  const handleBulkUnitsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingBulkUnits(true);
      setBulkUnitsResults([]);
      setUnmatchedFiles([]);

      const formData = new FormData();
      const fileStudentMapping: { [filename: string]: string } = {};

      // 第一步：收集文件并尝试从文件名提取学生ID
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        formData.append('files', file);
        
        // 从文件名提取学生ID
        const extractedId = extractStudentIdFromFilename(file.name);
        fileStudentMapping[file.name] = extractedId;
      }

      // 发送到后端进行解析
      const response = await axios.post(
        `${API_URL}/students/bulk-upload-units`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000 
        }
      );

      console.log('DEBUG: Bulk upload response:', response.data);
      setBulkUnitsResults(response.data.results);

      // 处理匹配逻辑
      const successfulFiles = response.data.results.filter((r: any) => r.status === 'success');
      const unmatched: Array<{ filename: string; extractedStudentId: string; units: any[] }> = [];
      const matchedAssignments: Array<{ studentId: number; units: any[] }> = [];

      for (const fileResult of successfulFiles) {
        const filename = fileResult.filename;
        const extractedId = fileStudentMapping[filename];
        const fileUnits = fileResult.data?.units || [];

        if (extractedId) {
          // 尝试查找匹配的学生
          const matchedStudent = students.find(s => 
            s.student_id.toString() === extractedId
          );

          if (matchedStudent) {
            // 自动匹配成功
            matchedAssignments.push({
              studentId: matchedStudent.student_id,
              units: fileUnits
            });
            console.log(`DEBUG: Auto-matched file ${filename} to student ${matchedStudent.student_id}`);
          } else {
            // 没有找到匹配的学生
            unmatched.push({
              filename,
              extractedStudentId: extractedId,
              units: fileUnits
            });
          }
        } else {
          // 无法从文件名提取学生ID
          unmatched.push({
            filename,
            extractedStudentId: '',
            units: fileUnits
          });
        }
      }

      // 处理自动匹配的文件
      if (matchedAssignments.length > 0) {
        let totalAssigned = 0;
        for (const assignment of matchedAssignments) {
          try {
            await assignUnitsToStudentDirect(assignment.studentId, assignment.units);
            totalAssigned += assignment.units.length;
          } catch (error) {
            console.error(`Failed to assign units to student ${assignment.studentId}:`, error);
          }
        }
        toast.success(`Automatically assigned ${totalAssigned} units to ${matchedAssignments.length} student(s)`);
      }

      // 处理未匹配的文件
      if (unmatched.length > 0) {
        setUnmatchedFiles(unmatched);
        setShowUnitAssignment(true);
        
        // 收集所有未匹配的单元用于显示
        const allPendingUnits = unmatched.flatMap(file => file.units);
        setPendingUnits(allPendingUnits);
        
        toast(`Found ${unmatched.length} file(s) that need manual student assignment`);
      }

      // 显示汇总结果
      const data = response.data;
      let message = `📊 Bulk Upload Completed!\n\n`;
      message += `📁 Total Files: ${data.summary.total_files}\n`;
      message += `✅ Successful: ${data.summary.successful_files}\n`;
      message += `❌ Failed: ${data.summary.failed_files}\n`;
      message += `🎯 Auto-matched: ${matchedAssignments.length} files\n`;
      message += `❓ Need Manual Assignment: ${unmatched.length} files\n`;
      message += `📚 Total Units Processed: ${data.summary.total_units_processed}\n\n`;

      if (unmatched.length === 0 && data.summary.successful_files > 0) {
        toast.success('All files were automatically matched and assigned!');
      }

    } catch (err: any) {
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

  // 直接分配单元到学生的函数（不通过模态框）
  const assignUnitsToStudentDirect = async (studentId: number, units: any[]) => {
    try {
      const response = await axios.post(
        `${API_URL}/students/${studentId}/assign-bulk-units`,
        {
          units: units,
          overwrite: true
        }
      );
      return response.data;
    } catch (err: any) {
      console.error('Direct unit assignment error:', err);
      throw err;
    }
  };

  // 手动分配未匹配文件的单元
  const assignUnmatchedFilesToStudent = async () => {
    if (!selectedStudentForUnits) {
      toast.error('Please select a student first');
      return;
    }

    if (unmatchedFiles.length === 0) {
      toast.error('No unmatched files to assign');
      return;
    }

    try {
      setUploadingBulkUnits(true);
      
      // 收集所有未匹配文件的单元
      const allUnits = unmatchedFiles.flatMap(file => file.units);
      
      // 数据验证和清理
      const validatedUnits = allUnits
        .filter(unit => unit.unit_code && unit.unit_code.toString().trim() !== '')
        .map(unit => ({
          unit_code: unit.unit_code.toString().trim(),
          unit_name: unit.unit_name?.toString().trim() || `Unit ${unit.unit_code}`,
          grade: (unit.grade?.toString().trim() || '').toUpperCase(),
          completed: Boolean(unit.completed),
          credits: Number(unit.credits) || 12.5,
          earned_credits: Number(unit.earned_credits) || (unit.completed ? (Number(unit.credits) || 12.5) : 0),
          term: unit.term?.toString().trim() || '',
          status: unit.status?.toString().trim() || ''
        }));
      
      console.log('DEBUG: Validated units data:', {
        studentId: selectedStudentForUnits,
        originalCount: allUnits.length,
        validatedCount: validatedUnits.length,
        sampleUnit: validatedUnits[0]
      });
      
      const response = await axios.post(
        `${API_URL}/students/${selectedStudentForUnits}/assign-bulk-units`,
        {
          units: validatedUnits,
          overwrite: true
        },
        {
          timeout: 120000, // 增加到2分钟超时
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('DEBUG: Manual units assignment result:', response.data);
      
      if (response.data.insertion_errors && response.data.insertion_errors.length > 0) {
        toast.success(`Assigned ${response.data.inserted_count} units (with ${response.data.insertion_errors.length} batch errors)`);
        console.warn('DEBUG: Batch insertion errors:', response.data.insertion_errors);
      } else {
        toast.success(`Successfully assigned ${response.data.inserted_count} units to student`);
      }
      
      // 重置状态
      setShowUnitAssignment(false);
      setSelectedStudentForUnits(null);
      setPendingUnits([]);
      setUnmatchedFiles([]);
      setBulkUnitsResults([]);
      
      // 刷新学生列表
      await fetchStudents();
      
    } catch (err: any) {
      console.error('Manual unit assignment error:', err);
      
      let errorMessage = 'Failed to assign units to student';
      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.detail || err.message;
        errorMessage = `Assignment failed: ${serverMessage}`;
        
        // 显示更详细的错误信息
        if (err.response?.status === 500) {
          errorMessage += ' - Check backend console for detailed error logs';
        }
        
        console.error('DEBUG: Full error response:', err.response?.data);
      }
      
      toast.error(errorMessage);
    } finally {
      setUploadingBulkUnits(false);
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

  // 把你组件里的 `return ( ... )` 整段替换为下面内容
return (
  <div className="max-w-6xl mx-auto p-6">
    <h1 className="text-3xl font-extrabold mb-6 text-black">Student Management</h1>

    {/* Student Form */}
    {/* <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 border-2 border-red-600">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.graduation_status || false}
            onChange={(e) => setFormData({ ...formData, graduation_status: e.target.checked })}
            className="mr-2 accent-red-600"
          />
          <label className="text-black">Graduation Status</label>
        </div>

        <input
          type="text"
          placeholder="Full Name"
          value={formData.student_name}
          onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
        <input
          type="number"
          placeholder="Student ID"
          value={formData.student_id}
          onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
          disabled={!!editingId}
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.student_email}
          onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
        <input
          type="text"
          placeholder="Course"
          value={formData.student_course}
          onChange={(e) => setFormData({ ...formData, student_course: e.target.value })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
        <input
          type="text"
          placeholder="Major"
          value={formData.student_major}
          onChange={(e) => setFormData({ ...formData, student_major: e.target.value })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
        <input
          type="text"
          placeholder="Intake Term"
          value={formData.intake_term}
          onChange={(e) => setFormData({ ...formData, intake_term: e.target.value })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
        <input
          type="text"
          placeholder="Intake Year"
          value={formData.intake_year}
          onChange={(e) => setFormData({ ...formData, intake_year: e.target.value })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
        <input
          type="number"
          step="0.5"
          placeholder="Credit Points"
          value={formData.credit_point}
          onChange={(e) => setFormData({ ...formData, credit_point: Number(e.target.value) })}
          className="p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 text-black"
          required
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-red-700 text-white rounded shadow hover:bg-red-800 transition"
        >
          {editingId ? 'Update Student' : 'Add Student'}
        </button>

        <button
          type="button"
          onClick={() => { setFormData({
             graduation_status: false,
             student_name: '',
             student_id: 0,
             student_email: '',
             student_course: '',
             student_major: '',
             intake_term: '',
             intake_year: '',
             credit_point: 0
           }); setEditingId(null); }}
          className="px-4 py-2 bg-black text-white rounded shadow hover:brightness-90 transition"
        >
          Reset
        </button>
      </div>
    </form>Bulk Update All Students Section */}
    {/* Search Section */}
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-red-100">
      <h2 className="text-xl font-semibold mb-4 text-black">Search Student by ID</h2>
      <div className="flex gap-4">
        <input
          type="number"
          placeholder="Enter Student ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border rounded flex-grow border-gray-300 focus:ring-2 focus:ring-red-300 text-black"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-60"
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
      <table className="min-w-full">
        <thead className="bg-black">
          <tr>
            <th className="px-6 py-3 text-left text-white">Graduated</th>
            <th className="px-6 py-3 text-left text-white">Name</th>
            <th className="px-6 py-3 text-left text-white">Student ID</th>
            <th className="px-6 py-3 text-left text-white">Email</th>
            <th className="px-6 py-3 text-left text-white">Course</th>
            <th className="px-6 py-3 text-left text-white">Major</th>
            <th className="px-6 py-3 text-left text-white">Intake Term</th>
            <th className="px-6 py-3 text-left text-white">Intake Year</th>
            <th className="px-6 py-3 text-left text-white">Credit Points</th>
            <th className="px-6 py-3 text-left text-white">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {(searchResults.length > 0 ? searchResults : students).map((student) => (
            <tr key={student.id} className="hover:bg-red-50 transition">
              <td className="px-6 py-4 text-black">{student.graduation_status ? '✅' : '❌'}</td>
              <td className="px-6 py-4 text-black">{student.student_name}</td>
              <td className="px-6 py-4 text-black">{student.student_id}</td>
              <td className="px-6 py-4 text-black">{student.student_email}</td>
              <td className="px-6 py-4 text-black">{student.student_course}</td>
              <td className="px-6 py-4 text-black">{student.student_major}</td>
              <td className="px-6 py-4 text-black">{student.intake_term}</td>
              <td className="px-6 py-4 text-black">{student.intake_year}</td>
              <td className="px-6 py-4 text-black">{student.credit_point}</td>
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
                    className="text-red-700 hover:underline cursor-pointer"
                  >
                    Upload Units
                  </label>
                </div>

                <button
                  onClick={() => checkGraduation(student.student_id)}
                  className="text-black bg-white px-2 py-1 rounded border border-gray-200 hover:bg-red-50"
                >
                  Check
                </button>

                <Link
                  href={`/student-units/${student.student_id}`}
                  className="text-black underline"
                >
                  Details
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
                  className="text-black px-2 py-1 rounded border border-gray-200 hover:bg-red-50"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(student.id)}
                  className="text-white bg-red-700 px-2 py-1 rounded hover:bg-red-800"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {searchResults.length > 0 && (
        <div className="p-4 text-center text-black/70">
          Showing {searchResults.length} search result(s)
        </div>
      )}
    </div>
    {/* Bulk Update All Students Section */}
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-red-100">
      <h2 className="text-xl font-semibold mb-4 text-black">Bulk Update All Students' Units</h2>
      <div className="flex gap-4 items-center">
        <div className="relative flex-grow">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleBulkUpdateAllStudents}
            disabled={uploadingBulkUnits}
            className="hidden"
            id="bulk-update-all-students"
            multiple
          />
          <label
            htmlFor="bulk-update-all-students"
            className={`block w-full p-2 rounded cursor-pointer border ${uploadingBulkUnits ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-red-50'} text-black`}
          >
            {uploadingBulkUnits ? 'Updating...' : 'Update All Students from Excel Files'}
          </label>
        </div>
        <div className="text-sm text-black/80">
          <p><strong>Note:</strong> Files will be automatically matched to students by filename</p>
          <p><strong>Format:</strong> StudentID.xlsx or StudentID_Name.xlsx</p>
        </div>
      </div>
    </div>

    {/* Bulk Upload Completed Units Section */}
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-red-100">
      <h2 className="text-xl font-semibold mb-4 text-black">Bulk Upload Completed Units (Multiple Files)</h2>
      <div className="flex gap-4 items-center">
        <div className="relative flex-grow">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleBulkUnitsUpload}
            disabled={uploadingBulkUnits}
            className="hidden"
            id="bulk-units-upload-multi"
            multiple
          />
          <label
            htmlFor="bulk-units-upload-multi"
            className={`block w-full p-2 rounded cursor-pointer border ${uploadingBulkUnits ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-red-50'} text-black`}
          >
            {uploadingBulkUnits ? 'Uploading...' : 'Choose Multiple Excel Files for Bulk Units Upload'}
          </label>
        </div>

        <button
          onClick={checkStudentUnitsTable}
          className="px-4 py-2 bg-black text-white rounded hover:opacity-95 transition"
        >
          Check Database
        </button>
      </div>

      {/* 文件命名提示 */}
      <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
        <h4 className="font-semibold text-red-800 mb-2">File Naming Tips for Automatic Matching:</h4>
        <ul className="text-sm text-red-700 space-y-1">
          <li>• Use student ID as filename: <code className="bg-white px-1 rounded text-black">12345.xlsx</code></li>
          <li>• Or include student ID: <code className="bg-white px-1 rounded text-black">12345_John_Doe.xlsx</code></li>
          <li>• Supported formats: numbers only or letters+numbers</li>
          <li>• Files without student IDs will require manual assignment</li>
        </ul>
      </div>

      <div className="text-sm text-black/75 mt-3">
        <p><strong>Supported columns:</strong> Course, Course Title, Status, Grade, Term, Credits, Earned</p>
        <p><strong>Required:</strong> Course, Status</p>
      </div>

      {/* Upload Results */}
      {bulkUnitsResults.length > 0 && (
        <div className="mt-4 p-4 bg-white rounded border border-gray-200">
          <h3 className="font-semibold mb-2 text-black">Upload Results:</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {bulkUnitsResults.map((result, index) => (
              <div key={index} className={`p-2 rounded text-sm ${result.status === 'success' ? 'bg-white border border-green-200 text-black' : 'bg-white border border-red-200 text-black'}`}>
                <strong className="text-black">{result.filename}:</strong> <span className="text-black/80">{result.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Unit Assignment Modal */}
    {showUnitAssignment && (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-red-600">
          <h2 className="text-xl font-bold mb-4 text-black">Assign Units to Student</h2>
          
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-black">Unmatched Files ({unmatchedFiles.length} files):</h3>
            <div className="space-y-2 mb-4">
              {unmatchedFiles.map((file, index) => (
                <div key={index} className="p-3 bg-white rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-black">{file.filename}</strong>
                      {file.extractedStudentId && (
                        <span className="ml-2 text-sm text-black/70">(Extracted ID: {file.extractedStudentId})</span>
                      )}
                      {!file.extractedStudentId && (
                        <span className="ml-2 text-sm text-red-600">(No student ID in filename)</span>
                      )}
                    </div>
                    <span className="text-sm text-black/60">{file.units.length} units</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-black">Select Student for All Unmatched Files:</label>
            <select
              value={selectedStudentForUnits || ''}
              onChange={(e) => setSelectedStudentForUnits(Number(e.target.value))}
              className="w-full p-2 border rounded border-gray-300 text-black"
            >
              <option value="">Choose a student...</option>
              {students.map((student) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.student_name} (ID: {student.student_id})
                </option>
              ))}
            </select>
            <p className="text-sm text-black/60 mt-1">
              All {unmatchedFiles.length} unmatched files will be assigned to the selected student.
            </p>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-black">Units to Assign ({pendingUnits.length} units total):</h3>
            <div className="max-h-60 overflow-y-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-white border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-black">Code</th>
                    <th className="px-3 py-2 text-left text-black">Name</th>
                    <th className="px-3 py-2 text-left text-black">Status</th>
                    <th className="px-3 py-2 text-left text-black">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUnits.slice(0, 20).map((unit, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-1 text-black">{unit.unit_code}</td>
                      <td className="px-3 py-1 text-black">{unit.unit_name}</td>
                      <td className="px-3 py-1">
                        <span className={`px-2 py-1 rounded text-xs ${unit.completed ? 'bg-black text-white' : 'bg-red-100 text-red-800'}`}>
                          {unit.completed ? 'Completed' : 'Not Completed'}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-black">{unit.grade || '-'}</td>
                    </tr>
                  ))}
                  {pendingUnits.length > 20 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-center text-black/60">
                        ... and {pendingUnits.length - 20} more units
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowUnitAssignment(false);
                setSelectedStudentForUnits(null);
                setPendingUnits([]);
                setUnmatchedFiles([]);
              }}
              className="px-4 py-2 bg-black text-white rounded hover:opacity-95"
            >
              Cancel
            </button>
            <button
              onClick={assignUnmatchedFilesToStudent}
              disabled={!selectedStudentForUnits || uploadingBulkUnits}
              className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-60"
            >
              {uploadingBulkUnits ? 'Assigning...' : `Assign ${unmatchedFiles.length} Files to Student`}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Upload Students Section */}
    <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-red-100">
      <h2 className="text-xl font-semibold mb-4 text-black">Upload Students from Excel</h2>
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
            className={`block w-full p-2 rounded cursor-pointer border ${uploadingStudents ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-red-50'} text-black`}
          >
            {uploadingStudents ? 'Uploading...' : 'Choose Excel File'}
          </label>
        </div>
        <div className="text-sm text-black/70">
          <p>Required columns: Name, Id, Email, Course, Major, Intake Term, Intake Year</p>
        </div>
      </div>
    </div>

    

    
  </div>
);
}