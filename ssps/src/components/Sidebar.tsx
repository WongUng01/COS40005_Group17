'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useState } from 'react';
import {
  FaBook,
  FaClipboardList,
  FaUserCircle,
  FaSignOutAlt,
  FaUserGraduate,
  FaFileUpload,
  FaEye,
} from 'react-icons/fa';

const navItems = [
  { label: 'Units', href: '/units', icon: <FaBook /> },
  { label: 'Upload Study Planner', href: '/study-planner-upload', icon: <FaFileUpload /> },
  { label: 'Create Study Planner', href: '/create-study-planner', icon: <FaClipboardList /> },
  { label: 'View Study Planner', href: '/study-planner', icon: <FaEye /> },
  { label: 'Students', href: '/students', icon: <FaUserGraduate /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    } else {
      router.push('/');
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-50">
      {/* Header */}
      <div className="flex flex-col items-center justify-center bg-[#cc0000] text-white py-5 shadow-md">
        <div className="text-xl font-bold tracking-wide">Swinburne SSPS</div>
        <div className="text-xs opacity-90">Admin Dashboard</div>
      </div>

      {/* Profile Section */}
      <div className="relative p-4 border-b border-gray-100">
        <button
          onClick={() => setShowProfileMenu((prev) => !prev)}
          className="flex items-center gap-3 w-full text-gray-700 hover:bg-gray-50 rounded-lg px-3 py-2 transition"
        >
          <FaUserCircle className="text-2xl text-[#cc0000]" />
          <span className="text-sm font-medium">My Account</span>
        </button>

        {showProfileMenu && (
          <div className="absolute left-4 right-4 top-14 bg-white border border-gray-200 rounded-lg shadow-md z-10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full text-left text-red-600 hover:bg-gray-50 px-3 py-2 text-sm rounded-md"
            >
              <FaSignOutAlt className="text-xs" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col mt-4">
        {navItems.map(({ label, href, icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 rounded-none border-l-4 ${
                isActive
                  ? 'bg-red-50 border-[#cc0000] text-[#cc0000]'
                  : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-[#cc0000]'
              }`}
            >
              <span className={`text-lg ${isActive ? 'text-[#cc0000]' : 'text-gray-600'}`}>
                {icon}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto py-3 text-center text-xs text-gray-400 border-t border-gray-100">
        © 2025 Swinburne SSPS
      </div>
    </aside>
  );
}
