// app/students/bulk-upload/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE_MB = 10;

export default function BulkUploadPage() {
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [uploadingBulkUnits, setUploadingBulkUnits] = useState(false);
  const API_URL = 'http://localhost:8000';

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
      let successCount = 0;
      let errorCount = 0;

      let message = `📊 Bulk Upload Completed!\n\n`;
      message += `📁 Total Files: ${data.summary.total_files}\n`;
      message += `✅ Successful: ${data.summary.successful_files}\n`;
      message += `❌ Failed: ${data.summary.failed_files}\n\n`;

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
    </div>
  );
}
