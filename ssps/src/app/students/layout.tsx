'use client';

import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';

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
        <main className="flex-1 ml-64 flex flex-col min-h-screen">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
