import { apiClient } from './client';
import type { ReservationDTO } from '../types';

export const reservationsApi = {
  create: (eventId: string, seatIds: string[]) =>
    apiClient<ReservationDTO>(`/events/${eventId}/reservations`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    }),

  getById: (reservationId: string) =>
    apiClient<ReservationDTO>(`/reservations/${reservationId}`),

  cancel: (reservationId: string) =>
    apiClient<{ success: boolean; message: string }>(`/reservations/${reservationId}`, {
      method: 'DELETE',
    }),
};
