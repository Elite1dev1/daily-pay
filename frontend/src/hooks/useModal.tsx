import { useState, useCallback } from 'react';
import { Modal, ModalProps } from '../components/Modal';

export interface UseModalReturn {
  showModal: (props: Omit<ModalProps, 'isOpen' | 'onClose'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title?: string
  ) => void;
  ModalComponent: React.ReactNode;
}

export const useModal = (): UseModalReturn => {
  const [modalProps, setModalProps] = useState<Omit<ModalProps, 'isOpen' | 'onClose'> | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Clear modal props after animation
    setTimeout(() => setModalProps(null), 300);
  }, []);

  const showModal = useCallback((props: Omit<ModalProps, 'isOpen' | 'onClose'>) => {
    setModalProps(props);
    setIsOpen(true);
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'success' });
  }, [showModal]);

  const showError = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'error' });
  }, [showModal]);

  const showInfo = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'info' });
  }, [showModal]);

  const showWarning = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'warning' });
  }, [showModal]);

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title?: string
  ) => {
    showModal({
      message,
      title,
      type: 'confirm',
      onConfirm,
      onCancel,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
    });
  }, [showModal]);

  const ModalComponent = modalProps ? (
    <Modal
      {...modalProps}
      isOpen={isOpen}
      onClose={closeModal}
    />
  ) : null;

  return {
    showModal,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showConfirm,
    ModalComponent,
  };
};
