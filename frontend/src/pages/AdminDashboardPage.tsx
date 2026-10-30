import React, { useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings.api';
import type { EventStatsDTO } from '../types';
import { Button } from '../components/common/Button';
import { CreateEventModal } from '../components/admin/CreateEventModal';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<EventStatsDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookingsApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load event booking statistics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalBookedSeats = stats.reduce((sum, s) => sum + s.bookedSeats, 0);
  const totalCapacity = stats.reduce((sum, s) => sum + s.totalSeats, 0);
  const overallOccupancy = totalCapacity > 0 ? Math.round((totalBookedSeats / totalCapacity) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            Administrator Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Real-time event capacity analytics, revenue monitoring, and seat matrix management.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={fetchStats} style={{ fontSize: '0.85rem' }}>
            🔄 Refresh Metrics
          </Button>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create New Event
          </Button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Revenue
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34D399', marginTop: '0.35rem' }}>
            ${totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Across all events
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Booked Seats
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.35rem' }}>
            {totalBookedSeats}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Confirmed ticket sales
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Capacity
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#A78BFA', marginTop: '0.35rem' }}>
            {totalCapacity}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Configured seats
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average Occupancy
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.35rem' }}>
            {overallOccupancy}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Live occupancy rate
          </div>
        </div>
      </div>

      {/* Events Capacity Table */}
      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem' }}>
          Event Performance & Live Capacity Breakdown
        </h2>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Loading statistics...
          </div>
        ) : stats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            No events found. Click "+ Create New Event" to get started.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Event Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Capacity</th>
                <th style={{ padding: '0.75rem 1rem' }}>Available</th>
                <th style={{ padding: '0.75rem 1rem' }}>Held</th>
                <th style={{ padding: '0.75rem 1rem' }}>Booked</th>
                <th style={{ padding: '0.75rem 1rem' }}>Occupancy</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.eventId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#fff' }}>
                    {s.eventName}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {s.totalSeats} seats
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#34D399', fontWeight: 600 }}>{s.availableSeats}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#FBBF24', fontWeight: 600 }}>{s.heldSeats}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#60A5FA', fontWeight: 600 }}>{s.bookedSeats}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          flex: 1,
                          height: '6px',
                          background: 'var(--bg-surface)',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                          maxWidth: '70px',
                        }}
                      >
                        <div
                          style={{
                            width: `${s.occupancyPercentage}%`,
                            height: '100%',
                            background: '#6366F1',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {s.occupancyPercentage}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#34D399' }}>
                    ${s.totalRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onEventCreated={fetchStats}
      />
    </div>
  );
};
