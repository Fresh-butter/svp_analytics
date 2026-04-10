import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { RoleRoute } from './components/RoleRoute';
import { Layout } from './components/Layout';

const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const PartnerActivationPage = lazy(() => import('./pages/PartnerActivation').then((m) => ({ default: m.PartnerActivationPage })));
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

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-textMuted">Loading...</div>
);

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<PartnerActivationPage />} />
        <Route path="/partner-activate" element={<PartnerActivationPage />} />
        <Route path="/partner-activation" element={<PartnerActivationPage />} />

        <Route element={<PrivateRoute />}>
          <Route element={<Layout><HomePage /></Layout>} path="/" />
          <Route element={<Layout><CalendarPage /></Layout>} path="/calendar" />
          <Route element={<Layout><AnalyticsPage /></Layout>} path="/analytics" />
          <Route element={<Layout><FeedbackPage /></Layout>} path="/feedback" />
          <Route element={<Layout><AppointmentViewPage /></Layout>} path="/appointments/:id" />
          <Route element={<Layout><SettingsPage /></Layout>} path="/settings" />

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route element={<Layout><PartnersPage /></Layout>} path="/partners" />
            <Route element={<Layout><PartnerViewPage /></Layout>} path="/partners/:id" />
            <Route element={<Layout><InvesteesPage /></Layout>} path="/investees" />
            <Route element={<Layout><InvesteeViewPage /></Layout>} path="/investees/:id" />
            <Route element={<Layout><GroupsPage /></Layout>} path="/groups" />
            <Route element={<Layout><GroupViewPage /></Layout>} path="/groups/:id" />
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
