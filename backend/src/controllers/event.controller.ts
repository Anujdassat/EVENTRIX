import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/event.service';

export class EventController {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const events = await eventService.listEvents();
      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventService.getEventById(req.params.id);
      res.status(200).json({
        success: true,
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdEvent = await eventService.createEvent(req.body);
      res.status(201).json({
        success: true,
        data: createdEvent,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const eventController = new EventController();
