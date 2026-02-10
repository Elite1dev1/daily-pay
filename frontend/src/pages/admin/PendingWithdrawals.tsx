import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import { apiService } from '../../services/api';
import { useModal } from '../../hooks/useModal';

export default function PendingWithdrawals() {
  const { showSuccess, showError, showWarning, showConfirm, ModalComponent } = useModal();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      const res = await apiService.getPendingWithdrawals();
      setWithdrawals(res.data);
    } catch (error) {
      console.error('Failed to load withdrawals', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    showConfirm(
      'Are you sure you want to approve this withdrawal?',
      async () => {
        setActionLoading(true);
        try {
          await apiService.approveWithdrawal(id);
          showSuccess('Withdrawal approved successfully!');
          loadWithdrawals();
          setSelectedWithdrawal(null);
        } catch (error: any) {
          showError(error.response?.data?.error?.message || 'Failed to approve withdrawal');
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
      'Are you sure you want to reject this withdrawal?',
      async () => {
        setActionLoading(true);
        try {
          await apiService.rejectWithdrawal(selectedWithdrawal.id, rejectionReason);
          showSuccess('Withdrawal rejected.');
          loadWithdrawals();
          setSelectedWithdrawal(null);
          setRejectionReason('');
        } catch (error: any) {
          showError(error.response?.data?.error?.message || 'Failed to reject withdrawal');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const columns = [
    { key: 'contributorName', header: 'Contributor' },
    { key: 'contributorPhone', header: 'Phone' },
    { key: 'amount', header: 'Amount', render: (w: any) => `₦${parseFloat(w.amount).toLocaleString()}` },
    { key: 'state', header: 'Status', render: (w: any) => <Badge variant="primary">{w.state}</Badge> },
    { key: 'requestedAt', header: 'Requested', render: (w: any) => new Date(w.requestedAt).toLocaleString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (w: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            size="sm"
            variant="success"
            onClick={() => handleApprove(w.id)}
            disabled={actionLoading}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setSelectedWithdrawal(w)}
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
      <h2 style={{ marginBottom: '2rem' }}>Pending Withdrawals</h2>

      {selectedWithdrawal && (
        <Card title="Reject Withdrawal" style={{ marginBottom: '2rem' }}>
          <p><strong>Contributor:</strong> {selectedWithdrawal.contributorName}</p>
          <p><strong>Amount:</strong> ₦{parseFloat(selectedWithdrawal.amount).toLocaleString()}</p>
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
                setSelectedWithdrawal(null);
                setRejectionReason('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card title="Withdrawals Awaiting Approval">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Table columns={columns} data={withdrawals} emptyMessage="No pending withdrawals" />
        )}
      </Card>
      {ModalComponent}
    </div>
  );
}
