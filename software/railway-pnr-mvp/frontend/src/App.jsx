import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CoachAttendantDashboard from './pages/CoachAttendantDashboard.jsx';
import PassengerDashboard from './pages/PassengerDashboard.jsx';
import LinenOpsDashboard from './pages/linenops/LinenOpsDashboard.jsx';
import CreateKit from './pages/linenops/CreateKit.jsx';
import RegisterPillow from './pages/linenops/RegisterPillow.jsx';
import ScanFind from './pages/linenops/ScanFind.jsx';
import Inventory from './pages/linenops/Inventory.jsx';
import Kits from './pages/linenops/Kits.jsx';
import Overview from './pages/railway/Overview.jsx';
import Passengers from './pages/railway/Passengers.jsx';
import LinenTracking from './pages/railway/LinenTracking.jsx';
import Incidents from './pages/railway/Incidents.jsx';
import Blacklist from './pages/railway/Blacklist.jsx';
import Reports from './pages/railway/Reports.jsx';
import AuditLogPage from './pages/railway/AuditLogPage.jsx';

function homePathFor(role) {
  if (role === 'coach_attendant') return '/attendant';
  if (role === 'linen_operator') return '/linen-ops';
  if (role === 'railway_officer') return '/railway';
  return `/${role}`;
}

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-rail-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role) && user.role !== 'admin') return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <Protected role="admin">
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/attendant"
        element={
          <Protected role="coach_attendant">
            <CoachAttendantDashboard />
          </Protected>
        }
      />
      <Route
        path="/passenger"
        element={
          <Protected role="passenger">
            <PassengerDashboard />
          </Protected>
        }
      />
      <Route
        path="/linen-ops"
        element={
          <Protected role="linen_operator">
            <LinenOpsDashboard />
          </Protected>
        }
      />
      <Route
        path="/linen-ops/create-kit"
        element={
          <Protected role="linen_operator">
            <CreateKit />
          </Protected>
        }
      />
      <Route
        path="/linen-ops/register-pillow"
        element={
          <Protected role="linen_operator">
            <RegisterPillow />
          </Protected>
        }
      />
      <Route
        path="/linen-ops/scan"
        element={
          <Protected role="linen_operator">
            <ScanFind />
          </Protected>
        }
      />
      <Route
        path="/linen-ops/inventory"
        element={
          <Protected role="linen_operator">
            <Inventory />
          </Protected>
        }
      />
      <Route
        path="/linen-ops/kits"
        element={
          <Protected role="linen_operator">
            <Kits />
          </Protected>
        }
      />
      <Route
        path="/railway"
        element={
          <Protected role="railway_officer">
            <Overview />
          </Protected>
        }
      />
      <Route
        path="/railway/passengers"
        element={
          <Protected role="railway_officer">
            <Passengers />
          </Protected>
        }
      />
      <Route
        path="/railway/linen"
        element={
          <Protected role="railway_officer">
            <LinenTracking />
          </Protected>
        }
      />
      <Route
        path="/railway/incidents"
        element={
          <Protected role="railway_officer">
            <Incidents />
          </Protected>
        }
      />
      <Route
        path="/railway/blacklist"
        element={
          <Protected role="railway_officer">
            <Blacklist />
          </Protected>
        }
      />
      <Route
        path="/railway/reports"
        element={
          <Protected role="railway_officer">
            <Reports />
          </Protected>
        }
      />
      <Route
        path="/railway/audit"
        element={
          <Protected role="railway_officer">
            <AuditLogPage />
          </Protected>
        }
      />
      <Route
        path="*"
        element={<Navigate to={user ? homePathFor(user.role) : '/login'} replace />}
      />
    </Routes>
  );
}
