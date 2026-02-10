import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { apiService } from '../../services/api';
import { useModal } from '../../hooks/useModal';

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

export default function SuperAdminDashboard() {
  const { showSuccess, showError, ModalComponent } = useModal();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorsLoading, setContributorsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'agent',
  });

  useEffect(() => {
    loadContributors();
  }, []);

  const fetchUsers = async () => {
    // Note: This endpoint needs to be created in the backend
    // For now, we'll show the form to create users
    setLoading(false);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiService.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || undefined,
        role: formData.role,
      });

      if (response.success) {
        showSuccess('User created successfully!');
        setFormData({
          email: '',
          password: '',
          fullName: '',
          phoneNumber: '',
          role: 'agent',
        });
        setShowCreateForm(false);
        fetchUsers();
      }
    } catch (error: any) {
      showError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Super Admin Dashboard</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? 'Cancel' : '+ Create User'}
        </Button>
      </div>

      {showCreateForm && (
        <Card title="Create New User" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              <Input
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                  required
                >
                  <option value="agent">Agent</option>
                  <option value="operations_admin">Operations Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="System Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>📊</h3>
            <p style={{ margin: 0, fontWeight: 'bold' }}>System Status</p>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Operational</p>
          </div>
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>👥</h3>
            <p style={{ margin: 0, fontWeight: 'bold' }}>User Management</p>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Create & Manage Users</p>
          </div>
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>⚙️</h3>
            <p style={{ margin: 0, fontWeight: 'bold' }}>System Settings</p>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Coming Soon</p>
          </div>
          <div style={{ padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>📋</h3>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Audit Logs</p>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>Full Visibility</p>
          </div>
        </div>
      </Card>

      <Card title="Quick Actions" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button onClick={() => setShowCreateForm(true)}>Create Agent</Button>
          <Button onClick={() => {
            setFormData({ ...formData, role: 'operations_admin' });
            setShowCreateForm(true);
          }}>
            Create Operations Admin
          </Button>
          <Button variant="outline">View System Settings</Button>
          <Button variant="outline">View Audit Logs</Button>
        </div>
      </Card>

      <Card title="All Contributors" style={{ marginTop: '2rem' }}>
        {contributorsLoading ? (
          <div>Loading contributors...</div>
        ) : contributors.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No contributors onboarded yet.</p>
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
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        backgroundColor: contributor.isActive ? 'var(--success)' : 'var(--error)',
                        color: 'white'
                      }}>
                        {contributor.isActive ? 'Active' : 'Inactive'}
                      </span>
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
      {ModalComponent}
    </div>
  );
}
