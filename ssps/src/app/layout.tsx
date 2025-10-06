// layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import { Providers } from "./providers";
import Sidebar from "@/components/Sidebar"; // adjust path

export const metadata: Metadata = {
  title: "Student Study Planner",
  description: "Plan and track your academic goals efficiently.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-blue-50 text-gray-800">
        <Providers>
          <Sidebar />

          {/* Main content area with left margin to avoid overlap */}
          <main className="flex-1 ml-64 flex flex-col min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
