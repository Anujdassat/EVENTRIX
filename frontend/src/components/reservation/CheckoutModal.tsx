import React, { useState } from 'react';
import { useReservation } from '../../context/ReservationContext';
import { bookingsApi } from '../../api/bookings.api';
import type { BookingDTO } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: BookingDTO) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { activeReservation, formattedTime, remainingSeconds, clearReservation, cancelCurrentReservation } =
    useReservation();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!activeReservation) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const booking = await bookingsApi.confirm(activeReservation.id, {
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        simulatePaymentFailure: simulateFailure,
      });

      clearReservation();
      onClose();
      onSuccess(booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed. Please check reservation status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = remainingSeconds <= 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Ticket Checkout">
      {isExpired ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: '#EF4444', fontWeight: 600, marginBottom: '1rem' }}>
            Your 5-minute reservation window has expired and seats have been released.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Back to Seat Map
          </Button>
        </div>
      ) : (
        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Reservation Timer Alert */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Reservation expires in:</span>
            <span style={{ fontWeight: 700, color: '#FBBF24', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
              ⏱ {formattedTime}
            </span>
          </div>

          {/* Cart Breakdown */}
          <div
            style={{
              background: 'var(--bg-surface)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Reserved Seats:</span>
              <span style={{ fontWeight: 600, color: '#fff' }}>{activeReservation.seatIds.length} Seat(s)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <span>Total Price:</span>
              <span style={{ color: '#34D399' }}>${activeReservation.totalPrice}</span>
            </div>
          </div>

          {/* Customer Inputs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              Full Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
              Email Address (For ticket confirmation)
            </label>
            <input
              type="email"
              placeholder="e.g. alex@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Test Simulation Checkbox */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px dashed rgba(99, 102, 241, 0.3)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
                style={{ accentColor: '#6366F1', width: '16px', height: '16px' }}
              />
              <span style={{ color: '#A5B4FC', fontWeight: 500 }}>
                🧪 Simulate Payment Failure (ByteVox assignment test option)
              </span>
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#F87171',
                fontSize: '0.875rem',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Modal Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                await cancelCurrentReservation();
                onClose();
              }}
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
            >
              Release Hold
            </Button>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              style={{ minWidth: '160px' }}
            >
              Pay ${activeReservation.totalPrice} →
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
