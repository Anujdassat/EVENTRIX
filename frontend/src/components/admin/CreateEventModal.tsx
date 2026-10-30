import React, { useState } from 'react';
import { eventsApi } from '../../api/events.api';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [seatsPerRow, setSeatsPerRow] = useState(10);
  const [selectedRows, setSelectedRows] = useState<string[]>(['A', 'B', 'C', 'D']);
  
  const [vipPrice, setVipPrice] = useState(120);
  const [premiumPrice, setPremiumPrice] = useState(75);
  const [standardPrice, setStandardPrice] = useState(40);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allAvailableRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  const toggleRow = (row: string) => {
    setSelectedRows((prev) => {
      if (prev.includes(row)) {
        if (prev.length <= 1) return prev; // Keep at least 1 row
        return prev.filter((r) => r !== row);
      } else {
        return [...prev, row].sort();
      }
    });
  };

  const totalSeats = selectedRows.length * seatsPerRow;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !date || !venue) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Configure tiers
      // Row A is VIP, Row B is Premium, others Standard
      const tiers: Record<string, { rows: string[]; price: number }> = {
        VIP: { rows: selectedRows.slice(0, 1), price: Number(vipPrice) },
        Premium: { rows: selectedRows.slice(1, 2), price: Number(premiumPrice) },
        Standard: { rows: selectedRows.slice(2), price: Number(standardPrice) },
      };

      await eventsApi.create({
        name,
        description,
        date: new Date(date).toISOString(),
        venue,
        seatConfig: {
          rows: selectedRows,
          seatsPerRow: Number(seatsPerRow),
          tiers,
        },
      });

      onEventCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create event and generate seats.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Event & Seat Matrix">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Event Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Next-Gen Web Assembly Summit"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Description *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Detailed description of keynote speakers, sessions, and topics..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-main)',
              color: '#fff',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Date & Venue */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-main)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Venue *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Moscone Center, SF"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
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
        </div>

        {/* Seat Matrix Configuration Box */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.75rem' }}>
            Interactive Seat Layout Generator
          </div>

          {/* Row Picker */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Select Active Rows:
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {allAvailableRows.map((row) => {
                const isSelected = selectedRows.includes(row);
                return (
                  <button
                    key={row}
                    type="button"
                    onClick={() => toggleRow(row)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary)' : 'var(--bg-main)',
                      color: '#fff',
                      border: isSelected ? '1px solid #818CF8' : '1px solid var(--border-subtle)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {row}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seats per row & Tiers pricing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seats / Row</label>
              <input
                type="number"
                min={2}
                max={25}
                value={seatsPerRow}
                onChange={(e) => setSeatsPerRow(Math.max(1, Number(e.target.value)))}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#F472B6' }}>VIP Price ($)</label>
              <input
                type="number"
                min={1}
                value={vipPrice}
                onChange={(e) => setVipPrice(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#A78BFA' }}>Premium ($)</label>
              <input
                type="number"
                min={1}
                value={premiumPrice}
                onChange={(e) => setPremiumPrice(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#60A5FA' }}>Standard ($)</label>
              <input
                type="number"
                min={1}
                value={standardPrice}
                onChange={(e) => setStandardPrice(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#34D399', fontWeight: 600 }}>
            Generated Capacity: {totalSeats} Total Seats ({selectedRows.join(', ')})
          </div>
        </div>

        {errorMessage && (
          <div style={{ color: '#F87171', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)' }}>
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Event & Generate Seats →
          </Button>
        </div>
      </form>
    </Modal>
  );
};
