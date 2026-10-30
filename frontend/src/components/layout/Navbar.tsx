import React from 'react';
import { useReservation } from '../../context/ReservationContext';

export type PageView = 'events' | 'event-detail' | 'bookings' | 'admin';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { activeReservation, formattedTime, remainingSeconds } = useReservation();

  return (
    <header className="navbar">
      <div className="container nav-container">
        <div
          className="nav-brand"
          onClick={() => onNavigate('events')}
          style={{ cursor: 'pointer' }}
        >
          <span>EVENTRIX</span>
          <span className="brand-badge">ByteVox</span>
        </div>

        <nav className="nav-links">
          <span
            className={`nav-link ${currentView === 'events' ? 'active' : ''}`}
            onClick={() => onNavigate('events')}
          >
            Explore Events
          </span>
          <span
            className={`nav-link ${currentView === 'bookings' ? 'active' : ''}`}
            onClick={() => onNavigate('bookings')}
          >
            My Bookings
          </span>
          <span
            className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => onNavigate('admin')}
          >
            Admin Panel
          </span>

          {activeReservation && remainingSeconds > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#FBBF24',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#F59E0B',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span>Held: {formattedTime}</span>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
