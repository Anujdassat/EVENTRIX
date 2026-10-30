import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
  venue: z.string().min(3, 'Venue must be at least 3 characters').max(150),
  seatConfig: z
    .object({
      rows: z.array(z.string().regex(/^[A-Z]$/, 'Row must be a single uppercase letter A-Z')).min(1),
      seatsPerRow: z.number().int().min(1).max(30),
      tiers: z.record(
        z.string(),
        z.object({
          rows: z.array(z.string()),
          price: z.number().positive('Price must be greater than 0'),
        })
      ),
    })
    .optional(),
});

export const eventIdParamSchema = z.object({
  id: z.string().uuid('Event ID must be a valid UUID'),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
