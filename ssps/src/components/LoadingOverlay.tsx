// components/LoadingOverlay.tsx
'use client';

import React from 'react';

const LoadingOverlay = () => {
  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center z-50">
      <div className="spinner"></div> {/* You can replace this with an actual spinner component or animation */}
    </div>
  );
};

export default LoadingOverlay;
