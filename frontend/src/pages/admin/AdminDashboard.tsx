import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { apiService } from '../../services/api';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [withdrawalsRes, reconciliationsRes] = await Promise.all([
        apiService.getPendingWithdrawals({ limit: 1 }),
        apiService.getPendingReconciliations({ limit: 1 }),
      ]);

      setStats({
        pendingWithdrawals: withdrawalsRes.meta?.total || 0,
        pendingReconciliations: reconciliationsRes.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <Card title="Pending Withdrawals">
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {stats?.pendingWithdrawals || 0}
          </div>
          <Link to="/admin/withdrawals">
            <Button variant="primary" fullWidth>
              Review Withdrawals
            </Button>
          </Link>
        </Card>

        <Card title="Pending Reconciliations">
          <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {stats?.pendingReconciliations || 0}
          </div>
          <Link to="/admin/reconciliations">
            <Button variant="primary" fullWidth>
              Review Reconciliations
            </Button>
          </Link>
        </Card>
      </div>

      <Card title="Quick Actions">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/admin/withdrawals">
            <Button variant="primary">Approve Withdrawals</Button>
          </Link>
          <Link to="/admin/reconciliations">
            <Button variant="success">Process Reconciliations</Button>
          </Link>
          <Link to="/admin/audit">
            <Button variant="secondary">View Audit Logs</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
