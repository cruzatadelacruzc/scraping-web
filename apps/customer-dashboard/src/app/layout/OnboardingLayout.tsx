import React from 'react';
import { Outlet } from 'react-router-dom';

export const OnboardingLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface">
      <div className="w-full max-w-2xl p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default OnboardingLayout;