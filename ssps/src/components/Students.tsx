// app/students/page.tsx
'use client';
import Link from 'next/link';

export default function StudentsMainPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#E31C25] mb-2">Student Management System</h1>
        <p className="text-gray-600">Manage student information, upload data in bulk, and check graduation eligibility</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Students Information Card */}
        <Link 
          href="/students/information"
          className="bg-white p-6 rounded-lg shadow-md border border-[#E31C25]/20 hover:shadow-lg transition-shadow group"
        >
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Students Information</h2>
            <p className="text-gray-600 text-sm">View, edit, and manage student profiles and information</p>
          </div>
        </Link>

        {/* Bulk Upload Card */}
        <Link 
          href="/students/bulk-upload"
          className="bg-white p-6 rounded-lg shadow-md border border-[#E31C25]/20 hover:shadow-lg transition-shadow group"
        >
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Bulk Upload</h2>
            <p className="text-gray-600 text-sm">Upload students and units data in bulk using Excel files</p>
          </div>
        </Link>

        {/* Check Graduation Card */}
        <Link 
          href="/students/check-graduation"
          className="bg-white p-6 rounded-lg shadow-md border border-[#E31C25]/20 hover:shadow-lg transition-shadow group"
        >
          <div className="text-center">
            <div className="bg-purple-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Check Graduation</h2>
            <p className="text-gray-600 text-sm">Verify graduation eligibility and manage graduation status</p>
          </div>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link 
            href="/students/information?action=add"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <span className="bg-blue-100 p-2 rounded-full">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            <span className="text-[#E31C25] font-medium">Add New Student</span>
          </Link>
          <Link 
            href="/students/bulk-upload?type=students"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
          >
            <span className="bg-green-100 p-2 rounded-full">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </span>
            <span className="text-[#E31C25] font-medium">Bulk Upload Students</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity or System Status */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database Connection</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">File Upload Service</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Graduation Check</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Ready</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Getting Started</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#E31C25] rounded-full"></span>
              Use Students Information to manage individual student records
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#E31C25] rounded-full"></span>
              Bulk Upload for adding multiple students or units at once
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#E31C25] rounded-full"></span>
              Check Graduation to verify student eligibility
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}