import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GuestRoute } from './components/GuestRoute';
import { RoleGuard } from './components/RoleGuard';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { LoadingState } from './components/ui/LoadingState';

/*
 * Code-splitting по роутам.
 *
 * Раньше все pages импортировались синхронно: гость на лендинге грузил
 * весь admin-функционал (DashboardPage, SupportPage, ActivityLogPage и
 * т.д.) в одном index.js ~670 kB / 196 kB gzip. После парсинга — сотни
 * миллисекунд CPU на mid-устройстве + лишний трафик у того, кто никогда
 * не залогинится.
 *
 * lazy() + Suspense разбивает бандл по роутам — Vite/Rollup автоматически
 * выделяет отдельный chunk для каждого dynamic import'а. Лендинг тянет
 * только своё ядро + общие либы (react, react-dom, react-router); пейджи
 * подтянутся по сети только при первом переходе на маршрут. Vite
 * кэширует chunk'и, повторная навигация — мгновенная.
 *
 * AppLayout/AuthLayout оставляем синхронными — это лёгкие обёртки,
 * нужные сразу при первом protected/guest-маршруте; разделять их
 * смысла нет.
 */
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const FirstLoginPage = lazy(() => import('./pages/auth/FirstLoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const ContainersPage = lazy(() => import('./pages/ContainersPage'));
const UnitsPage = lazy(() => import('./pages/UnitsPage'));
const RentsPage = lazy(() => import('./pages/RentsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          {/* Один Suspense на всё дерево — fallback тот же LoadingState,
              что используется внутри страниц; визуально единообразно
              с остальным проектом. */}
          <Suspense fallback={<LoadingState label="Загрузка страницы…" />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route element={<GuestRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/first-login" element={<FirstLoginPage />} />
                </Route>

                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/locations" element={<LocationsPage />} />
                  <Route path="/containers" element={<ContainersPage />} />
                  <Route path="/units" element={<UnitsPage />} />
                  <Route path="/rents" element={<RentsPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  <Route element={<RoleGuard allow={['admin']} />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/activity-log" element={<ActivityLogPage />} />
                  </Route>

                  <Route path="/app" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
