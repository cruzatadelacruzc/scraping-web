import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';

const AuthLayout = lazy(() => import('./layout/AuthLayout'));
const AppLayout = lazy(() => import('./layout/AppLayout'));

const LoginPage = lazy(() => import('@features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@features/auth/pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@features/auth/pages/VerifyEmailPage'));

const routes = [
  {
    path: '/',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
  {
    path: ROUTES.LOGIN,
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: ROUTES.REGISTER,
    element: <AuthLayout />,
    children: [{ index: true, element: <RegisterPage /> }],
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <AuthLayout />,
    children: [{ index: true, element: <ForgotPasswordPage /> }],
  },
  {
    path: ROUTES.RESET_PASSWORD,
    element: <AuthLayout />,
    children: [{ path: ':token', element: <ResetPasswordPage /> }],
  },
  {
    path: ROUTES.VERIFY_EMAIL,
    element: <AuthLayout />,
    children: [{ path: ':token', element: <VerifyEmailPage /> }],
  },
  {
    path: ROUTES.DASHBOARD,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Dashboard - To be implemented in Phase 1</div> }],
  },
  {
    path: ROUTES.ALARMS,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Alarms - To be implemented in Phase 2</div> }],
  },
  {
    path: ROUTES.BOTS,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Bots - To be implemented in Phase 4</div> }],
  },
  {
    path: ROUTES.NOTIFICATIONS,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Notifications - To be implemented in Phase 3</div> }],
  },
  {
    path: ROUTES.ACCOUNT,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Account - To be implemented in Phase 5</div> }],
  },
  {
    path: ROUTES.PROFILE,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Profile - To be implemented in Phase 1</div> }],
  },
  {
    path: ROUTES.ONBOARDING,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <div>Onboarding - To be implemented in Phase 1</div> }],
  },
  {
    path: '*',
    element: <div>404 - Not Found</div>,
  },
] as RouteObject[];

export const router = createBrowserRouter(routes);