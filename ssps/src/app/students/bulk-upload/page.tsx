// app/students/bulk-upload/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE_MB = 10;

type UploadResult = {
  type: 'students' | 'units';
  data: any;
};

export default function BulkUploadPage() {
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [uploadingBulkUnits, setUploadingBulkUnits] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  
  const API_URL = "http://127.0.0.1:8000";

  // 批量上传学生
  const handleUploadStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingStudents(true);
      
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast.error('Only Excel files are supported.');
        return;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error('File exceeds 10MB size limit.');
        return;
      }

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
      
      // Store result and show modal instead of alert
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
      if (e.target) e.target.value = '';
    }
  };

  // 批量上传单元
  const handleBulkUnitsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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
      
      // Store result and show modal instead of alert
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
      if (e.target) e.target.value = '';
    }
  };

  const closeResultModal = () => {
    setShowResultModal(false);
    setUploadResult(null);
  };

  // Result Modal Component
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
          {/* Modal Header */}
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

          {/* Modal Body */}
          <div className="p-6">
            {uploadResult.type === 'students' ? renderStudentsResult() : renderUnitsResult()}
          </div>

          {/* Modal Footer */}
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

      {/* Bulk Upload Students Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#E31C25]/40">
        <h2 className="text-xl font-semibold mb-4 text-[#E31C25]">Bulk Upload Students</h2>
        <p className="text-gray-600 mb-4">
          Upload multiple students at once using an Excel file. The file should include columns for student information.
        </p>
        
        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleUploadStudents}
            disabled={uploadingStudents}
            className="p-2 border rounded border-gray-300 focus:ring-2 focus:ring-[#E31C25] text-black"
          />
          <div className="text-sm text-gray-500">
            <p>✅ Supported formats: .xlsx, .xls</p>
            <p>✅ Maximum file size: 10MB</p>
            <p>✅ Required columns: Student ID, Name, Email, Course, Major, Intake Term, Intake Year</p>
          </div>
        </div>
      </div>

      {/* Bulk Upload Units Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-[#E31C25]/40">
        <h2 className="text-xl font-semibold mb-4 text-[#E31C25]">Bulk Upload Student Units</h2>
        <p className="text-gray-600 mb-4">
          Upload units for multiple students at once. Each Excel file should be named with the student ID.
        </p>
        
        <div className="flex flex-col gap-4">
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
            className={`block w-full p-4 rounded cursor-pointer border-2 border-dashed text-center ${
              uploadingBulkUnits 
                ? 'bg-gray-100 border-gray-300 text-gray-500' 
                : 'bg-white border-[#E31C25]/60 hover:border-[#E31C25] hover:bg-[#FDECEA] text-black'
            } transition-colors`}
          >
            {uploadingBulkUnits ? 'Uploading...' : 'Choose Multiple Excel Files for Bulk Upload'}
          </label>
          
          <div className="text-sm text-gray-500">
            <h4 className="font-semibold text-[#E31C25] mb-2">✅ File Requirements:</h4>
            <ul className="space-y-1">
              <li>• <strong>Required columns:</strong> Course, Status</li>
              <li>• <strong>Optional columns:</strong> Course Title, Grade, Credits, Earned, Term</li>
              <li>• <strong>Student ID:</strong> Must be included in filename (e.g., <code className="bg-gray-100 px-1 rounded">12345.xlsx</code>)</li>
              <li>• <strong>File naming:</strong> Use student ID as filename</li>
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

      {/* Upload Result Modal */}
      <UploadResultModal />
    </div>
  );
}