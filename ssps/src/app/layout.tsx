// layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
import Footer from "@/components/Footer";
import { Providers } from "./providers";

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
        <Providers>
          {/* Only render children when session is valid */}
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
