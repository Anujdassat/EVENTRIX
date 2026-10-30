import { apiClient } from './client';
import type { EventDTO, SeatDTO } from '../types';

export interface EventDetailDTO extends EventDTO {
  tiers: {
    section: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
  }[];
}

export interface CreateEventPayload {
  name: string;
  description: string;
  date: string;
  venue: string;
  seatConfig?: {
    rows: string[];
    seatsPerRow: number;
    tiers: Record<string, { rows: string[]; price: number }>;
  };
}

export const eventsApi = {
  list: () => apiClient<EventDTO[]>('/events'),
  getById: (id: string) => apiClient<EventDetailDTO>(`/events/${id}`),
  getSeats: (id: string) => apiClient<SeatDTO[]>(`/events/${id}/seats`),
  create: (payload: CreateEventPayload) =>
    apiClient<EventDetailDTO>('/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
