import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Clearing existing records...');
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.reservationItem.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.event.deleteMany();

  console.log('[Seed] Creating demo events and seats...');

  // 1. ByteVox Tech Summit 2026
  const event1Date = new Date();
  event1Date.setDate(event1Date.getDate() + 14);
  event1Date.setHours(10, 0, 0, 0);

  const event1 = await prisma.event.create({
    data: {
      name: 'ByteVox AI & Cloud Summit 2026',
      description:
        'The premier global conference for distributed systems, AI infrastructure, and cloud-native engineering. Join industry leaders for keynotes and technical workshops.',
      date: event1Date,
      venue: 'Grand Tech Arena, San Francisco',
      status: 'PUBLISHED',
    },
  });

  // Generate 60 seats (Rows A to F, 10 seats each)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const event1Seats = [];

  for (const row of rows) {
    let section = 'Standard';
    let price = 50.0;

    if (row === 'A' || row === 'B') {
      section = 'VIP';
      price = 150.0;
    } else if (row === 'C' || row === 'D') {
      section = 'Premium';
      price = 95.0;
    }

    for (let num = 1; num <= 10; num++) {
      // Mark A1 and A2 as pre-booked to demonstrate booked status in the UI
      const isBooked = row === 'A' && (num === 1 || num === 2);
      event1Seats.push({
        eventId: event1.id,
        row,
        number: num,
        section,
        price,
        status: isBooked ? 'BOOKED' : 'AVAILABLE',
      });
    }
  }

  await prisma.seat.createMany({ data: event1Seats });

  // Add a sample pre-existing booking for A1 and A2
  const bookedSeats = await prisma.seat.findMany({
    where: { eventId: event1.id, status: 'BOOKED' },
  });

  if (bookedSeats.length > 0) {
    const booking = await prisma.booking.create({
      data: {
        bookingRef: 'EVX-2026-SEED01',
        eventId: event1.id,
        userId: 'usr_seed_organizer',
        totalAmount: bookedSeats.reduce((acc, s) => acc + s.price, 0),
        status: 'CONFIRMED',
        customerName: 'VIP Sponsor',
        customerEmail: 'sponsor@bytevox.io',
        items: {
          create: bookedSeats.map((seat) => ({
            seatId: seat.id,
            price: seat.price,
          })),
        },
      },
    });
    console.log(`[Seed] Created initial demonstration booking ${booking.bookingRef}`);
  }

  // 2. Symphony Under the Stars
  const event2Date = new Date();
  event2Date.setDate(event2Date.getDate() + 21);
  event2Date.setHours(19, 30, 0, 0);

  const event2 = await prisma.event.create({
    data: {
      name: 'Neon Symphony: Orchestral Cyberpunk',
      description:
        'An electric 80-piece live orchestra blending classical symphonic grandeur with driving synthwave synthesizers and panoramic laser projections.',
      date: event2Date,
      venue: 'Metropolis Concert Hall, New York',
      status: 'PUBLISHED',
    },
  });

  const event2Seats = [];
  for (const row of ['A', 'B', 'C', 'D', 'E']) {
    let section = 'Standard';
    let price = 45.0;

    if (row === 'A') {
      section = 'VIP';
      price = 120.0;
    } else if (row === 'B' || row === 'C') {
      section = 'Premium';
      price = 75.0;
    }

    for (let num = 1; num <= 8; num++) {
      event2Seats.push({
        eventId: event2.id,
        row,
        number: num,
        section,
        price,
        status: 'AVAILABLE',
      });
    }
  }
  await prisma.seat.createMany({ data: event2Seats });

  // 3. Indie Rock Showcase
  const event3Date = new Date();
  event3Date.setDate(event3Date.getDate() + 7);
  event3Date.setHours(20, 0, 0, 0);

  const event3 = await prisma.event.create({
    data: {
      name: 'Indie Rock Wave Showcase',
      description:
        'An intimate high-energy evening featuring breakthrough indie and alternative artists performing new releases and acoustic sets.',
      date: event3Date,
      venue: 'The Echo Underground, Austin',
      status: 'PUBLISHED',
    },
  });

  const event3Seats = [];
  for (const row of ['A', 'B', 'C', 'D']) {
    const section = row === 'A' ? 'VIP' : 'Standard';
    const price = row === 'A' ? 70.0 : 35.0;

    for (let num = 1; num <= 10; num++) {
      event3Seats.push({
        eventId: event3.id,
        row,
        number: num,
        section,
        price,
        status: 'AVAILABLE',
      });
    }
  }
  await prisma.seat.createMany({ data: event3Seats });

  console.log('[Seed] Database seeded successfully!');
  console.log(`[Seed] 3 Events created with 140 total seats.`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
