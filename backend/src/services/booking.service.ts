import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { ConfirmBookingInput } from '../schemas/booking.schema';
import { BookingDTO, EventStatsDTO } from '../types';

export class BookingService {
  /**
   * Confirms an active reservation into a finalized Booking inside an ACID transaction.
   * Validates TTL, calculates prices dynamically from DB, simulates payment, and assigns a unique reference.
   */
  async confirmBooking(
    reservationId: string,
    userId: string,
    input: ConfirmBookingInput = {}
  ): Promise<BookingDTO> {
    if (!userId) {
      throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
    }

    // 1. Fetch reservation
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        event: true,
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

    // 2. Ownership verification
    if (reservation.userId !== userId) {
      throw new AppError('You do not have permission to confirm this reservation', 403, 'UNAUTHORIZED_RESERVATION');
    }

    // 3. Expiration verification
    const now = new Date();
    if (reservation.status !== 'ACTIVE' || reservation.expiresAt < now) {
      // Lazily update status if needed
      if (reservation.status === 'ACTIVE') {
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
      }

      throw new AppError(
        'This reservation has expired. Your held seats have been released. Please reselect your seats.',
        410,
        'RESERVATION_EXPIRED'
      );
    }

    // 4. Simulated payment outcome test hook
    if (input.simulatePaymentFailure) {
      throw new AppError(
        'Simulated payment failure: Transaction declined by card issuer. Your seats remain held until reservation expiration.',
        402,
        'BAD_REQUEST'
      );
    }

    // 5. Calculate total dynamically from database
    const totalAmount = reservation.items.reduce((sum, item) => sum + item.seat.price, 0);
    const seatIds = reservation.items.map((i) => i.seatId);

    // Generate unique alphanumeric booking reference e.g. EVX-2026-9A8B
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const bookingRef = `EVX-2026-${randomSuffix}`;

    // 6. Execute atomic booking confirmation in a transaction
    return await prisma.$transaction(async (tx) => {
      // Transition held seats to BOOKED
      await tx.seat.updateMany({
        where: { id: { in: seatIds } },
        data: { status: 'BOOKED', version: { increment: 1 } },
      });

      // Update reservation status to CONFIRMED
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED' },
      });

      // Create Booking record
      const booking = await tx.booking.create({
        data: {
          bookingRef,
          eventId: reservation.eventId,
          userId,
          reservationId: reservation.id,
          totalAmount,
          status: 'CONFIRMED',
          customerName: input.customerName || 'Guest User',
          customerEmail: input.customerEmail || 'guest@bytevox.io',
          items: {
            create: reservation.items.map((item) => ({
              seatId: item.seatId,
              price: item.seat.price,
            })),
          },
        },
        include: {
          items: {
            include: { seat: true },
          },
          event: true,
        },
      });

      return {
        id: booking.id,
        bookingRef: booking.bookingRef,
        eventId: booking.eventId,
        eventName: booking.event.name,
        userId: booking.userId,
        seats: booking.items.map((item) => ({
          seatId: item.seatId,
          row: item.seat.row,
          number: item.seat.number,
          section: item.seat.section,
          price: item.price,
        })),
        totalAmount: booking.totalAmount,
        status: booking.status as 'CONFIRMED',
        customerName: booking.customerName || undefined,
        customerEmail: booking.customerEmail || undefined,
        createdAt: booking.createdAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves booking history for a specific customer session.
   */
  async getBookingsByUser(userId: string): Promise<BookingDTO[]> {
    if (!userId) {
      throw new AppError('User session header x-user-id is required', 400, 'BAD_REQUEST');
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        event: true,
        items: {
          include: { seat: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => ({
      id: b.id,
      bookingRef: b.bookingRef,
      eventId: b.eventId,
      eventName: b.event.name,
      userId: b.userId,
      seats: b.items.map((item) => ({
        seatId: item.seatId,
        row: item.seat.row,
        number: item.seat.number,
        section: item.seat.section,
        price: item.price,
      })),
      totalAmount: b.totalAmount,
      status: b.status as 'CONFIRMED' | 'CANCELLED',
      customerName: b.customerName || undefined,
      customerEmail: b.customerEmail || undefined,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * Admin: Returns capacity and revenue statistics across events.
   */
  async getEventStatistics(): Promise<EventStatsDTO[]> {
    const events = await prisma.event.findMany({
      include: {
        seats: true,
        bookings: {
          where: { status: 'CONFIRMED' },
        },
      },
      orderBy: { date: 'asc' },
    });

    return events.map((event) => {
      const totalSeats = event.seats.length;
      const bookedSeats = event.seats.filter((s) => s.status === 'BOOKED').length;
      const heldSeats = event.seats.filter((s) => s.status === 'HELD').length;
      const availableSeats = event.seats.filter((s) => s.status === 'AVAILABLE').length;
      const occupancyPercentage = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
      const totalRevenue = event.bookings.reduce((sum, b) => sum + b.totalAmount, 0);

      return {
        eventId: event.id,
        eventName: event.name,
        totalSeats,
        availableSeats,
        heldSeats,
        bookedSeats,
        occupancyPercentage,
        totalRevenue,
      };
    });
  }
}

export const bookingService = new BookingService();
