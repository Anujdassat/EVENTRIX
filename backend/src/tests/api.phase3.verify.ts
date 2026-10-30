import { eventService } from '../services/event.service';
import { seatService } from '../services/seat.service';
import { prisma } from '../db/prisma';

async function runPhase3Verification() {
  console.log('[Phase 3 Verification] Starting API and Service validation...\n');

  // Test 1: List Events
  console.log('1. Testing eventService.listEvents()...');
  const events = await eventService.listEvents();
  console.log(`   Found ${events.length} published events.`);
  if (events.length < 3) {
    throw new Error(`Expected at least 3 events, got ${events.length}`);
  }

  const summitEvent = events.find((e) => e.name.includes('ByteVox AI & Cloud Summit 2026'));
  if (!summitEvent) {
    throw new Error('Summit event not found');
  }
  console.log(`   Summit Event: ${summitEvent.totalSeats} total seats, ${summitEvent.availableSeats} available.`);
  if (summitEvent.totalSeats !== 60 || summitEvent.availableSeats !== 58) {
    throw new Error(`Expected 60 total and 58 available seats, got total=${summitEvent.totalSeats}, avail=${summitEvent.availableSeats}`);
  }
  console.log('   ✅ Test 1 Passed: Event listing with availability calculations.\n');

  // Test 2: Get Event Details with Tiers
  console.log('2. Testing eventService.getEventById()...');
  const eventDetails = await eventService.getEventById(summitEvent.id);
  console.log(`   Event: "${eventDetails.name}", Tiers found: ${eventDetails.tiers.length}`);
  for (const tier of eventDetails.tiers) {
    console.log(`     - Tier "${tier.section}": $${tier.price} (${tier.availableSeats}/${tier.totalSeats} seats)`);
  }
  if (eventDetails.tiers.length < 3) {
    throw new Error(`Expected at least 3 tiers (VIP, Premium, Standard), got ${eventDetails.tiers.length}`);
  }
  console.log('   ✅ Test 2 Passed: Event details and tier calculations.\n');

  // Test 3: Get Seats by Event
  console.log('3. Testing seatService.getSeatsByEvent()...');
  const seats = await seatService.getSeatsByEvent(summitEvent.id);
  console.log(`   Retrieved ${seats.length} seats.`);
  if (seats.length !== 60) {
    throw new Error(`Expected 60 seats, got ${seats.length}`);
  }

  const seatA1 = seats.find((s) => s.row === 'A' && s.number === 1);
  const seatA2 = seats.find((s) => s.row === 'A' && s.number === 2);
  const seatB1 = seats.find((s) => s.row === 'B' && s.number === 1);

  if (seatA1?.status !== 'BOOKED' || seatA2?.status !== 'BOOKED') {
    throw new Error(`Expected A1 & A2 to be BOOKED, got A1=${seatA1?.status}, A2=${seatA2?.status}`);
  }
  if (seatB1?.status !== 'AVAILABLE') {
    throw new Error(`Expected B1 to be AVAILABLE, got ${seatB1?.status}`);
  }
  console.log('   ✅ Test 3 Passed: Seat status resolution matches ground truth.\n');

  // Test 4: Admin Event Creation with Seat Matrix Generator
  console.log('4. Testing admin eventService.createEvent()...');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const created = await eventService.createEvent({
    name: 'ByteVox Quantum Computing Symposium',
    description: 'Deep dive into fault-tolerant quantum algorithms and quantum cryptography protocols.',
    date: futureDate.toISOString(),
    venue: 'MIT Media Lab, Cambridge',
    seatConfig: {
      rows: ['A', 'B', 'C'],
      seatsPerRow: 6,
      tiers: {
        VIP: { rows: ['A'], price: 200 },
        Standard: { rows: ['B', 'C'], price: 80 },
      },
    },
  });

  console.log(`   Created new event "${created.name}" (ID: ${created.id}) with ${created.totalSeats} seats.`);
  if (created.totalSeats !== 18) {
    throw new Error(`Expected 18 seats (3 rows x 6), got ${created.totalSeats}`);
  }
  console.log('   ✅ Test 4 Passed: Admin event and seat matrix generation.\n');

  // Test 5: Lazy Expiration Mechanism
  console.log('5. Testing real-time lazy reservation expiration...');
  // Find an available seat in the newly created event
  const testSeats = await seatService.getSeatsByEvent(created.id);
  const targetSeat = testSeats[0];

  // Manually insert an expired reservation for targetSeat
  const expiredTimestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
  const expiredRes = await prisma.reservation.create({
    data: {
      eventId: created.id,
      userId: 'usr_test_expired',
      expiresAt: expiredTimestamp,
      status: 'ACTIVE', // Expired by time, but status still marked ACTIVE until checked!
      items: {
        create: [{ seatId: targetSeat.id }],
      },
    },
  });

  // Mark seat as HELD
  await prisma.seat.update({
    where: { id: targetSeat.id },
    data: { status: 'HELD' },
  });

  // Verify it was marked HELD in DB
  const heldSeatInDb = await prisma.seat.findUnique({ where: { id: targetSeat.id } });
  if (heldSeatInDb?.status !== 'HELD') {
    throw new Error('Precondition failed: seat was not set to HELD');
  }

  // Now call seatService.getSeatsByEvent() which should trigger lazy expiration!
  const refreshedSeats = await seatService.getSeatsByEvent(created.id);
  const releasedSeat = refreshedSeats.find((s) => s.id === targetSeat.id);

  if (releasedSeat?.status !== 'AVAILABLE') {
    throw new Error(`Expected expired HELD seat to be lazily restored to AVAILABLE, but was ${releasedSeat?.status}`);
  }

  // Verify reservation status in DB was updated to EXPIRED
  const updatedRes = await prisma.reservation.findUnique({ where: { id: expiredRes.id } });
  if (updatedRes?.status !== 'EXPIRED') {
    throw new Error(`Expected reservation status to be EXPIRED, got ${updatedRes?.status}`);
  }

  console.log('   ✅ Test 5 Passed: Lazy expiration automatically released seat back to AVAILABLE!\n');

  // Cleanup test event
  await prisma.event.delete({ where: { id: created.id } });
  console.log('   Cleaned up test event.');

  console.log('======================================================');
  console.log('🎉 ALL PHASE 3 API & SERVICE TESTS PASSED! (5/5 tests)');
  console.log('======================================================\n');
}

runPhase3Verification()
  .catch((err) => {
    console.error('❌ Phase 3 verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
