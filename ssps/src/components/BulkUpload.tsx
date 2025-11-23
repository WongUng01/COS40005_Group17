// app/students/bulk-upload/page.tsx
'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const MAX_FILE_SIZE_MB = 10;

type UploadResult = {
  type: 'students' | 'units';
  data: any;
};

type PreviewData = {
  filename: string;
  data: any[];
  headers: string[];
  rowCount: number;
  type: 'students' | 'units';
};

type UploadOperation = {
  id: string;
  type: 'students' | 'units';
  filename: string;
  timestamp: Date;
  data: any;
};

export default function BulkUploadPage() {
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [uploadingBulkUnits, setUploadingBulkUnits] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; type: 'students' | 'units' } | null>(null);
  const [recentOperations, setRecentOperations] = useState<UploadOperation[]>([]);
  
  const studentFileInputRef = useRef<HTMLInputElement>(null);
  const unitsFileInputRef = useRef<HTMLInputElement>(null);
  
  const API_URL = "http://127.0.0.1:8000";

  // Download template functions
  const downloadStudentTemplate = () => {
    const templateData = [
      {
        'Student ID': '123456',
        'Student Name': 'John Doe',
        'Student Email': 'john.doe@student.swinburne.edu.my',
        'Student Course': 'Bachelor of Computer Science',
        'Student Major': 'Data Science',
        'Intake Term': 'Feb/Mar',
        'Intake Year': '2024',
        'Student Type': 'malaysian',
        'Has SPM BM Credit': 'TRUE',
        'Credit Points': '0',
        'Graduation Status': 'FALSE'
      },
      {
        'Student ID': '123457',
        'Student Name': 'Jane Smith',
        'Student Email': 'jane.smith@student.swinburne.edu.my',
        'Student Course': 'Bachelor of Business',
        'Student Major': 'Marketing',
        'Intake Term': 'Aug/Sep',
        'Intake Year': '2024',
        'Student Type': 'international',
        'Has SPM BM Credit': 'FALSE',
        'Credit Points': '0',
        'Graduation Status': 'FALSE'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Template');
    
    // Auto-size columns
    const colWidths = [
      { wch: 12 }, // Student ID
      { wch: 20 }, // Student Name
      { wch: 35 }, // Student Email
      { wch: 30 }, // Student Course
      { wch: 20 }, // Student Major
      { wch: 10 }, // Intake Term
      { wch: 10 }, // Intake Year
      { wch: 15 }, // Student Type
      { wch: 18 }, // Has SPM BM Credit
      { wch: 12 }, // Credit Points
      { wch: 18 }  // Graduation Status
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'student_bulk_upload_template.xlsx');
    toast.success('Student template downloaded successfully');
  };

  const downloadUnitsTemplate = () => {
    const templateData = [
      {
        'Course': 'ICT10001',
        'Course Title': 'Introduction to Programming',
        'Status': 'Completed',
        'Grade': 'HD',
        'Credits': '12.5',
        'Earned': 'YES',
        'Term': '2022_FEB_S1'
      },
      {
        'Unit Code': 'ICT10002',
        'Unit Name': 'Database Fundamentals',
        'Status': 'Enrolled',
        'Grade': '',
        'Credits': '12.5',
        'Earned': 'NO',
        'Term': '2022_FEB_S2'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Units Template');
    
    // Auto-size columns
    const colWidths = [
      { wch: 12 }, // Unit Code
      { wch: 25 }, // Unit Name
      { wch: 12 }, // Status
      { wch: 8 },  // Grade
      { wch: 10 }, // Credits
      { wch: 8 },  // Earned
      { wch: 10 }  // Term
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, 'units_bulk_upload_template.xlsx');
    toast.success('Units template downloaded successfully');
  };

  // Preview file function
  const previewFile = async (file: File, type: 'students' | 'units') => {
    try {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Only Excel files are supported.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`File exceeds ${MAX_FILE_SIZE_MB}MB size limit.`);
        return;
      }

      const data = await readExcelFile(file);
      const headers = Object.keys(data[0] || {});
      
      setPreviewData({
        filename: file.name,
        data: data.slice(0, 5), // Show first 5 rows for preview
        headers,
        rowCount: data.length,
        type
      });
      
      setPendingUpload({ file, type });
      setShowPreviewModal(true);
      
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Failed to preview file');
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsBinaryString(file);
    });
  };

  // Handle file selection with preview
  const handleStudentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await previewFile(file, 'students');
  };

  const handleUnitsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // For multiple files, preview the first one
    await previewFile(files[0], 'units');
  };

  // Confirm upload after preview
  const confirmUpload = async () => {
    if (!pendingUpload) return;

    try {
      if (pendingUpload.type === 'students') {
        await performStudentsUpload(pendingUpload.file);
      } else {
        // For units, we need to get all files from the input
        const files = unitsFileInputRef.current?.files;
        if (files && files.length > 0) {
          await performUnitsUpload(files);
        }
      }
    } finally {
      setShowPreviewModal(false);
      setPendingUpload(null);
      setPreviewData(null);
    }
  };

  // Cancel upload from preview
  const cancelUpload = () => {
    setShowPreviewModal(false);
    setPendingUpload(null);
    setPreviewData(null);
    
    // Reset file inputs
    if (studentFileInputRef.current) studentFileInputRef.current.value = '';
    if (unitsFileInputRef.current) unitsFileInputRef.current.value = '';
    
    toast('Upload cancelled');
  };

  // Actual upload functions
  const performStudentsUpload = async (file: File) => {
    try {
      setUploadingStudents(true);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/api/upload-students`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000 
        }
      );

      console.log('DEBUG: Bulk upload response:', response.data);

      const data = response.data;
      
      // Store operation for undo
      const operation: UploadOperation = {
        id: Date.now().toString(),
        type: 'students',
        filename: file.name,
        timestamp: new Date(),
        data: data
      };
      setRecentOperations(prev => [operation, ...prev.slice(0, 4)]); // Keep last 5 operations
      
      // Store result and show modal
      setUploadResult({
        type: 'students',
        data: data
      });
      setShowResultModal(true);
      
      if (data.summary.inserted > 0) {
        toast.success(`Successfully created ${data.summary.inserted} new students`);
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
    }
  };

  const performUnitsUpload = async (files: FileList) => {
    try {
      setUploadingBulkUnits(true);
      toast.loading('Starting bulk upload...');

      const formData = new FormData();
      
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      formData.append('overwrite', 'true');

      console.log('DEBUG: Uploading', files.length, 'files to adapted endpoint');

      const response = await axios.post(
        `${API_URL}/students/bulk-upload-units-adapted`,
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000 
        }
      );

      toast.dismiss();
      console.log('DEBUG: Bulk upload response:', response.data);

      const data = response.data;
      
      // Store operation for undo
      const operation: UploadOperation = {
        id: Date.now().toString(),
        type: 'units',
        filename: `${files.length} files`,
        timestamp: new Date(),
        data: data
      };
      setRecentOperations(prev => [operation, ...prev.slice(0, 4)]);
      
      // Store result and show modal
      setUploadResult({
        type: 'units',
        data: data
      });
      setShowResultModal(true);

      if (data.summary.successful_files > 0) {
        toast.success(`Successfully processed ${data.summary.successful_files} files`);
      }

      if (data.summary.failed_files > 0) {
        toast.error(`${data.summary.failed_files} files failed to process`);
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
    }
  };

  // Undo operation (simplified - mainly for user awareness)
  const undoOperation = (operationId: string) => {
    const operation = recentOperations.find(op => op.id === operationId);
    if (!operation) return;

    toast.loading(`Reverting ${operation.type} upload...`);
    
    // Note: Actual undo would require API support to delete created records
    // For now, we just remove from recent operations and show message
    setTimeout(() => {
      setRecentOperations(prev => prev.filter(op => op.id !== operationId));
      toast.dismiss();
      toast.success(`Undo requested for ${operation.filename}. Please contact administrator for complete reversal.`);
    }, 2000);
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setUploadResult(null);
  };

  // Preview Modal Component
  const PreviewModal = () => {
    if (!showPreviewModal || !previewData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#E31C25]">
              File Preview - {previewData.filename}
            </h2>
            <button
              onClick={cancelUpload}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            <div className="mb-4">
              <p className="text-gray-600">
                Previewing first 5 rows of {previewData.rowCount} total rows. 
                Please verify the data before uploading.
              </p>
              <div className="mt-2 text-sm text-gray-500">
                <strong>File Type:</strong> {previewData.type === 'students' ? 'Students Data' : 'Units Data'} |
                <strong> Total Rows:</strong> {previewData.rowCount}
              </div>
            </div>

            {/* Data Table Preview */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th 
                        key={index}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {previewData.headers.map((header, colIndex) => (
                        <td 
                          key={colIndex}
                          className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate"
                          title={String(row[header] || '')}
                        >
                          {String(row[header] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewData.rowCount > 5 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                ... and {previewData.rowCount - 5} more rows
              </p>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={cancelUpload}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
            >
              Cancel Upload
            </button>
            <button
              onClick={confirmUpload}
              disabled={uploadingStudents || uploadingBulkUnits}
              className="flex-1 px-4 py-3 bg-[#E31C25] text-white rounded-lg hover:bg-[#B71C1C] font-medium disabled:opacity-50"
            >
              {uploadingStudents || uploadingBulkUnits ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Result Modal Component (unchanged, but included for completeness)
  const UploadResultModal = () => {
    if (!showResultModal || !uploadResult) return null;

    const renderStudentsResult = () => {
      const data = uploadResult.data;
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-[#E31C25] mb-2">Bulk Upload Completed!</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.summary.total_rows}</div>
              <div className="text-sm text-blue-700">Total Rows</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{data.summary.inserted}</div>
              <div className="text-sm text-green-700">Inserted</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{data.summary.skipped_existing}</div>
              <div className="text-sm text-yellow-700">Skipped</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{data.summary.errors}</div>
              <div className="text-sm text-red-700">Errors</div>
            </div>
          </div>

          {data.details.errors && data.details.errors.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Errors (first 5):</h4>
              <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                {data.details.errors.slice(0, 5).map((error: string, index: number) => (
                  <li key={index} className="text-red-600 text-sm">{error}</li>
                ))}
              </ul>
              {data.details.errors.length > 5 && (
                <p className="text-gray-600 text-sm mt-2">
                  ... and {data.details.errors.length - 5} more errors
                </p>
              )}
            </div>
          )}
        </div>
      );
    };

    const renderUnitsResult = () => {
      const data = uploadResult.data;
      let successCount = 0;
      let errorCount = 0;

      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-2xl font-bold text-[#E31C25] mb-2">Bulk Upload Completed!</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{data.summary.total_files}</div>
              <div className="text-sm text-blue-700">Total Files</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{data.summary.successful_files}</div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{data.summary.failed_files}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
            <h4 className="font-semibold text-gray-800 mb-3">Upload Details:</h4>
            <div className="space-y-3">
              {data.results.map((result: any, index: number) => {
                if (result.status === 'success') {
                  successCount++;
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded">
                      <span className="text-green-600">✅</span>
                      <div className="flex-1">
                        <p className="font-medium text-green-800">{result.filename}</p>
                        <p className="text-sm text-green-600">
                          Student ID: {result.student_id}, Units: {result.units_processed}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  errorCount++;
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 bg-red-50 rounded">
                      <span className="text-red-600">❌</span>
                      <div className="flex-1">
                        <p className="font-medium text-red-800">{result.filename}</p>
                        <p className="text-sm text-red-600">{result.message}</p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="font-semibold text-blue-800">
              Total Units Processed: {data.summary.total_units_processed || 0}
            </p>
          </div>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-[#E31C25]">
              {uploadResult.type === 'students' ? 'Students Upload Result' : 'Units Upload Result'}
            </h2>
            <button
              onClick={closeResultModal}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            {uploadResult.type === 'students' ? renderStudentsResult() : renderUnitsResult()}
          </div>

          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={closeResultModal}
              className="flex-1 px-4 py-3 bg-[#E31C25] text-white rounded-lg hover:bg-[#B71C1C] font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#E31C25]">Bulk Upload</h1>
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
            View Students
          </Link>
        </div>
      </div>

      {/* Recent Operations Section */}
      {recentOperations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-blue-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Recent Uploads</h2>
          <div className="space-y-2">
            {recentOperations.map((operation) => (
              <div key={operation.id} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <div>
                  <span className="font-medium">{operation.filename}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    ({operation.type}) - {operation.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => undoOperation(operation.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Upload Students Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#E31C25]/40">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-[#E31C25]">Bulk Upload Students</h2>
          <button
            onClick={downloadStudentTemplate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Download Template
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Upload multiple students at once using an Excel file. Download the template first to ensure proper formatting.
        </p>
        
        <div className="flex flex-col gap-4">
          <input
            ref={studentFileInputRef}
            type="file"
            accept=".xlsx, .xls"
            onChange={handleStudentFileSelect}
            disabled={uploadingStudents}
            className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-[#E31C25] text-black"
          />
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">📋 Template Instructions:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Use the downloaded template to ensure proper formatting</li>
              <li>• Required columns: Student ID, Student Name, Student Email, Student Course, Student Major</li>
              <li>• Student Type: "malaysian" or "international"</li>
              <li>• Has SPM BM Credit: "TRUE" or "FALSE"</li>
              <li>• Intake Term: "Feb/Mar" or "Aug/Sep"</li>
              <li>• Intake Year: e.g., "2024"</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bulk Upload Units Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#E31C25]/40">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold text-[#E31C25]">Bulk Upload Student Units</h2>
          <button
            onClick={downloadUnitsTemplate}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Download Template
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Upload units for multiple students at once. Each Excel file should be named with the student ID.
        </p>
        
        <div className="flex flex-col gap-4">
          <input
            ref={unitsFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUnitsFileSelect}
            disabled={uploadingBulkUnits}
            className="hidden"
            id="bulk-units-upload"
            multiple
          />
          <label
            htmlFor="bulk-units-upload"
            className={`block w-full p-4 rounded cursor-pointer border-2 border-dashed text-center ${
              uploadingBulkUnits 
                ? 'bg-gray-100 border-gray-300 text-gray-500' 
                : 'bg-white border-[#E31C25]/60 hover:border-[#E31C25] hover:bg-[#FDECEA] text-black'
            } transition-colors`}
          >
            {uploadingBulkUnits ? 'Uploading...' : 'Choose Multiple Excel Files for Bulk Upload'}
          </label>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📋 File Requirements:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Required columns:</strong> Unit Code, Status</li>
              <li>• <strong>Optional columns:</strong> Unit Name, Grade, Credits, Earned, Term</li>
              <li>• <strong>Status values:</strong> "Completed", "Enrolled", "Exempted"</li>
              <li>• <strong>File naming:</strong> Use student ID as filename (e.g., <code className="bg-blue-100 px-1 rounded">12345.xlsx</code>)</li>
              <li>• <strong>Download the template</strong> to ensure proper formatting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Status */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-[#E31C25]/20">
        <h3 className="text-lg font-semibold mb-4 text-[#E31C25]">Upload Status</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span>Students Upload:</span>
            <span className={uploadingStudents ? 'text-yellow-600' : 'text-green-600'}>
              {uploadingStudents ? 'Processing...' : 'Ready'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Units Upload:</span>
            <span className={uploadingBulkUnits ? 'text-yellow-600' : 'text-green-600'}>
              {uploadingBulkUnits ? 'Processing...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewModal />

      {/* Upload Result Modal */}
      <UploadResultModal />
    </div>
  );
}