"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import StudentsPage from "../../components/Students";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <StudentsPage />
    </ProtectedRoute>
  );
};

export default UploadPage;