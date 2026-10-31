import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { About } from '@/pages/About';
import { Account } from '@/pages/Account';
import { Explore } from '@/pages/Explore';
import { HowItWorks } from '@/pages/HowItWorks';
import { Landing } from '@/pages/Landing';
import { NotFound } from '@/pages/NotFound';
import { Notifications } from '@/pages/Notifications';
import { ResourceDetail } from '@/pages/ResourceDetail';
import { ForgotPassword } from '@/pages/auth/ForgotPassword';
import { Login } from '@/pages/auth/Login';
import { Signup } from '@/pages/auth/Signup';
import { Activity } from '@/pages/dashboard/Activity';
import { Bookings } from '@/pages/dashboard/Bookings';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { Eligibility } from '@/pages/dashboard/Eligibility';
import { Incidents } from '@/pages/dashboard/Incidents';
import { OwnerAnalytics } from '@/pages/owner/OwnerAnalytics';
import { OwnerAvailability } from '@/pages/owner/OwnerAvailability';
import { OwnerBookings } from '@/pages/owner/OwnerBookings';
import { OwnerDashboard } from '@/pages/owner/OwnerDashboard';
import { OwnerHandover } from '@/pages/owner/OwnerHandover';
import { OwnerIncidents } from '@/pages/owner/OwnerIncidents';
import { OwnerResources } from '@/pages/owner/OwnerResources';
import { ResourceForm } from '@/pages/owner/ResourceForm';
import { AdminAudit } from '@/pages/admin/AdminAudit';
import { AdminBookings } from '@/pages/admin/AdminBookings';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminEligibility } from '@/pages/admin/AdminEligibility';
import { AdminIncidents } from '@/pages/admin/AdminIncidents';
import { AdminInstitutions } from '@/pages/admin/AdminInstitutions';
import { AdminResources } from '@/pages/admin/AdminResources';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminUsers } from '@/pages/admin/AdminUsers';

const ADMIN_ROLES = ['administrator', 'institution_manager'] as const;

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="explore" element={<Explore />} />
        <Route path="resources/:id" element={<ResourceDetail />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/bookings" element={<Bookings />} />
          <Route path="/dashboard/eligibility" element={<Eligibility />} />
          <Route path="/dashboard/incidents" element={<Incidents />} />
          <Route path="/dashboard/activity" element={<Activity />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/account" element={<Account />} />

          <Route element={<ProtectedRoute allowedRoles={['resource_owner']} />}>
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/owner/resources" element={<OwnerResources />} />
            <Route path="/owner/resources/new" element={<ResourceForm />} />
            <Route path="/owner/resources/:id/edit" element={<ResourceForm />} />
            <Route path="/owner/bookings" element={<OwnerBookings />} />
            <Route path="/owner/availability" element={<OwnerAvailability />} />
            <Route path="/owner/handover" element={<OwnerHandover />} />
            <Route path="/owner/incidents" element={<OwnerIncidents />} />
            <Route path="/owner/analytics" element={<OwnerAnalytics />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[...ADMIN_ROLES]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/institutions" element={<AdminInstitutions />} />
            <Route path="/admin/resources" element={<AdminResources />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/incidents" element={<AdminIncidents />} />
            <Route path="/admin/eligibility" element={<AdminEligibility />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
