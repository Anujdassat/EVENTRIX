import React, { useEffect, useState } from 'react';
import { eventsApi } from '../api/events.api';
import type { EventDTO } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

interface EventListPageProps {
  onSelectEvent: (eventId: string) => void;
}

export const EventListPage: React.FC<EventListPageProps> = ({ onSelectEvent }) => {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventsApi.list();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events. Please ensure backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
            background: 'linear-gradient(to right, #FFFFFF, #94A3B8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Upcoming Premier Events
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Select an event, view the real-time interactive seat matrix, and reserve your seats with guaranteed 5-minute holds.
        </p>

        {/* Search Input */}
        <div style={{ marginTop: '1.75rem', maxWidth: '460px', margin: '1.75rem auto 0' }}>
          <input
            type="text"
            placeholder="Search by event name, venue, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.8rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171',
            marginBottom: '2rem',
            textAlign: 'center',
          }}
        >
          {error}
          <div style={{ marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={fetchEvents} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="card"
              style={{
                height: '240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              Loading events...
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}
        >
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No events found matching your search.</p>
          <Button variant="secondary" onClick={() => setSearchQuery('')}>
            Clear Search
          </Button>
        </div>
      ) : (
        /* Event Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const hasAvailableSeats = (event.availableSeats ?? 0) > 0;

            return (
              <div
                key={event.id}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <Badge variant={hasAvailableSeats ? 'AVAILABLE' : 'BOOKED'}>
                      {hasAvailableSeats ? `${event.availableSeats} Seats Available` : 'Sold Out'}
                    </Badge>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Total {event.totalSeats} seats
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      lineHeight: 1.3,
                      color: '#fff',
                    }}
                  >
                    {event.name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.5,
                    }}
                  >
                    {event.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📅</span>
                      <span>{formattedDate} at {formattedTime}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📍</span>
                      <span>{event.venue}</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button
                    variant="primary"
                    disabled={!hasAvailableSeats}
                    onClick={() => onSelectEvent(event.id)}
                    style={{ width: '100%' }}
                  >
                    {hasAvailableSeats ? 'Select Seats →' : 'Sold Out'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
