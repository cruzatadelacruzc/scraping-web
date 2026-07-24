import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AccountsPage } from '@pages/accounts-page';
import { DashboardPage } from '@pages/dashboard-page';
import { LoginPage } from '@pages/login-page';
import { NotFoundPage } from '@pages/not-found-page';
import { ProductDetailPage } from '@pages/product-detail-page';
import { ProductsPage } from '@pages/products-page';
import { ProductsStatsPage } from '@pages/products-stats-page';
import { QueuesPage } from '@pages/queues-page';
import { RolesPage } from '@pages/roles-page';
import { RulesPage } from '@pages/rules-page';
import { ScrapersPage } from '@pages/scrapers-page';
import { SettingsPage } from '@pages/settings-page';
import { UsersPage } from '@pages/users-page';
import { configureAuthHandlers } from '@shared/api/client';
import { createAppQueryClient } from '@shared/api/query-client';
import { AuthProvider } from '@shared/auth/auth-provider';
import { AuthService } from '@shared/auth/auth-service';
import { InMemoryStorage } from '@shared/auth/in-memory-storage';
import { ProtectedRoute } from '@shared/auth/protected-route';
import { SessionManager } from '@shared/auth/session-manager';
import { CommandPaletteProvider } from '@shared/command-palette';
import { ROUTES } from '@shared/config/routes';
import { NotificationProvider } from '@shared/notifications';
import { Permission, RequirePermission } from '@shared/permissions';
import { AppLayout } from '@shared/ui/layout/app-layout';
import { PageSkeleton } from '@shared/ui/skeletons/page-skeleton';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

const DASHBOARD_PERMISSIONS: Permission[] = [Permission.VIEW_DASHBOARD];
const ACCOUNTS_PERMISSIONS: Permission[] = [Permission.VIEW_ACCOUNTS];
const USERS_PERMISSIONS: Permission[] = [Permission.VIEW_USERS];
const ROLES_PERMISSIONS: Permission[] = [Permission.VIEW_ROLES];
const PRODUCTS_PERMISSIONS: Permission[] = [Permission.VIEW_PRODUCTS];
const SCRAPERS_PERMISSIONS: Permission[] = [Permission.VIEW_SCRAPERS];
const RULES_PERMISSIONS: Permission[] = [Permission.VIEW_RULES];
const QUEUES_PERMISSIONS: Permission[] = [Permission.VIEW_QUEUES];
const PLANS_PERMISSIONS: Permission[] = [Permission.VIEW_PLANS];

const PlansPage = lazy(() => import('@features/plans').then((m) => ({ default: m.PlansPage })));
const SETTINGS_PERMISSIONS: Permission[] = [Permission.VIEW_SETTINGS];

const TOAST_OPTIONS = {
  style: {
    background: '#122131',
    color: '#d4e4fa',
    border: '1px solid #574048',
    borderRadius: '4px' as const,
    fontSize: '14px',
  },
};

const queryClient = createAppQueryClient();

const storage = new InMemoryStorage();
const authService = new AuthService(storage);
const sessionManager = new SessionManager(authService);

configureAuthHandlers({
  getAccessToken: () => storage.getAccessToken(),
  getRefreshToken: () => storage.getRefreshToken(),
  onRefreshSuccess: ({ accessToken, refreshToken }) => {
    storage.setAccessToken(accessToken);
    storage.setRefreshToken(refreshToken);
  },
  onRefreshFail: () => {
    storage.clear();
    window.location.href = ROUTES.LOGIN;
  },
});

export function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider authService={authService} sessionManager={sessionManager} storage={storage}>
        <NotificationProvider>
          <CommandPaletteProvider>
            <Routes>
              {/* Public */}
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />

              {/* Protected */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
                <Route
                  path={ROUTES.DASHBOARD}
                  element={
                    <RequirePermission permissions={DASHBOARD_PERMISSIONS}>
                      <DashboardPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.ACCOUNTS}
                  element={
                    <RequirePermission permissions={ACCOUNTS_PERMISSIONS}>
                      <AccountsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.USERS}
                  element={
                    <RequirePermission permissions={USERS_PERMISSIONS}>
                      <UsersPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.ROLES}
                  element={
                    <RequirePermission permissions={ROLES_PERMISSIONS}>
                      <RolesPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.PRODUCTS}
                  element={
                    <RequirePermission permissions={PRODUCTS_PERMISSIONS}>
                      <ProductsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.PRODUCTS_STATS}
                  element={
                    <RequirePermission permissions={PRODUCTS_PERMISSIONS}>
                      <ProductsStatsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.PRODUCT_DETAIL}
                  element={
                    <RequirePermission permissions={PRODUCTS_PERMISSIONS}>
                      <ProductDetailPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.SCRAPERS}
                  element={
                    <RequirePermission permissions={SCRAPERS_PERMISSIONS}>
                      <ScrapersPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.RULES}
                  element={
                    <RequirePermission permissions={RULES_PERMISSIONS}>
                      <RulesPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.QUEUES}
                  element={
                    <RequirePermission permissions={QUEUES_PERMISSIONS}>
                      <QueuesPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.SETTINGS}
                  element={
                    <RequirePermission permissions={SETTINGS_PERMISSIONS}>
                      <SettingsPage />
                    </RequirePermission>
                  }
                />
                <Route
                  path={ROUTES.PLANS}
                  element={
                    <RequirePermission permissions={PLANS_PERMISSIONS}>
                      <Suspense fallback={<PageSkeleton />}>
                        <PlansPage />
                      </Suspense>
                    </RequirePermission>
                  }
                />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster position="bottom-right" toastOptions={TOAST_OPTIONS} />
          </CommandPaletteProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
