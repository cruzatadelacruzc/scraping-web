import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from './token-storage';

/**
 * Gate for authenticated routes. While auth state is loading, renders nothing
 * (prevents flash-redirect). Unauthenticated → /login, preserving the attempted
 * URL as `state.from` so the login form can redirect back.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <Outlet />;
}
