"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import Dashboard from "../../components/CreateStudyPlanner";
import CreateStudyPlanner from "../../components/CreateStudyPlanner";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <CreateStudyPlanner />
    </ProtectedRoute>
  );
};

export default UploadPage;
