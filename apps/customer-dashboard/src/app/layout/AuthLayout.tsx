import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface">
      <div className="w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;