// layout.tsx
import type { Metadata } from "next";
import "@/styles/globals.css";
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
      <body className="min-h-screen flex bg-red-50 text-gray-800">
        <Providers>

          {/* Main content area with left margin to avoid overlap */}
            <main className="flex-1 flex flex-col">            
              {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
