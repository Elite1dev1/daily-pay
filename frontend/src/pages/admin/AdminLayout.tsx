import { Routes, Route } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import AdminDashboard from './AdminDashboard';
import PendingWithdrawals from './PendingWithdrawals';
import Reconciliations from './Reconciliations';
import AuditLogs from './AuditLogs';

export default function AdminLayout() {
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/withdrawals', label: 'Pending Withdrawals', icon: '💸' },
    { path: '/admin/reconciliations', label: 'Reconciliations', icon: '🔄' },
    { path: '/admin/audit', label: 'Audit Logs', icon: '📋' },
  ];

  return (
    <Layout title="Operations Admin Dashboard" navItems={navItems}>
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="withdrawals" element={<PendingWithdrawals />} />
        <Route path="reconciliations" element={<Reconciliations />} />
        <Route path="audit" element={<AuditLogs />} />
      </Routes>
    </Layout>
  );
}
