import { useEffect, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { apiService } from '../../services/api';
import { useOffline } from '../../hooks/useOffline';
import { Link } from 'react-router-dom';

interface DashboardStats {
  unreconciledBalance: number;
  isLocked: boolean;
  canDeposit: boolean;
  totalDeposits: number;
  pendingWithdrawals: number;
}

interface Contributor {
  id: string;
  fullName: string;
  phoneNumber: string;
  address?: string;
  balance: number;
  isActive: boolean;
  onboardedAt: string;
  createdAt: string;
}

export default function AgentDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const { online } = useOffline();

  useEffect(() => {
    loadDashboard();
    loadContributors();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statusRes, depositsRes, withdrawalsRes] = await Promise.all([
        apiService.getDepositStatus(),
        apiService.getDeposits({ limit: 1 }),
        apiService.getWithdrawals({ state: 'REQUESTED', limit: 1 }),
      ]);

      setStats({
        unreconciledBalance: statusRes.data.unreconciledBalance,
        isLocked: statusRes.data.isLocked,
        canDeposit: statusRes.data.canDeposit,
        totalDeposits: depositsRes.meta?.total || 0,
        pendingWithdrawals: withdrawalsRes.meta?.total || 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContributors = async () => {
    try {
      const response = await apiService.listContributors({ limit: 100 });
      setContributors(response.data || []);
    } catch (error) {
      console.error('Failed to load contributors', error);
    } finally {
      setContributorsLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          {!online && (
            <Badge variant="warning">Offline Mode</Badge>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <Card title="Unreconciled Balance">
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: stats?.isLocked ? 'var(--error)' : 'var(--primary)' }}>
            ₦{stats?.unreconciledBalance.toLocaleString() || '0'}
          </div>
          {stats?.isLocked && (
            <Badge variant="error" style={{ marginTop: '0.5rem' }}>
              Account Locked
            </Badge>
          )}
          {!stats?.isLocked && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Limit: ₦10,000
            </p>
          )}
        </Card>

        <Card title="Total Deposits">
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {stats?.totalDeposits || 0}
          </div>
          <Link to="/agent/deposit">
            <Button variant="outline" size="sm" style={{ marginTop: '0.5rem' }}>
              New Deposit
            </Button>
          </Link>
        </Card>

        <Card title="Pending Withdrawals">
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {stats?.pendingWithdrawals || 0}
          </div>
          <Link to="/agent/withdrawals">
            <Button variant="outline" size="sm" style={{ marginTop: '0.5rem' }}>
              View All
            </Button>
          </Link>
        </Card>
      </div>

      <Card title="Quick Actions">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/agent/onboard">
            <Button variant="primary">Onboard New Contributor</Button>
          </Link>
          <Link to="/agent/deposit">
            <Button variant="primary" disabled={!stats?.canDeposit}>
              Create Deposit
            </Button>
          </Link>
          <Link to="/agent/withdrawals">
            <Button variant="secondary">Initiate Withdrawal</Button>
          </Link>
          <Link to="/agent/reconciliation">
            <Button variant="success">Request Reconciliation</Button>
          </Link>
        </div>
        {stats?.isLocked && (
          <p style={{ marginTop: '1rem', color: 'var(--error)', fontSize: '0.875rem' }}>
            ⚠️ Your account is locked. Please reconcile before creating new deposits.
          </p>
        )}
      </Card>

      <Card title="Onboarded Contributors" style={{ marginTop: '2rem' }}>
        {contributorsLoading ? (
          <div>Loading contributors...</div>
        ) : contributors.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No contributors onboarded yet.</p>
            <Link to="/agent/onboard">
              <Button variant="primary" style={{ marginTop: '1rem' }}>
                Onboard Your First Contributor
              </Button>
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Phone</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Address</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Balance</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Onboarded</th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((contributor) => (
                  <tr key={contributor.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {contributor.id}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{contributor.fullName}</td>
                    <td style={{ padding: '0.75rem' }}>{contributor.phoneNumber}</td>
                    <td style={{ padding: '0.75rem' }}>{contributor.address || '-'}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                      ₦{contributor.balance.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <Badge variant={contributor.isActive ? 'success' : 'error'}>
                        {contributor.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {new Date(contributor.onboardedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
