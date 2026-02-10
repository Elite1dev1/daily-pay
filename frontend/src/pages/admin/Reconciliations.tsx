import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { apiService } from '../../services/api';
import { useModal } from '../../hooks/useModal';

export default function Reconciliations() {
  const { showSuccess, showError, showWarning, showConfirm, ModalComponent } = useModal();
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReconciliations();
  }, []);

  const loadReconciliations = async () => {
    try {
      const res = await apiService.getPendingReconciliations();
      setReconciliations(res.data);
    } catch (error) {
      console.error('Failed to load reconciliations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    showConfirm(
      'Are you sure you want to approve this reconciliation? This will unlock the agent account.',
      async () => {
        setActionLoading(true);
        try {
          await apiService.approveReconciliation(id);
          showSuccess('Reconciliation approved. Agent account unlocked.');
          loadReconciliations();
          setSelectedReconciliation(null);
        } catch (error: any) {
          showError(error.response?.data?.error?.message || 'Failed to approve reconciliation');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      showWarning('Please provide a rejection reason');
      return;
    }

    showConfirm(
      'Are you sure you want to reject this reconciliation?',
      async () => {
        setActionLoading(true);
        try {
          await apiService.rejectReconciliation(selectedReconciliation.id, rejectionReason);
          showSuccess('Reconciliation rejected.');
          loadReconciliations();
          setSelectedReconciliation(null);
          setRejectionReason('');
        } catch (error: any) {
          showError(error.response?.data?.error?.message || 'Failed to reject reconciliation');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const columns = [
    { key: 'agentName', header: 'Agent' },
    { key: 'unreconciledBalanceBefore', header: 'Balance Before', render: (r: any) => `₦${parseFloat(r.unreconciledBalanceBefore).toLocaleString()}` },
    { key: 'cashAmountPresented', header: 'Cash Presented', render: (r: any) => `₦${parseFloat(r.cashAmountPresented).toLocaleString()}` },
    { key: 'discrepancy', header: 'Discrepancy', render: (r: any) => {
      const disc = parseFloat(r.discrepancy);
      return <span style={{ color: disc !== 0 ? 'var(--error)' : 'var(--success)' }}>
        {disc > 0 ? '+' : ''}₦{disc.toLocaleString()}
      </span>;
    }},
    { key: 'createdAt', header: 'Requested', render: (r: any) => new Date(r.createdAt).toLocaleString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            size="sm"
            variant="success"
            onClick={() => handleApprove(r.id)}
            disabled={actionLoading}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setSelectedReconciliation(r)}
            disabled={actionLoading}
          >
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Pending Reconciliations</h2>

      {selectedReconciliation && (
        <Card title="Reject Reconciliation" style={{ marginBottom: '2rem' }}>
          <p><strong>Agent:</strong> {selectedReconciliation.agentName}</p>
          <p><strong>Balance Before:</strong> ₦{parseFloat(selectedReconciliation.unreconciledBalanceBefore).toLocaleString()}</p>
          <p><strong>Cash Presented:</strong> ₦{parseFloat(selectedReconciliation.cashAmountPresented).toLocaleString()}</p>
          <Input
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
            style={{ marginTop: '1rem', marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={actionLoading}
            >
              Confirm Rejection
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReconciliation(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card title="Reconciliations Awaiting Approval">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Table columns={columns} data={reconciliations} emptyMessage="No pending reconciliations" />
        )}
      </Card>
      {ModalComponent}
    </div>
  );
}
