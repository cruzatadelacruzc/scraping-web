import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg bg-surface-container">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-on-surface-variant mb-6">{description}</p>
        {children}
      </div>
    </div>
  );
}