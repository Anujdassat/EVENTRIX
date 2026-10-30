import React, { useState } from 'react';
import { ReservationProvider, useReservation } from './context/ReservationContext';
import { Navbar, type PageView } from './components/layout/Navbar';
import { ReservationCountdownBar } from './components/reservation/ReservationCountdownBar';
import { CheckoutModal } from './components/reservation/CheckoutModal';
import { EventListPage } from './pages/EventListPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { BookingHistoryPage } from './pages/BookingHistoryPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import type { BookingDTO } from './types';

const MainLayout: React.FC = () => {
  const [currentView, setCurrentView] = useState<PageView>('events');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDTO | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const { activeReservation } = useReservation();

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('event-detail');
  };

  const handleBookingConfirmed = (booking: BookingDTO) => {
    setConfirmedBooking(booking);
    setIsCheckoutModalOpen(false);
  };

  const renderContent = () => {
    // If a fresh booking was just completed, show the confirmation screen
    if (confirmedBooking) {
      return (
        <BookingSuccessPage
          booking={confirmedBooking}
          onViewHistory={() => {
            setConfirmedBooking(null);
            setCurrentView('bookings');
          }}
          onExploreMore={() => {
            setConfirmedBooking(null);
            setCurrentView('events');
          }}
        />
      );
    }

    switch (currentView) {
      case 'events':
        return <EventListPage onSelectEvent={handleSelectEvent} />;

      case 'event-detail':
        if (!selectedEventId) {
          return <EventListPage onSelectEvent={handleSelectEvent} />;
        }
        return (
          <EventDetailPage
            eventId={selectedEventId}
            onBack={() => setCurrentView('events')}
            onOpenCheckout={() => setIsCheckoutModalOpen(true)}
          />
        );

      case 'bookings':
        return <BookingHistoryPage onExploreEvents={() => setCurrentView('events')} />;

      case 'admin':
        return <AdminDashboardPage />;

      default:
        return <EventListPage onSelectEvent={handleSelectEvent} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        currentView={confirmedBooking ? 'bookings' : currentView}
        onNavigate={(view) => {
          setConfirmedBooking(null);
          setCurrentView(view);
        }}
      />

      <main className="container" style={{ flex: 1, padding: '2.5rem 1.5rem 6rem' }}>
        {renderContent()}
      </main>

      {/* Floating Countdown Ticker Bar (shows whenever a reservation is active) */}
      {activeReservation && !confirmedBooking && (
        <ReservationCountdownBar onOpenCheckout={() => setIsCheckoutModalOpen(true)} />
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSuccess={handleBookingConfirmed}
      />
    </div>
  );
};

export default function App() {
  return (
    <ReservationProvider>
      <MainLayout />
    </ReservationProvider>
  );
}
