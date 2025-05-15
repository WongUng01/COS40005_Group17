"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import Dashboard from "../../components/Dashboard";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
};

export default UploadPage;
