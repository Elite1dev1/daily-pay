import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';

export interface QRInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (qrValue: string) => void;
  title?: string;
  message?: string;
}

export const QRInputModal: React.FC<QRInputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Scan QR Code',
  message = 'Enter QR code or use camera scanner',
}) => {
  const [qrValue, setQrValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQrValue('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!qrValue.trim()) {
      return; // Don't close if empty
    }
    onConfirm(qrValue.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qrValue.trim()) {
      handleConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      message={message}
      type="confirm"
      onConfirm={handleConfirm}
      onCancel={onClose}
      confirmText="Confirm"
      cancelText="Cancel"
    >
      <div style={{ marginTop: '1rem' }}>
        <Input
          value={qrValue}
          onChange={(e) => setQrValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter QR code value"
          autoFocus
          style={{ width: '100%' }}
        />
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          You can paste a QR code value here or use a camera scanner
        </p>
      </div>
    </Modal>
  );
};
