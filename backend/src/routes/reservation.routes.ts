import { Router } from 'express';
import { reservationController } from '../controllers/reservation.controller';
import { validate } from '../middleware/validate.middleware';
import { createReservationSchema, reservationIdParamSchema } from '../schemas/reservation.schema';
import { eventIdParamSchema } from '../schemas/event.schema';

const router = Router();

// Nested under /api/events/:id/reservations
export const eventReservationRouter = Router({ mergeParams: true });
eventReservationRouter.post(
  '/',
  validate({ params: eventIdParamSchema, body: createReservationSchema }),
  reservationController.create
);

// Under /api/reservations/:id
router.get('/:id', validate({ params: reservationIdParamSchema }), reservationController.getById);
router.delete('/:id', validate({ params: reservationIdParamSchema }), reservationController.cancel);

export default router;
