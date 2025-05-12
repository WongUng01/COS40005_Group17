// app/upload-study-planner/page.tsx or any protected page
"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import UploadStudyPlanner from "../../components/UploadStudyPlanner";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <UploadStudyPlanner />
    </ProtectedRoute>
  );
};

export default UploadPage;
