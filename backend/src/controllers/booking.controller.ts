import { Request, Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service';
import { AppError } from '../middleware/errorHandler';

export class BookingController {
  async confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reservationId = req.params.id;
      const userId = (req.headers['x-user-id'] as string) || (req.body.userId as string);

      if (!userId) {
        throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
      }

      const booking = await bookingService.confirmBooking(reservationId, userId, req.body);
      res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);

      if (!userId) {
        throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
      }

      const bookings = await bookingService.getBookingsByUser(userId);
      res.status(200).json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await bookingService.getEventStatistics();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();
