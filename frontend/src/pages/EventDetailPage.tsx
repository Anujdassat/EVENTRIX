import React, { useEffect, useState, useCallback } from 'react';
import { eventsApi, type EventDetailDTO } from '../api/events.api';
import { reservationsApi } from '../api/reservations.api';
import type { SeatDTO } from '../types';
import { SeatGrid } from '../components/seatmap/SeatGrid';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useReservation } from '../context/ReservationContext';

interface EventDetailPageProps {
  eventId: string;
  onBack: () => void;
  onOpenCheckout: () => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  onBack,
  onOpenCheckout,
}) => {
  const [event, setEvent] = useState<EventDetailDTO | null>(null);
  const [seats, setSeats] = useState<SeatDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startReservation } = useReservation();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventData, seatsData] = await Promise.all([
        eventsApi.getById(eventId),
        eventsApi.getSeats(eventId),
      ]);
      setEvent(eventData);
      setSeats(seatsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load event seat layout.');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReserveSeats = async (seatIds: string[]) => {
    setIsReserving(true);
    try {
      const reservation = await reservationsApi.create(eventId, seatIds);
      startReservation(reservation);
      // Refresh seat layout to show held status
      const updatedSeats = await eventsApi.getSeats(eventId);
      setSeats(updatedSeats);
      // Trigger checkout prompt
      onOpenCheckout();
    } finally {
      setIsReserving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
        Loading interactive seat map...
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '500px', margin: '2rem auto' }}>
        <p style={{ color: '#EF4444', marginBottom: '1.5rem' }}>{error || 'Event could not be found.'}</p>
        <Button variant="secondary" onClick={onBack}>
          ← Back to Events
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div>
      {/* Back button & Event header */}
      <div style={{ marginBottom: '2rem' }}>
        <Button variant="secondary" onClick={onBack} style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          ← Back to All Events
        </Button>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Badge variant="AVAILABLE">{event.availableSeats} Seats Available</Badge>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Venue: {event.venue}
              </span>
            </div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {event.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', fontSize: '0.95rem' }}>
              📅 {formattedDate} at {formattedTime}
            </p>
          </div>

          <Button variant="secondary" onClick={loadData} style={{ fontSize: '0.85rem' }}>
            🔄 Refresh Availability
          </Button>
        </div>
      </div>

      {/* Seat Selection Map */}
      <SeatGrid
        seats={seats}
        onReserveSeats={handleReserveSeats}
        isReserving={isReserving}
      />
    </div>
  );
};
