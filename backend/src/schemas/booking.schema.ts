import { z } from 'zod';

export const confirmBookingSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  customerEmail: z.string().email('Please provide a valid email address').optional(),
  simulatePaymentFailure: z.boolean().optional(),
});

export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>;
