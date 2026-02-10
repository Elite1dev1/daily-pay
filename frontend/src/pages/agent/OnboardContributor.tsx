import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { QRInputModal } from '../../components/QRInputModal';
import { apiService } from '../../services/api';
import { contributorService } from '../../services/contributorService';

export default function OnboardContributor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    address: '',
    idPhotographUrl: '',
  });

  const handleQRScan = async (qrValue: string) => {
    setQrData(qrValue);
    // Generate QR hash from scanned data
    const qrHash = await contributorService.generateQRHash(qrValue);
    // Store for later use in form submission
    (window as any).pendingQRHash = qrHash;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!qrData) {
        throw new Error('Please scan QR code first');
      }

      const qrHash = (window as any).pendingQRHash || await contributorService.generateQRHash(qrData);

      await apiService.onboardContributor({
        ...formData,
        qrHash,
      });

      navigate('/agent', { state: { message: 'Contributor onboarded successfully!' } });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to onboard contributor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '2rem' }}>Onboard New Contributor</h2>

      <Card title="Contributor Information">
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
              QR Code (Scan Physical Card) *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Scan or enter QR code"
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
            {qrData && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--success)' }}>
                ✓ QR code captured
              </p>
            )}
          </div>

          <Input
            label="Full Name"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            style={{ marginBottom: '1rem' }}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            required
            style={{ marginBottom: '1rem' }}
            helperText="Format: 08012345678"
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            style={{ marginBottom: '1rem' }}
          />

          <Input
            label="ID Photograph URL (Optional)"
            type="url"
            value={formData.idPhotographUrl}
            onChange={(e) => setFormData({ ...formData, idPhotographUrl: e.target.value })}
            style={{ marginBottom: '1.5rem' }}
            helperText="URL to uploaded ID photograph"
          />

          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="submit" variant="primary" loading={loading} fullWidth>
              Onboard Contributor
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
