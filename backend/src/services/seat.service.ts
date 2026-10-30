import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { SeatDTO } from '../types';

export class SeatService {
  /**
   * Lazily expires any active reservations that have passed their 5-minute TTL
   * for a given event, resetting held seats back to AVAILABLE.
   */
  async cleanupExpiredReservationsForEvent(eventId: string): Promise<number> {
    const now = new Date();

    const expiredReservations = await prisma.reservation.findMany({
      where: {
        eventId,
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      include: {
        items: true,
      },
    });

    if (expiredReservations.length === 0) {
      return 0;
    }

    const expiredReservationIds = expiredReservations.map((r) => r.id);
    const seatIdsToRelease = expiredReservations.flatMap((r) => r.items.map((i) => i.seatId));

    await prisma.$transaction(async (tx) => {
      // 1. Mark reservations as EXPIRED
      await tx.reservation.updateMany({
        where: { id: { in: expiredReservationIds } },
        data: { status: 'EXPIRED' },
      });

      // 2. Reset held seats back to AVAILABLE
      if (seatIdsToRelease.length > 0) {
        await tx.seat.updateMany({
          where: {
            id: { in: seatIdsToRelease },
            status: 'HELD',
          },
          data: {
            status: 'AVAILABLE',
            version: { increment: 1 },
          },
        });
      }
    });

    return seatIdsToRelease.length;
  }

  /**
   * Returns all seats for an event, automatically executing lazy expiration
   * so clients always receive up-to-the-millisecond accurate availability.
   */
  async getSeatsByEvent(eventId: string): Promise<SeatDTO[]> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'NOT_FOUND');
    }

    // Run lazy expiration
    await this.cleanupExpiredReservationsForEvent(eventId);

    const seats = await prisma.seat.findMany({
      where: { eventId },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });

    return seats.map((seat) => ({
      id: seat.id,
      eventId: seat.eventId,
      row: seat.row,
      number: seat.number,
      section: seat.section,
      price: seat.price,
      status: seat.status as 'AVAILABLE' | 'HELD' | 'BOOKED',
    }));
  }
}

export const seatService = new SeatService();
