import { useState, useEffect } from 'react';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Table } from '../../components/Table';
import { apiService } from '../../services/api';
import { WithdrawalState } from '../../types';
import { useModal } from '../../hooks/useModal';

export default function Withdrawals() {
  const { showSuccess, showError, showWarning, ModalComponent } = useModal();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [formData, setFormData] = useState({
    contributorId: '',
    amount: '',
  });
  const [contributor, setContributor] = useState<any>(null);
  const [contributorLoading, setContributorLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      const res = await apiService.getWithdrawals();
      setWithdrawals(res.data);
    } catch (error) {
      console.error('Failed to load withdrawals', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContributor = async (contributorId: string) => {
    if (!contributorId || contributorId.trim().length < 10) {
      setContributor(null);
      return;
    }

    setContributorLoading(true);
    try {
      const res = await apiService.getContributorById(contributorId.trim());
      setContributor(res.data);
    } catch (error: any) {
      setContributor(null);
      // Don't show error if contributor not found - user might still be typing
      if (error.response?.status === 404) {
        // Contributor not found - clear contributor info
      }
    } finally {
      setContributorLoading(false);
    }
  };

  const handleContributorIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, contributorId: value });
  };

  // Debounce contributor fetch when contributorId changes
  useEffect(() => {
    if (!formData.contributorId.trim()) {
      setContributor(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchContributor(formData.contributorId.trim());
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.contributorId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    try {
      await apiService.createWithdrawal({
        contributorId: formData.contributorId,
        amount: parseFloat(formData.amount),
      });
      setShowCreateForm(false);
      setFormData({ contributorId: '', amount: '' });
      setContributor(null);
      loadWithdrawals();
      showSuccess('Withdrawal request created. OTP sent to contributor.');
    } catch (error: any) {
      showError(error.response?.data?.error?.message || 'Failed to create withdrawal');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVerifyOTP = async (withdrawalId: string) => {
    if (!otpCode) {
      showWarning('Please enter OTP code');
      return;
    }

    setOtpLoading(true);
    try {
      await apiService.verifyWithdrawalOTP(withdrawalId, otpCode);
      setOtpCode('');
      setSelectedWithdrawal(null);
      loadWithdrawals();
      showSuccess('OTP verified. Waiting for admin approval.');
    } catch (error: any) {
      showError(error.response?.data?.error?.message || 'Failed to verify OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const getStateBadge = (state: WithdrawalState) => {
    const variants: Record<WithdrawalState, 'primary' | 'success' | 'warning' | 'error' | 'secondary'> = {
      [WithdrawalState.REQUESTED]: 'warning',
      [WithdrawalState.OTP_VERIFIED]: 'primary',
      [WithdrawalState.PENDING_ADMIN]: 'primary',
      [WithdrawalState.APPROVED]: 'success',
      [WithdrawalState.EXECUTED]: 'success',
      [WithdrawalState.REJECTED]: 'error',
    };
    return <Badge variant={variants[state]}>{state}</Badge>;
  };

  const columns = [
    { key: 'contributorName', header: 'Contributor' },
    { key: 'amount', header: 'Amount', render: (w: any) => `₦${parseFloat(w.amount).toLocaleString()}` },
    { key: 'state', header: 'Status', render: (w: any) => getStateBadge(w.state) },
    { key: 'requestedAt', header: 'Requested', render: (w: any) => new Date(w.requestedAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      render: (w: any) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {w.state === WithdrawalState.REQUESTED && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setSelectedWithdrawal(w)}
            >
              Verify OTP
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Withdrawals</h2>
        <Button 
          variant="primary" 
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            if (showCreateForm) {
              // Clear form when closing
              setFormData({ contributorId: '', amount: '' });
              setContributor(null);
            }
          }}
        >
          {showCreateForm ? 'Cancel' : '+ New Withdrawal'}
        </Button>
      </div>

      {showCreateForm && (
        <Card title="Create Withdrawal Request" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleCreate}>
            <Input
              label="Contributor ID"
              value={formData.contributorId}
              onChange={handleContributorIdChange}
              required
              style={{ marginBottom: '1rem' }}
              placeholder="Enter contributor ID or paste from dashboard"
            />
            
            {contributorLoading && (
              <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Loading contributor...
              </div>
            )}

            {contributor && !contributorLoading && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '1rem', 
                backgroundColor: 'var(--gray-50)', 
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem' }}>{contributor.fullName}</h4>
                  <Badge variant={contributor.isActive ? 'success' : 'error'}>
                    {contributor.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Phone:</strong> {contributor.phoneNumber}
                  </div>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Balance:</strong> ₦{contributor.balance?.toLocaleString() || '0'}
                  </div>
                  {contributor.address && (
                    <div>
                      <strong>Address:</strong> {contributor.address}
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.contributorId && !contributor && !contributorLoading && (
              <div style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem', 
                backgroundColor: 'rgb(245 158 11 / 0.1)', 
                borderRadius: 'var(--border-radius)',
                color: 'var(--warning)',
                fontSize: '0.875rem'
              }}>
                ⚠️ Contributor not found. Please check the ID and try again.
              </div>
            )}

            <Input
              label="Amount (₦)"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              style={{ marginBottom: '1.5rem' }}
              max={contributor?.balance || undefined}
              helperText={contributor ? `Available balance: ₦${contributor.balance?.toLocaleString() || '0'}` : undefined}
            />
            <Button 
              type="submit" 
              variant="primary" 
              loading={createLoading}
              disabled={!contributor || !contributor.isActive}
            >
              Create Withdrawal
            </Button>
          </form>
        </Card>
      )}

      {selectedWithdrawal && (
        <Card title="Verify OTP" style={{ marginBottom: '2rem' }}>
          <p>Enter the OTP code sent to {selectedWithdrawal.contributorPhone}</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter OTP"
              style={{ flex: 1 }}
            />
            <Button
              variant="primary"
              onClick={() => handleVerifyOTP(selectedWithdrawal.id)}
              loading={otpLoading}
            >
              Verify
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedWithdrawal(null);
                setOtpCode('');
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card title="Withdrawal History">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Table columns={columns} data={withdrawals} emptyMessage="No withdrawals found" />
        )}
      </Card>
      {ModalComponent}
    </div>
  );
}
