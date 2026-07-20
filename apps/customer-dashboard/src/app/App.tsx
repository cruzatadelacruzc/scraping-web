import React, { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useUIStore } from '@shared/ui/ui-store';
import { cn } from '@shared/utils/cn';

const App: React.FC = () => {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="flex h-screen bg-surface text-on-surface">
      {/* Placeholder for sidebar - will be implemented in Phase 1 */}
      <aside
        className={cn(
          'hidden w-60 flex-col border-r border-outline-variant bg-surface-container transition-all lg:flex',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        <div className="p-4">Sidebar</div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="text-on-surface-variant">Loading...</div>
            </div>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </main>
    </div>
  );
};

export default App;