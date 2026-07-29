import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './token-storage';

/**
 * Gate for pre-auth routes (landing + auth). Authenticated users are bounced
 * to where they came from (`state.from`) or the dashboard.
 */
export function PublicOnlyRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) return null;
  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/dashboard'} replace />;
  }
  return <Outlet />;
}
