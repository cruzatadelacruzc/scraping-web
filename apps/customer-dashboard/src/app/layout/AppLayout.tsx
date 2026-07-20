import React from 'react';
import { Outlet } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-surface">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;