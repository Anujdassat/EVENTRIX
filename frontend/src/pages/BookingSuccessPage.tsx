import React from 'react';
import type { BookingDTO } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

interface BookingSuccessPageProps {
  booking: BookingDTO;
  onViewHistory: () => void;
  onExploreMore: () => void;
}

export const BookingSuccessPage: React.FC<BookingSuccessPageProps> = ({
  booking,
  onViewHistory,
  onExploreMore,
}) => {
  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto' }}>
      {/* Success Banner */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid #10B981',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1rem',
          }}
        >
          ✓
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.4rem' }}>
          Booking Confirmed!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Your seats are secured. A confirmation record has been generated.
        </p>
      </div>

      {/* Ticket Card */}
      <div
        className="card"
        style={{
          border: '1px solid rgba(99, 102, 241, 0.35)',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.95))',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          padding: '2rem',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px dashed var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Booking Reference
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#60A5FA',
                letterSpacing: '0.05em',
              }}
            >
              {booking.bookingRef}
            </div>
          </div>
          <Badge variant="AVAILABLE">CONFIRMED</Badge>
        </div>

        {/* Event Info */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
            {booking.eventName}
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Confirmed on {new Date(booking.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Seats List */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Secured Seats ({booking.seats.length}):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {booking.seats.map((seat) => (
              <div
                key={seat.seatId}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ fontWeight: 700, color: '#fff' }}>Row {seat.row}, Seat {seat.number}</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span style={{ color: '#34D399' }}>${seat.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulated QR Code / Total */}
        <div
          style={{
            borderTop: '1px dashed var(--border-subtle)',
            paddingTop: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Simulated QR barcode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                background: '#fff',
                borderRadius: '6px',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '2px',
                padding: '4px',
              }}
            >
              {[1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1].map((val, idx) => (
                <div key={idx} style={{ background: val ? '#000' : 'transparent' }} />
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '140px' }}>
              Simulated ByteVox digital pass
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Paid</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34D399' }}>
              ${booking.totalAmount}
            </div>
          </div>
        </div>
      </div>

      {/* Action Navigation Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <Button variant="secondary" onClick={onExploreMore} style={{ flex: 1 }}>
          ← Explore More Events
        </Button>
        <Button variant="primary" onClick={onViewHistory} style={{ flex: 1 }}>
          View in My Bookings →
        </Button>
      </div>
    </div>
  );
};
