import { prisma } from '../db/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { ReservationDTO } from '../types';
import { seatService } from './seat.service';

export class ReservationService {
  /**
   * Concurrency-safe atomic seat reservation with 5-minute TTL.
   * Prevents race conditions where two users request the same seat simultaneously.
   */
  async createReservation(
    eventId: string,
    userId: string,
    seatIds: string[]
  ): Promise<ReservationDTO> {
    if (!userId) {
      throw new AppError('Missing user identity session', 401, 'BAD_REQUEST');
    }

    // Deduplicate requested seat IDs to avoid intra-request conflicts
    const uniqueSeatIds = Array.from(new Set(seatIds));
    if (uniqueSeatIds.length !== seatIds.length) {
      throw new AppError('Duplicate seat IDs specified in request', 400, 'BAD_REQUEST');
    }

    // 1. Verify Event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event || event.status !== 'PUBLISHED') {
      throw new AppError('Event is not available for booking', 404, 'NOT_FOUND');
    }

    // 2. Perform real-time lazy cleanup for any stale reservations before checking
    await seatService.cleanupExpiredReservationsForEvent(eventId);

    // 3. Atomically check and hold seats inside an ACID transaction
    return await prisma.$transaction(async (tx) => {
      // Find requested seats for this event
      const requestedSeats = await tx.seat.findMany({
        where: {
          id: { in: uniqueSeatIds },
          eventId,
        },
      });

      if (requestedSeats.length !== uniqueSeatIds.length) {
        throw new AppError('One or more selected seats do not exist for this event', 400, 'BAD_REQUEST');
      }

      // Check for any unavailable seats
      const unavailableSeats = requestedSeats.filter((s) => s.status !== 'AVAILABLE');
      if (unavailableSeats.length > 0) {
        const unavailableLabels = unavailableSeats.map((s) => `${s.row}${s.number}`).join(', ');
        throw new AppError(
          `Seat(s) ${unavailableLabels} are no longer available. Please choose other seats.`,
          409,
          'SEAT_UNAVAILABLE'
        );
      }

      // Atomically transition seat statuses from AVAILABLE to HELD
      const updateResult = await tx.seat.updateMany({
        where: {
          id: { in: uniqueSeatIds },
          status: 'AVAILABLE',
        },
        data: {
          status: 'HELD',
          version: { increment: 1 },
        },
      });

      // If another transaction acquired any of the seats concurrently, updateResult.count will not match
      if (updateResult.count !== uniqueSeatIds.length) {
        throw new AppError(
          'Seat conflict detected: one or more seats were claimed by another user.',
          409,
          'SEAT_UNAVAILABLE'
        );
      }

      // Calculate 5-minute expiry
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.reservationExpiryMinutes * 60 * 1000);
      const totalPrice = requestedSeats.reduce((sum, s) => sum + s.price, 0);

      // Create Reservation
      const reservation = await tx.reservation.create({
        data: {
          eventId,
          userId,
          expiresAt,
          status: 'ACTIVE',
          items: {
            create: uniqueSeatIds.map((seatId) => ({ seatId })),
          },
        },
      });

      const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

      return {
        id: reservation.id,
        eventId: reservation.eventId,
        userId: reservation.userId,
        expiresAt: expiresAt.toISOString(),
        serverTime: now.toISOString(),
        remainingSeconds,
        seatIds: uniqueSeatIds,
        totalPrice,
        status: reservation.status as 'ACTIVE',
      };
    });
  }

  /**
   * Retrieves reservation details, validating active status and calculating remaining countdown.
   */
  async getReservationById(reservationId: string, userId: string): Promise<ReservationDTO> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        items: {
          include: {
            seat: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404, 'NOT_FOUND');
    }

    if (reservation.userId !== userId) {
      throw new AppError('You do not have permission to view this reservation', 403, 'UNAUTHORIZED_RESERVATION');
    }

    const now = new Date();

    // Check if expired
    if (reservation.status === 'ACTIVE' && reservation.expiresAt < now) {
      // Lazily update status and release seats
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'EXPIRED' },
        });

        const seatIds = reservation.items.map((i) => i.seatId);
        await tx.seat.updateMany({
          where: { id: { in: seatIds }, status: 'HELD' },
          data: { status: 'AVAILABLE', version: { increment: 1 } },
        });
      });

      reservation.status = 'EXPIRED';
    }

    const remainingSeconds = Math.max(0, Math.floor((reservation.expiresAt.getTime() - now.getTime()) / 1000));
    const totalPrice = reservation.items.reduce((sum, item) => sum + item.seat.price, 0);

    return {
      id: reservation.id,
      eventId: reservation.eventId,
      userId: reservation.userId,
      expiresAt: reservation.expiresAt.toISOString(),
      serverTime: now.toISOString(),
      remainingSeconds,
      seatIds: reservation.items.map((i) => i.seatId),
      totalPrice,
      status: reservation.status as 'ACTIVE' | 'EXPIRED' | 'CONFIRMED' | 'CANCELLED',
    };
  }

  /**
   * User-initiated reservation cancellation and immediate seat release.
   */
  async cancelReservation(reservationId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { items: true },
    });

    if (!reservation) {
      throw new AppError('Reservation not found', 404, 'NOT_FOUND');
    }

    if (reservation.userId !== userId) {
      throw new AppError('You do not have permission to cancel this reservation', 403, 'UNAUTHORIZED_RESERVATION');
    }

    if (reservation.status !== 'ACTIVE') {
      return { success: true, message: `Reservation is already ${reservation.status.toLowerCase()}` };
    }

    const seatIds = reservation.items.map((i) => i.seatId);

    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED' },
      });

      if (seatIds.length > 0) {
        await tx.seat.updateMany({
          where: { id: { in: seatIds }, status: 'HELD' },
          data: { status: 'AVAILABLE', version: { increment: 1 } },
        });
      }
    });

    return { success: true, message: 'Reservation cancelled successfully and seats released.' };
  }
}

export const reservationService = new ReservationService();
