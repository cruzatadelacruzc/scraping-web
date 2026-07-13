import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useIsAuthenticated } from './hooks';

interface Props {
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Wraps protected routes. Redirects to login if the user is not authenticated.
 * Does NOT check permissions — use RequirePermission for that.
 */
export function ProtectedRoute({ children, fallbackPath = '/login' }: Props): JSX.Element {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
