import { Request, Response, NextFunction } from 'express';
import { seatService } from '../services/seat.service';

export class SeatController {
  async getByEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const seats = await seatService.getSeatsByEvent(req.params.id);
      res.status(200).json({
        success: true,
        data: seats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const seatController = new SeatController();
