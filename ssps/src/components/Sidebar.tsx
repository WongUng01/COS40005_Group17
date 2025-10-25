'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';
import {
  FaBook,
  FaClipboardList,
  FaUserCircle,
  FaSignOutAlt,
  FaUserGraduate,
  FaFileUpload,
  FaEye,
  FaChevronDown,
  FaChevronUp,
  FaChartBar,
} from 'react-icons/fa';

const navItems = [
  { label: 'Units', href: '/units', icon: <FaBook /> },
  {
    label: 'Study Planners',
    icon: <FaClipboardList />,
    children: [
      { label: 'Upload Study Planner', href: '/study-planner-upload', icon: <FaFileUpload /> },
      { label: 'Create Study Planner', href: '/create-study-planner', icon: <FaClipboardList /> },
      { label: 'View Study Planner', href: '/study-planner', icon: <FaEye /> },
    ],
  },
  { label: 'Students', href: '/students', icon: <FaUserGraduate /> },
  { label: 'Analytics', href: '/analytics-dashboard', icon: <FaChartBar /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Automatically expand menu containing the active path
  useEffect(() => {
    const newExpanded: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children?.some((child) => child.href === pathname)) {
        newExpanded[item.label] = true;
      }
    });
    setExpandedMenus(newExpanded);
  }, [pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
    } else {
      router.push('/');
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleTopLevelClick = (item: typeof navItems[number]) => {
    // If it's a top-level with no children, close other menus
    if (!item.children) {
      const newExpanded: Record<string, boolean> = {};
      setExpandedMenus(newExpanded);
    } else {
      toggleMenu(item.label);
    }
  };

  const renderNavItem = (item: typeof navItems[number]) => {
    const isActive = item.href && pathname === item.href;

    if (item.children) {
      const isExpanded = expandedMenus[item.label];
      return (
        <div key={item.label} className="flex flex-col">
          <button
            onClick={() => handleTopLevelClick(item)}
            className={`flex items-center justify-between gap-3 px-5 py-3 text-sm font-medium w-full transition-all duration-150 rounded-none border-l-4 ${
              isExpanded ? 'bg-red-50 border-[#cc0000] text-[#cc0000]' : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-[#cc0000]'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="text-lg text-gray-600">{item.icon}</span>
              {item.label}
            </span>
            {isExpanded ? <FaChevronUp className="text-gray-600" /> : <FaChevronDown className="text-gray-600" />}
          </button>

          {/* Submenu */}
          {isExpanded &&
            item.children.map((child) => {
              const isChildActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-3 pl-12 pr-5 py-2 text-sm font-medium transition-all duration-150 rounded-none border-l-4 ${
                    isChildActive
                      ? 'bg-red-50 border-[#cc0000] text-[#cc0000]'
                      : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-[#cc0000]'
                  }`}
                >
                  <span className={`text-lg ${isChildActive ? 'text-[#cc0000]' : 'text-gray-600'}`}>{child.icon}</span>
                  <span>{child.label}</span>
                </Link>
              );
            })}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href!}
        onClick={() => handleTopLevelClick(item)}
        className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 rounded-none border-l-4 ${
          isActive ? 'bg-red-50 border-[#cc0000] text-[#cc0000]' : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-[#cc0000]'
        }`}
      >
        <span className={`text-lg ${isActive ? 'text-[#cc0000]' : 'text-gray-600'}`}>{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg z-50">
      {/* Header */}
      <div className="flex flex-col items-center justify-center bg-[#cc0000] text-white py-5 shadow-md">
        <div className="text-xl font-bold tracking-wide">Swinburne SSPS</div>
        <div className="text-xs opacity-90">HOD</div>
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
      <nav className="flex flex-col mt-4">{navItems.map(renderNavItem)}</nav>

      {/* Footer */}
      <div className="mt-auto py-3 text-center text-xs text-gray-400 border-t border-gray-100">
        © 2025 Swinburne SSPS
      </div>
    </aside>
  );
}
