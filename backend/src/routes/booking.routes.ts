import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { validate } from '../middleware/validate.middleware';
import { confirmBookingSchema } from '../schemas/booking.schema';
import { reservationIdParamSchema } from '../schemas/reservation.schema';

const router = Router();

// Confirm reservation into booking
router.post(
  '/reservations/:id/confirm',
  validate({ params: reservationIdParamSchema, body: confirmBookingSchema }),
  bookingController.confirm
);

// Get user booking history
router.get('/bookings', bookingController.getHistory);

// Get global event booking statistics
router.get('/stats', bookingController.getStats);

export default router;
