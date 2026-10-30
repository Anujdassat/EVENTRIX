import { Router } from 'express';
import { eventController } from '../controllers/event.controller';
import { seatController } from '../controllers/seat.controller';
import { validate } from '../middleware/validate.middleware';
import { createEventSchema, eventIdParamSchema } from '../schemas/event.schema';

const router = Router();

// Event collection & creation
router.get('/', eventController.list);
router.post('/', validate({ body: createEventSchema }), eventController.create);

// Single event details
router.get('/:id', validate({ params: eventIdParamSchema }), eventController.getById);

// Seat layout and real-time availability
router.get('/:id/seats', validate({ params: eventIdParamSchema }), seatController.getByEvent);

export default router;
