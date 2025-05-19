"use client";

import ProtectedRoute from "../../../components/ProtectedRoute";
import StudentsUnits from "../../../components/StudentsUnits";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <StudentsUnits />
    </ProtectedRoute>
  );
};

export default UploadPage;
