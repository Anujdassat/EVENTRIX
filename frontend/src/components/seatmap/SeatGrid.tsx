import React, { useState } from 'react';
import type { SeatDTO } from '../../types';
import { Button } from '../common/Button';

interface SeatGridProps {
  seats: SeatDTO[];
  onReserveSeats: (seatIds: string[]) => Promise<void>;
  isReserving?: boolean;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  seats,
  onReserveSeats,
  isReserving = false,
}) => {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Group seats by Row (e.g. A: [1, 2, ...], B: [1, 2, ...])
  const rowsMap = new Map<string, SeatDTO[]>();
  for (const seat of seats) {
    if (!rowsMap.has(seat.row)) {
      rowsMap.set(seat.row, []);
    }
    rowsMap.get(seat.row)!.push(seat);
  }

  // Sort rows alphabetically and seats by number
  const sortedRows = Array.from(rowsMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  sortedRows.forEach(([, rowSeats]) => {
    rowSeats.sort((a, b) => a.number - b.number);
  });

  const toggleSeat = (seat: SeatDTO) => {
    if (seat.status !== 'AVAILABLE') return;
    setErrorMessage(null);

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        if (prev.length >= 10) {
          setErrorMessage('You can select a maximum of 10 seats per booking.');
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  const handleReserve = async () => {
    if (selectedSeatIds.length === 0) return;
    try {
      setErrorMessage(null);
      await onReserveSeats(selectedSeatIds);
      setSelectedSeatIds([]); // Clear on success
    } catch (err: any) {
      setErrorMessage(err.message || 'Seat reservation failed. Some seats may have been claimed.');
    }
  };

  const getSeatColor = (seat: SeatDTO) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    if (isSelected) {
      return {
        bg: 'rgba(6, 182, 212, 0.25)',
        border: '#06B6D4',
        text: '#fff',
        shadow: '0 0 10px rgba(6, 182, 212, 0.4)',
      };
    }
    switch (seat.status) {
      case 'AVAILABLE':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.4)',
          text: '#34D399',
          shadow: 'none',
        };
      case 'HELD':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.4)',
          text: '#FBBF24',
          shadow: 'none',
        };
      case 'BOOKED':
        return {
          bg: 'rgba(51, 65, 85, 0.35)',
          border: 'rgba(51, 65, 85, 0.5)',
          text: '#64748B',
          shadow: 'none',
        };
      default:
        return {
          bg: 'transparent',
          border: 'var(--border-subtle)',
          text: '#fff',
          shadow: 'none',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Legend & Tier Info */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981' }} />
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.3)', border: '1px solid #06B6D4' }} />
            <span>Selected</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B' }} />
            <span>Held (Other User)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid #64748B' }} />
            <span>Booked</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Tiers:</span>
          <span style={{ color: '#F472B6' }}>● VIP</span>
          <span style={{ color: '#A78BFA' }}>● Premium</span>
          <span style={{ color: '#60A5FA' }}>● Standard</span>
        </div>
      </div>

      {/* Stage Visual */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            height: '14px',
            background: 'linear-gradient(to right, transparent, #6366F1, transparent)',
            borderRadius: '9999px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)',
          }}
        />
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: '0.5rem' }}>
          STAGE / FRONT SCREEN
        </div>
      </div>

      {/* Interactive Seat Matrix */}
      <div
        style={{
          overflowX: 'auto',
          padding: '1.5rem 0',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 'min-content' }}>
          {sortedRows.map(([rowLetter, rowSeats]) => (
            <div key={rowLetter} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* Row Label */}
              <div
                style={{
                  width: '28px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                {rowLetter}
              </div>

              {/* Seats in Row */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {rowSeats.map((seat) => {
                  const colors = getSeatColor(seat);
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isAvailable = seat.status === 'AVAILABLE';

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => toggleSeat(seat)}
                      title={`Row ${seat.row}, Seat ${seat.number} (${seat.section}) - $${seat.price} [${seat.status}]`}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: colors.bg,
                        border: `1.5px solid ${colors.border}`,
                        color: colors.text,
                        boxShadow: colors.shadow,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (isAvailable && !isSelected) {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.borderColor = '#10B981';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isAvailable && !isSelected) {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.borderColor = colors.border;
                        }
                      }}
                    >
                      {seat.status === 'BOOKED' ? (
                        '✕'
                      ) : seat.status === 'HELD' ? (
                        '⏱'
                      ) : isSelected ? (
                        '✓'
                      ) : (
                        seat.number
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Duplicate row label for convenience */}
              <div
                style={{
                  width: '28px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                }}
              >
                {rowLetter}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#F87171',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Bottom Selection Summary Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(30, 41, 59, 0.9))',
          borderColor: selectedSeatIds.length > 0 ? 'var(--primary)' : 'var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected Seats</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#fff' }}>
              {selectedSeats.length > 0
                ? selectedSeats.map((s) => `${s.row}${s.number}`).join(', ')
                : 'No seats selected'}
            </span>
            {selectedSeats.length > 0 && (
              <span style={{ fontSize: '1.1rem', color: '#34D399', fontWeight: 700 }}>
                (${totalPrice})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {selectedSeatIds.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setSelectedSeatIds([])}
              style={{ fontSize: '0.85rem' }}
            >
              Clear
            </Button>
          )}

          <Button
            variant="primary"
            disabled={selectedSeatIds.length === 0 || isReserving}
            isLoading={isReserving}
            onClick={handleReserve}
            style={{ minWidth: '180px' }}
          >
            Hold Seats (5 Mins) →
          </Button>
        </div>
      </div>
    </div>
  );
};
