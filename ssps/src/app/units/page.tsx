"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import Units from "../../components/Units";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <Units />
    </ProtectedRoute>
  );
};

export default UploadPage;

