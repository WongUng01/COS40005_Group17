'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useState } from 'react';
import {
  // FaTachometerAlt,
  FaBook,
  FaClipboardList,
  FaUserCircle,
  FaSignOutAlt,
  // FaCog,
  FaUserGraduate, 
  FaFileUpload, 
  FaEye,
} from 'react-icons/fa';

const navItems = [
  // { label: 'Dashboard', href: '/dashboard', icon: <FaTachometerAlt /> },
  { label: 'Units', href: '/units', icon: <FaBook /> },
<<<<<<< HEAD
  { label: 'Study Planner', href: '/study-planner', icon: <FaClipboardList /> },
  { label: 'Students', href: '/students', icon: <FaClipboardList /> },
  { label: 'Students_Unit', href: '/student_units', icon: <FaClipboardList /> }
=======
  { label: 'Upload Study Planner', href: '/study-planner-upload', icon: <FaFileUpload /> },
  { label: 'Create Study Planner', href: '/create-study-planner', icon: <FaClipboardList /> },
  { label: 'View Study Planner', href: '/study-planner', icon: <FaEye /> },
  { label: 'Students', href: '/students', icon: <FaUserGraduate /> },
>>>>>>> main
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
    <aside className="fixed left-0 top-0 h-screen w-20 bg-white border-r border-gray-200 flex flex-col p-4 shadow-md z-50">
      {/* Top Section: Profile + Nav */}
      <div className="flex flex-col gap-6">
        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex flex-col items-center w-full text-gray-700 hover:bg-blue-50 rounded-md p-2 transition"
          >
            <FaUserCircle className="text-2xl" />
            <span className="text-xs mt-1">Me</span>
          </button>

          {showProfileMenu && (
            <div className="absolute left-16 top-0 bg-white border rounded-md shadow-md p-2 z-10 w-36">
              {/* <Link
                href="/profile"
                className="flex items-center gap-2 p-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                <FaCog className="text-xs" />
                Settings  
              </Link> */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left rounded"
              >
                <FaSignOutAlt className="text-xs" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-4">
          {navItems.map(({ label, href, icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-md font-medium transition duration-200 ease-in-out ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-xs">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Reserved Bottom Area (future use or branding) */}
      <div className="mt-auto"></div>
    </aside>
  );
}
