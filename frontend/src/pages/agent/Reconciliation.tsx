import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import { apiService } from '../../services/api';
import { useModal } from '../../hooks/useModal';

export default function Reconciliation() {
  const { showSuccess, showError, ModalComponent } = useModal();
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [formData, setFormData] = useState({
    cashAmountPresented: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, reconciliationsRes] = await Promise.all([
        apiService.getDepositStatus(),
        apiService.getReconciliations(),
      ]);
      setStatus(statusRes.data);
      setReconciliations(reconciliationsRes.data);
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);

    try {
      await apiService.createReconciliation({
        cashAmountPresented: parseFloat(formData.cashAmountPresented),
        notes: formData.notes,
      });
      setShowRequestForm(false);
      setFormData({ cashAmountPresented: '', notes: '' });
      loadData();
      showSuccess('Reconciliation request submitted. Waiting for admin approval.');
    } catch (error: any) {
      showError(error.response?.data?.error?.message || 'Failed to create reconciliation request');
    } finally {
      setRequestLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'secondary'> = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const columns = [
    { key: 'unreconciledBalanceBefore', header: 'Balance Before', render: (r: any) => `₦${parseFloat(r.unreconciledBalanceBefore).toLocaleString()}` },
    { key: 'cashAmountPresented', header: 'Cash Presented', render: (r: any) => `₦${parseFloat(r.cashAmountPresented).toLocaleString()}` },
    { key: 'discrepancy', header: 'Discrepancy', render: (r: any) => {
      const disc = parseFloat(r.discrepancy);
      return <span style={{ color: disc !== 0 ? 'var(--error)' : 'var(--success)' }}>
        {disc > 0 ? '+' : ''}₦{disc.toLocaleString()}
      </span>;
    }},
    { key: 'status', header: 'Status', render: (r: any) => getStatusBadge(r.status) },
    { key: 'createdAt', header: 'Requested', render: (r: any) => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Reconciliation</h2>

      {status && (
        <Card title="Current Status" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Unreconciled Balance</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
                ₦{status.unreconciledBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status</p>
              <div style={{ marginTop: '0.5rem' }}>
                {status.isLocked ? (
                  <Badge variant="error">Locked</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </div>
            </div>
          </div>
          {status.isLocked && (
            <p style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgb(239 68 68 / 0.1)', borderRadius: 'var(--border-radius)', color: 'var(--error)', fontSize: '0.875rem' }}>
              ⚠️ Your account is locked. Please request reconciliation to unlock.
            </p>
          )}
        </Card>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0 }}>Reconciliation History</h3>
        <Button 
          variant="primary" 
          onClick={() => setShowRequestForm(!showRequestForm)}
          disabled={status?.unreconciledBalance === 0}
        >
          {showRequestForm ? 'Cancel' : '+ Request Reconciliation'}
        </Button>
      </div>

      {showRequestForm && (
        <Card title="Request Reconciliation" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleRequest}>
            <Input
              label="Cash Amount Presented (₦)"
              type="number"
              step="0.01"
              min="0"
              value={formData.cashAmountPresented}
              onChange={(e) => setFormData({ ...formData, cashAmountPresented: e.target.value })}
              required
              style={{ marginBottom: '1rem' }}
              helperText={`Expected: ₦${status?.unreconciledBalance.toLocaleString() || '0'}`}
            />
            <Input
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{ marginBottom: '1.5rem' }}
            />
            <Button type="submit" variant="primary" loading={requestLoading}>
              Submit Request
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Table columns={columns} data={reconciliations} emptyMessage="No reconciliation requests found" />
        )}
      </Card>
      {ModalComponent}
    </div>
  );
}
