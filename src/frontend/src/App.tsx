import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { RoleRoute } from './components/RoleRoute';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const HomePage = lazy(() => import('./pages/Home').then((m) => ({ default: m.HomePage })));
const PartnersPage = lazy(() => import('./pages/Partners').then((m) => ({ default: m.PartnersPage })));
const PartnerViewPage = lazy(() => import('./pages/PartnerView').then((m) => ({ default: m.PartnerViewPage })));
const InvesteesPage = lazy(() => import('./pages/Investees').then((m) => ({ default: m.InvesteesPage })));
const InvesteeViewPage = lazy(() => import('./pages/InvesteeView').then((m) => ({ default: m.InvesteeViewPage })));
const GroupsPage = lazy(() => import('./pages/Groups').then((m) => ({ default: m.GroupsPage })));
const GroupViewPage = lazy(() => import('./pages/GroupView').then((m) => ({ default: m.GroupViewPage })));
const AppointmentsPage = lazy(() => import('./pages/Appointments').then((m) => ({ default: m.AppointmentsPage })));
const AppointmentViewPage = lazy(() => import('./pages/AppointmentView').then((m) => ({ default: m.AppointmentViewPage })));
const RecurringAppointmentsPage = lazy(() => import('./pages/RecurringAppointments').then((m) => ({ default: m.RecurringAppointmentsPage })));
const RecurringAppointmentViewPage = lazy(() => import('./pages/RecurringAppointmentView').then((m) => ({ default: m.RecurringAppointmentViewPage })));
const CalendarPage = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.CalendarPage })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const FeedbackPage = lazy(() => import('./pages/Feedback').then((m) => ({ default: m.FeedbackPage })));
const MyAppointmentsPage = lazy(() => import('./pages/MyAppointments').then((m) => ({ default: m.MyAppointmentsPage })));
const MyAppointmentViewPage = lazy(() => import('./pages/MyAppointmentView').then((m) => ({ default: m.MyAppointmentViewPage })));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-textMuted">Loading...</div>
);

function App() {
  const { user } = useAuth();

  const LandingPage = user?.user_type === 'PARTNER'
    ? <Navigate to="/my-appointments" replace />
    : <Layout><HomePage /></Layout>;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<Navigate to="/login" replace />} />
        <Route path="/partner-activate" element={<Navigate to="/login" replace />} />
        <Route path="/partner-activation" element={<Navigate to="/login" replace />} />
        <Route path="/reset-password" element={<Navigate to="/login" replace />} />

        <Route element={<PrivateRoute />}>
          <Route element={LandingPage} path="/" />
          <Route element={<Layout><CalendarPage /></Layout>} path="/calendar" />
          <Route element={<Layout><AnalyticsPage /></Layout>} path="/analytics" />
          <Route element={<Layout><FeedbackPage /></Layout>} path="/feedback" />
          <Route element={<Layout><SettingsPage /></Layout>} path="/settings" />

          <Route element={<Layout><PartnersPage /></Layout>} path="/partners" />
          <Route element={<Layout><PartnerViewPage /></Layout>} path="/partners/:id" />
          <Route element={<Layout><InvesteesPage /></Layout>} path="/investees" />
          <Route element={<Layout><InvesteeViewPage /></Layout>} path="/investees/:id" />
          <Route element={<Layout><GroupsPage /></Layout>} path="/groups" />
          <Route element={<Layout><GroupViewPage /></Layout>} path="/groups/:id" />

          <Route element={<RoleRoute allowedRoles={['PARTNER']} />}>
            <Route element={<Layout><MyAppointmentsPage /></Layout>} path="/my-appointments" />
            <Route element={<Layout><MyAppointmentViewPage /></Layout>} path="/my-appointments/:kind/:id" />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route element={<Layout><AppointmentViewPage /></Layout>} path="/appointments/:id" />
            <Route element={<Layout><AppointmentsPage /></Layout>} path="/appointments" />
            <Route element={<Layout><RecurringAppointmentsPage /></Layout>} path="/recurring-appointments" />
            <Route element={<Layout><RecurringAppointmentViewPage /></Layout>} path="/recurring-appointments/:id" />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
