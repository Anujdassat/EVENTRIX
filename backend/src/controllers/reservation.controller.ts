import { Request, Response, NextFunction } from 'express';
import { reservationService } from '../services/reservation.service';
import { AppError } from '../middleware/errorHandler';

export class ReservationController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const eventId = req.params.id;
      const userId = (req.headers['x-user-id'] as string) || (req.body.userId as string);

      if (!userId) {
        throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
      }

      const reservation = await reservationService.createReservation(eventId, userId, req.body.seatIds);
      res.status(201).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservationId = req.params.id;
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);

      if (!userId) {
        throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
      }

      const reservation = await reservationService.getReservationById(reservationId, userId);
      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservationId = req.params.id;
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);

      if (!userId) {
        throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
      }

      const result = await reservationService.cancelReservation(reservationId, userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reservationController = new ReservationController();
