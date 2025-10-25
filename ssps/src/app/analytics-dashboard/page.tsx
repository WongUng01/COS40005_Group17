// app/upload-study-planner/page.tsx or any protected page
"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import AnalyticsDashboard from "../../components/AnalyticsDashboard";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <AnalyticsDashboard />
    </ProtectedRoute>
  );
};

export default UploadPage;
