import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { QRInputModal } from '../../components/QRInputModal';
import { apiService } from '../../services/api';
import { useGPS } from '../../hooks/useGPS';
import { useOffline } from '../../hooks/useOffline';
import { storeTransactionOffline } from '../../utils/offlineStorage';

export default function Deposit() {
  const navigate = useNavigate();
  const { position, error: gpsError, loading: gpsLoading, getCurrentPosition } = useGPS();
  const { online } = useOffline();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrHash, setQrHash] = useState('');
  const [contributor, setContributor] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await apiService.getDepositStatus();
      setStatus(res.data);
    } catch (error) {
      console.error('Failed to load status', error);
    }
  };

  const handleQRScan = async (qrValue: string) => {
    try {
      const hash = await generateQRHash(qrValue);
      setQrHash(hash);
      
      // Fetch contributor by QR
      const res = await apiService.getContributorByQR(hash);
      setContributor(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Contributor not found for this QR code');
      setContributor(null);
    }
  };

  const handleGetGPS = async () => {
    try {
      await getCurrentPosition();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!contributor || !contributor.id) {
      setError('Please scan QR code first and wait for contributor to load');
      return;
    }

    if (!position) {
      setError('GPS location is required. Please enable location access.');
      return;
    }

    if (status?.isLocked) {
      setError('Account is locked. Please reconcile first.');
      return;
    }

    setLoading(true);

    try {
      const contributorId = contributor?.id;
      if (!contributorId) {
        setError('Contributor ID is missing. Please scan QR code again.');
        return;
      }

      const depositData = {
        contributorId: contributorId,
        qrHash: qrHash,
        amount: parseFloat(amount),
        gpsLatitude: position.latitude,
        gpsLongitude: position.longitude,
        gpsAccuracy: position.accuracy,
      };

      if (online) {
        // Online: Create deposit directly
        await apiService.createDeposit(depositData);
        navigate('/agent', { state: { message: `Deposit of ₦${amount} created successfully!` } });
      } else {
        // Offline: Store locally
        const referenceId = `DEP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await storeTransactionOffline({
          id: referenceId,
          type: 'DEPOSIT',
          contributorId: contributor.id,
          qrHash: qrHash,
          amount: parseFloat(amount),
          gpsLatitude: position.latitude,
          gpsLongitude: position.longitude,
          gpsAccuracy: position.accuracy,
          referenceId,
          synced: false,
          createdAt: new Date().toISOString(),
        });
        navigate('/agent', { state: { message: `Deposit stored offline. Will sync when online.` } });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  const generateQRHash = async (qrData: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(qrData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Create Deposit</h2>

      {status?.isLocked && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--error)' }}>
            <span>⚠️</span>
            <div>
              <strong>Account Locked</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                Your unreconciled balance (₦{status.unreconciledBalance.toLocaleString()}) has reached the limit.
                Please reconcile before creating new deposits.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Deposit Information">
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ 
              padding: '1rem', 
              marginBottom: '1rem', 
              backgroundColor: 'rgb(239 68 68 / 0.1)', 
              color: 'var(--error)', 
              borderRadius: 'var(--border-radius)' 
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Scan Contributor QR Code *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                value={qrHash}
                onChange={(e) => setQrHash(e.target.value)}
                placeholder="Scan QR code"
                required
                style={{ flex: 1 }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowQRModal(true)}
              >
                📷 Scan
              </Button>
            </div>
            {contributor && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--gray-50)', borderRadius: 'var(--border-radius)' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{contributor.fullName}</p>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Phone: {contributor.phoneNumber} | Balance: ₦{contributor.balance.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <Input
            label="Amount (₦)"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{ marginBottom: '1rem' }}
          />

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              GPS Location *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Button
                type="button"
                variant="outline"
                onClick={handleGetGPS}
                loading={gpsLoading}
              >
                📍 Get Location
              </Button>
              {position && (
                <Badge variant="success">
                  ✓ Location captured
                </Badge>
              )}
              {gpsError && (
                <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                  {gpsError}
                </span>
              )}
            </div>
            {position && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Lat: {position.latitude.toFixed(6)}, Lng: {position.longitude.toFixed(6)}
                {position.accuracy && ` (Accuracy: ${Math.round(position.accuracy)}m)`}
              </p>
            )}
          </div>

          {!online && (
            <div style={{ 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              backgroundColor: 'rgb(245 158 11 / 0.1)', 
              borderRadius: 'var(--border-radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>⚠️</span>
              <span style={{ fontSize: '0.875rem' }}>
                You are offline. This deposit will be stored locally and synced when you come online.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button 
              type="submit" 
              variant="primary" 
              loading={loading} 
              disabled={!contributor || !position || status?.isLocked}
              fullWidth
            >
              Create Deposit
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/agent')}
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <QRInputModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onConfirm={handleQRScan}
        title="Scan QR Code"
        message="Enter QR code or use camera scanner"
      />
    </div>
  );
}
