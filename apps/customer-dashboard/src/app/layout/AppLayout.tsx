import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-surface">
      <header className="fixed top-0 right-0 z-10 p-4">
        <UserMenu />
      </header>
      <main className="flex-1 overflow-auto pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;