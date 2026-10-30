import { prisma } from '../db/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateEventInput } from '../schemas/event.schema';
import { EventDTO } from '../types';

export interface EventDetailDTO extends EventDTO {
  tiers: {
    section: string;
    price: number;
    totalSeats: number;
    availableSeats: number;
  }[];
}

export class EventService {
  /**
   * Retrieves all published events with calculated seat statistics and price ranges.
   */
  async listEvents(): Promise<EventDTO[]> {
    const events = await prisma.event.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        seats: {
          select: {
            status: true,
            price: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    return events.map((event) => {
      const totalSeats = event.seats.length;
      const availableSeats = event.seats.filter((s) => s.status === 'AVAILABLE').length;

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        venue: event.venue,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        totalSeats,
        availableSeats,
      };
    });
  }

  /**
   * Retrieves a single event by ID with detailed seat tier breakdown.
   */
  async getEventById(id: string): Promise<EventDetailDTO> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        seats: true,
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404, 'NOT_FOUND');
    }

    const totalSeats = event.seats.length;
    const availableSeats = event.seats.filter((s) => s.status === 'AVAILABLE').length;

    // Group seats by tier/section
    const tierMap = new Map<string, { price: number; totalSeats: number; availableSeats: number }>();

    for (const seat of event.seats) {
      const key = seat.section;
      if (!tierMap.has(key)) {
        tierMap.set(key, { price: seat.price, totalSeats: 0, availableSeats: 0 });
      }
      const item = tierMap.get(key)!;
      item.totalSeats += 1;
      if (seat.status === 'AVAILABLE') {
        item.availableSeats += 1;
      }
    }

    const tiers = Array.from(tierMap.entries()).map(([section, data]) => ({
      section,
      price: data.price,
      totalSeats: data.totalSeats,
      availableSeats: data.availableSeats,
    }));

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date.toISOString(),
      venue: event.venue,
      status: event.status,
      createdAt: event.createdAt.toISOString(),
      totalSeats,
      availableSeats,
      tiers,
    };
  }

  /**
   * Admin: Creates a new event with an automated seat matrix generator.
   */
  async createEvent(input: CreateEventInput): Promise<EventDetailDTO> {
    const eventDate = new Date(input.date);

    return await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          name: input.name,
          description: input.description,
          date: eventDate,
          venue: input.venue,
          status: 'PUBLISHED',
        },
      });

      const rows = input.seatConfig?.rows || ['A', 'B', 'C', 'D'];
      const seatsPerRow = input.seatConfig?.seatsPerRow || 10;
      const tiersConfig = input.seatConfig?.tiers;

      const seatsToCreate = [];

      for (const row of rows) {
        let section = 'Standard';
        let price = 40.0;

        if (tiersConfig) {
          for (const [tierName, tierData] of Object.entries(tiersConfig)) {
            if (tierData.rows.includes(row)) {
              section = tierName;
              price = tierData.price;
              break;
            }
          }
        } else {
          // Default tier assignment
          if (row === 'A') {
            section = 'VIP';
            price = 100.0;
          } else if (row === 'B') {
            section = 'Premium';
            price = 65.0;
          }
        }

        for (let num = 1; num <= seatsPerRow; num++) {
          seatsToCreate.push({
            eventId: event.id,
            row,
            number: num,
            section,
            price,
            status: 'AVAILABLE',
          });
        }
      }

      await tx.seat.createMany({ data: seatsToCreate });

      // Fetch the created event with tiers
      const createdSeats = await tx.seat.findMany({ where: { eventId: event.id } });
      const tierMap = new Map<string, { price: number; totalSeats: number; availableSeats: number }>();

      for (const s of createdSeats) {
        if (!tierMap.has(s.section)) {
          tierMap.set(s.section, { price: s.price, totalSeats: 0, availableSeats: 0 });
        }
        const item = tierMap.get(s.section)!;
        item.totalSeats += 1;
        item.availableSeats += 1;
      }

      const tiers = Array.from(tierMap.entries()).map(([section, data]) => ({
        section,
        price: data.price,
        totalSeats: data.totalSeats,
        availableSeats: data.availableSeats,
      }));

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date.toISOString(),
        venue: event.venue,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
        totalSeats: createdSeats.length,
        availableSeats: createdSeats.length,
        tiers,
      };
    });
  }
}

export const eventService = new EventService();
