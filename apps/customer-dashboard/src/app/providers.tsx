import React from 'react';
import { AuthProvider } from '@shared/auth/AuthProvider';
import { ThemeProvider } from '@shared/ui/ThemeProvider';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <ThemeProvider />
      <AuthProvider />
      {children}
    </>
  );
};