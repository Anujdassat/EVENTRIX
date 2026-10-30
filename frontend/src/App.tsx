import React, { useState } from 'react';
import { ReservationProvider } from './context/ReservationContext';
import { Navbar, type PageView } from './components/layout/Navbar';
import { ReservationCountdownBar } from './components/reservation/ReservationCountdownBar';

export const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<PageView>('events');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentView={currentView} onNavigate={setCurrentView} />

      <main className="container" style={{ flex: 1, padding: '2rem 1.5rem' }}>
        <div style={{ textAlign: 'center', margin: '3rem 0' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Event Ticket Booking & Seat Reservation
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Browse upcoming premier events, select your real-time seats with instant 5-minute holds, and simulate seamless checkout.
          </p>
        </div>
      </main>

      <ReservationCountdownBar onOpenCheckout={() => {}} />
    </div>
  );
};

export default function App() {
  return (
    <ReservationProvider>
      <AppContent />
    </ReservationProvider>
  );
}
