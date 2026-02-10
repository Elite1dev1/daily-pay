import { Routes, Route } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import AgentDashboard from './AgentDashboard';
import OnboardContributor from './OnboardContributor';
import Deposit from './Deposit';
import Withdrawals from './Withdrawals';
import Reconciliation from './Reconciliation';

export default function AgentLayout() {
  const navItems = [
    { path: '/agent', label: 'Dashboard', icon: '📊' },
    { path: '/agent/onboard', label: 'Onboard Contributor', icon: '➕' },
    { path: '/agent/deposit', label: 'Deposit', icon: '💰' },
    { path: '/agent/withdrawals', label: 'Withdrawals', icon: '💸' },
    { path: '/agent/reconciliation', label: 'Reconciliation', icon: '🔄' },
  ];

  return (
    <Layout title="Agent Dashboard" navItems={navItems}>
      <Routes>
        <Route index element={<AgentDashboard />} />
        <Route path="onboard" element={<OnboardContributor />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="withdrawals" element={<Withdrawals />} />
        <Route path="reconciliation" element={<Reconciliation />} />
      </Routes>
    </Layout>
  );
}
