import { prisma } from '../db/prisma';

async function verify() {
  console.log('[Verify] Starting database verification...');

  // 1. Check Events
  const events = await prisma.event.findMany({
    include: {
      seats: true,
      bookings: true,
    },
  });
  console.log(`[Verify] Total events found: ${events.length}`);
  if (events.length !== 3) {
    throw new Error(`Expected 3 events, got ${events.length}`);
  }

  // 2. Check Total Seats
  const totalSeats = await prisma.seat.count();
  console.log(`[Verify] Total seats count: ${totalSeats}`);
  if (totalSeats !== 140) {
    throw new Error(`Expected 140 seats, got ${totalSeats}`);
  }

  // 3. Check Initial Seeded Booking
  const seedBooking = await prisma.booking.findUnique({
    where: { bookingRef: 'EVX-2026-SEED01' },
    include: { items: { include: { seat: true } } },
  });
  if (!seedBooking || seedBooking.items.length !== 2) {
    throw new Error('Initial seeded booking not found or does not have 2 items');
  }
  console.log(`[Verify] Found demo booking ${seedBooking.bookingRef} with ${seedBooking.items.length} seats.`);

  // 4. Test Unique Constraint on (eventId, row, number)
  const targetEvent = events[0];
  let constraintViolated = false;
  try {
    await prisma.seat.create({
      data: {
        eventId: targetEvent.id,
        row: 'A',
        number: 1, // Already exists!
        price: 999,
        status: 'AVAILABLE',
      },
    });
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'P2002') {
      constraintViolated = true;
      console.log('[Verify] Verified: Duplicate seat insertion correctly rejected with P2002 unique constraint violation.');
    }
  }

  if (!constraintViolated) {
    throw new Error('Expected duplicate seat insertion to fail, but it succeeded!');
  }

  console.log('[Verify] ALL DATABASE INTEGRITY CHECKS PASSED SUCCESSFULLY! ✅');
}

verify()
  .catch((err) => {
    console.error('[Verify] Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
