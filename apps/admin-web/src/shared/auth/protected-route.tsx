import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthLoading, useIsAuthenticated } from './hooks';

interface Props {
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Wraps protected routes. Redirects to login if the user is not authenticated.
 * While auth state is loading, renders nothing to prevent a flash-redirect.
 * Passes the attempted URL as `state.from` so LoginPage can redirect back.
 * Does NOT check permissions — use RequirePermission for that.
 */
export function ProtectedRoute({ children, fallbackPath = '/login' }: Props): JSX.Element {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const location = useLocation();

  if (isLoading) {
    return <></>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={fallbackPath} state={{ from: location.pathname + location.search }} replace />
    );
  }

  return <>{children}</>;
}
