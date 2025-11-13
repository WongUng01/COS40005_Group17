"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import StudentsPage from "../../components/StudentsInformation";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <StudentsPage />
    </ProtectedRoute>
  );
};

export default UploadPage;