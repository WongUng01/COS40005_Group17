import type { Metadata } from "next";
import "@/styles/globals.css";
import Footer from "@/components/Footer";

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
      <body className="min-h-screen flex flex-col bg-blue-50 text-gray-800">
        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
