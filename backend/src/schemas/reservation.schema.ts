import { z } from 'zod';

export const createReservationSchema = z.object({
  seatIds: z
    .array(z.string().uuid('Each seat ID must be a valid UUID'))
    .min(1, 'You must select at least one seat')
    .max(10, 'You cannot reserve more than 10 seats in a single transaction'),
});

export const reservationIdParamSchema = z.object({
  id: z.string().uuid('Reservation ID must be a valid UUID'),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
