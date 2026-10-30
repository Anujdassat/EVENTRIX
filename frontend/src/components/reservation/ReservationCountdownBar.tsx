import React from 'react';
import { useReservation } from '../../context/ReservationContext';
import { Button } from '../common/Button';

interface ReservationCountdownBarProps {
  onOpenCheckout: () => void;
}

export const ReservationCountdownBar: React.FC<ReservationCountdownBarProps> = ({
  onOpenCheckout,
}) => {
  const { activeReservation, formattedTime, remainingSeconds, cancelCurrentReservation } =
    useReservation();

  if (!activeReservation || remainingSeconds <= 0) {
    return null;
  }

  return (
    <aside className="floating-timer-bar" aria-label="Reservation countdown timer">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Seats Temporarily Held
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
            {activeReservation.seatIds.length} Seat{activeReservation.seatIds.length > 1 ? 's' : ''} • ${activeReservation.totalPrice}
          </span>
          <span className="timer-digits">⏱ {formattedTime}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button variant="danger" onClick={cancelCurrentReservation} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
          Release
        </Button>
        <Button variant="primary" onClick={onOpenCheckout} style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
          Checkout Now →
        </Button>
      </div>
    </aside>
  );
};
