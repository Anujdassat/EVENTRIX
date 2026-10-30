import { apiClient } from './client';
import type { BookingDTO, EventStatsDTO } from '../types';

export interface ConfirmBookingPayload {
  customerName?: string;
  customerEmail?: string;
  simulatePaymentFailure?: boolean;
}

export const bookingsApi = {
  confirm: (reservationId: string, payload: ConfirmBookingPayload = {}) =>
    apiClient<BookingDTO>(`/reservations/${reservationId}/confirm`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getHistory: () => apiClient<BookingDTO[]>('/bookings'),

  getStats: () => apiClient<EventStatsDTO[]>('/stats'),
};
