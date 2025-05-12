// app/upload-study-planner/page.tsx or any protected page
"use client";

import ProtectedRoute from "../../components/ProtectedRoute";
import StudyPlanner from "../../components/StudyPlanner";

const UploadPage = () => {
  return (
    <ProtectedRoute>
      <StudyPlanner />
    </ProtectedRoute>
  );
};

export default UploadPage;
