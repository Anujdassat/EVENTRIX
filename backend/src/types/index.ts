export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export type ReservationStatus = 'ACTIVE' | 'EXPIRED' | 'CONFIRMED' | 'CANCELLED';

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    status: number;
    details?: unknown;
  };
}

export interface SeatDTO {
  id: string;
  eventId: string;
  row: string;
  number: number;
  section?: string;
  price: number;
  status: SeatStatus;
}

export interface EventDTO {
  id: string;
  name: string;
  description: string;
  date: string;
  venue: string;
  status: string;
  createdAt: string;
  totalSeats?: number;
  availableSeats?: number;
}

export interface ReservationDTO {
  id: string;
  eventId: string;
  userId: string;
  expiresAt: string;
  serverTime: string;
  remainingSeconds: number;
  seatIds: string[];
  totalPrice: number;
  status: ReservationStatus;
}

export interface BookingDTO {
  id: string;
  bookingRef: string;
  eventId: string;
  eventName: string;
  userId: string;
  seats: {
    seatId: string;
    row: string;
    number: number;
    section?: string;
    price: number;
  }[];
  totalAmount: number;
  status: BookingStatus;
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
}

export interface EventStatsDTO {
  eventId: string;
  eventName: string;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  bookedSeats: number;
  occupancyPercentage: number;
  totalRevenue: number;
}
