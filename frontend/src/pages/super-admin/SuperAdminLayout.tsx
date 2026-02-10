import { Routes, Route } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import SuperAdminDashboard from './SuperAdminDashboard';
import FinancialDashboard from './FinancialDashboard';
import AgentMonitoring from './AgentMonitoring';

export default function SuperAdminLayout() {
  const navItems = [
    { path: '/super-admin', label: 'Dashboard', icon: '📊' },
    { path: '/super-admin/financial', label: 'Financial Dashboard', icon: '💰' },
    { path: '/super-admin/agents', label: 'Agent Monitoring', icon: '👥' },
    // Add more routes as needed for reversals, settings, etc.
  ];

  return (
    <Layout title="Super Admin Dashboard" navItems={navItems}>
      <Routes>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="financial" element={<FinancialDashboard />} />
        <Route path="agents" element={<AgentMonitoring />} />
      </Routes>
    </Layout>
  );
}
