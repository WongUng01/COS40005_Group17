'use client';

import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import { Toaster } from 'react-hot-toast'; // ✅ Add this import

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        <main className="flex-1 ml-64 flex flex-col min-h-screen">
          {children}
        </main>
        <Footer />
      </div>

      {/* ✅ Add toaster here so all pages under this layout can show toasts */}
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
    </div>
  );
}
