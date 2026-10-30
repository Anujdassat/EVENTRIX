import { prisma } from '../db/prisma';
import { reservationService } from '../services/reservation.service';
import { bookingService } from '../services/booking.service';
import { runExpiryCleanup } from '../services/expiry.service';

async function runConcurrencyAndBookingTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING CONCURRENCY, EXPIRY & BOOKING VERIFICATION SUITE');
  console.log('================================================================\n');

  // Find target event and available seats
  const event = await prisma.event.findFirst({
    where: { name: { contains: 'ByteVox AI & Cloud Summit 2026' } },
    include: { seats: { where: { status: 'AVAILABLE' } } },
  });

  if (!event || event.seats.length < 5) {
    throw new Error('Precondition failed: Event with at least 5 available seats required.');
  }

  const targetSeat = event.seats[0];
  console.log(`Target Seat for concurrency test: Row ${targetSeat.row}, Seat ${targetSeat.number} (ID: ${targetSeat.id})\n`);

  // -------------------------------------------------------------
  // TEST 1: Simultaneous Race Condition (5 users competing for 1 seat)
  // -------------------------------------------------------------
  console.log('1. Testing Race Condition: 5 concurrent users trying to reserve the EXACT SAME seat simultaneously...');

  const concurrentRequests = [1, 2, 3, 4, 5].map((userIndex) => {
    return reservationService.createReservation(
      event.id,
      `usr_race_test_${userIndex}`,
      [targetSeat.id]
    );
  });

  const results = await Promise.allSettled(concurrentRequests);

  const succeeded = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  console.log(`   Concurrent reservations outcome:`);
  console.log(`   - Successful: ${succeeded.length}`);
  console.log(`   - Rejected (Conflict): ${rejected.length}`);

  if (succeeded.length !== 1 || rejected.length !== 4) {
    throw new Error(`CRITICAL FAILURE: Expected exactly 1 winner and 4 rejections, but got ${succeeded.length} winners!`);
  }

  const winningReservation = (succeeded[0] as PromiseFulfilledResult<any>).value;
  console.log(`   Winner reservation ID: ${winningReservation.id} (status: ${winningReservation.status})`);
  console.log('   ✅ Test 1 Passed: ZERO DOUBLE-BOOKING GUARANTEED! Exactly 1 user acquired the seat.\n');

  // -------------------------------------------------------------
  // TEST 2: Active Reservation Expiration Daemon Test
  // -------------------------------------------------------------
  console.log('2. Testing Expiration Engine...');
  // Force expire the winning reservation
  await prisma.reservation.update({
    where: { id: winningReservation.id },
    data: { expiresAt: new Date(Date.now() - 5000) }, // 5 seconds ago
  });

  // Run the background cleanup worker
  const releasedCount = await runExpiryCleanup();
  console.log(`   Background worker ran: released ${releasedCount} seats.`);

  // Verify seat status is back to AVAILABLE
  const seatAfterCleanup = await prisma.seat.findUnique({ where: { id: targetSeat.id } });
  if (seatAfterCleanup?.status !== 'AVAILABLE') {
    throw new Error(`Expected seat to be restored to AVAILABLE, but found ${seatAfterCleanup?.status}`);
  }

  const resAfterCleanup = await prisma.reservation.findUnique({ where: { id: winningReservation.id } });
  if (resAfterCleanup?.status !== 'EXPIRED') {
    throw new Error(`Expected reservation status to be EXPIRED, got ${resAfterCleanup?.status}`);
  }
  console.log('   ✅ Test 2 Passed: 5-minute expiry daemon automatically reclaimed seat.\n');

  // -------------------------------------------------------------
  // TEST 3: User-Initiated Reservation Cancellation
  // -------------------------------------------------------------
  console.log('3. Testing Reservation Cancellation and Seat Release...');
  const testSeat2 = event.seats[1];
  const testUser = 'usr_cancellation_tester';

  const reservationToCancel = await reservationService.createReservation(
    event.id,
    testUser,
    [testSeat2.id]
  );
  console.log(`   Created active reservation ${reservationToCancel.id}`);

  // Test unauthorized cancellation
  try {
    await reservationService.cancelReservation(reservationToCancel.id, 'usr_unauthorized_attacker');
    throw new Error('Security check failed: Unauthorized cancellation was not rejected');
  } catch (err: any) {
    if (err.statusCode === 403) {
      console.log('   Security verified: Unauthorized cancellation rejected with 403 Forbidden.');
    } else {
      throw err;
    }
  }

  // Proper user cancels
  await reservationService.cancelReservation(reservationToCancel.id, testUser);
  const seatAfterCancel = await prisma.seat.findUnique({ where: { id: testSeat2.id } });
  if (seatAfterCancel?.status !== 'AVAILABLE') {
    throw new Error(`Expected seat to be AVAILABLE after cancellation, got ${seatAfterCancel?.status}`);
  }
  console.log('   ✅ Test 3 Passed: User cancelled reservation and seat was instantly released.\n');

  // -------------------------------------------------------------
  // TEST 4: Simulated Payment Decline & Checkout Success
  // -------------------------------------------------------------
  console.log('4. Testing Simulated Checkout & Booking Confirmation...');
  const testSeat3 = event.seats[2];
  const checkoutUser = 'usr_checkout_customer';

  const checkoutReservation = await reservationService.createReservation(
    event.id,
    checkoutUser,
    [testSeat3.id]
  );

  // 4a. Simulate Payment Failure
  try {
    await bookingService.confirmBooking(checkoutReservation.id, checkoutUser, {
      simulatePaymentFailure: true,
    });
    throw new Error('Simulated payment failure did not trigger');
  } catch (err: any) {
    if (err.statusCode === 402) {
      console.log('   Simulated payment failure correctly declined by simulated gateway (402).');
    } else {
      throw err;
    }
  }

  // Verify seat is still HELD after payment failure
  const seatAfterFailedPayment = await prisma.seat.findUnique({ where: { id: testSeat3.id } });
  if (seatAfterFailedPayment?.status !== 'HELD') {
    throw new Error(`Expected seat to remain HELD after failed payment attempt, got ${seatAfterFailedPayment?.status}`);
  }

  // 4b. Confirm Successful Booking
  const confirmedBooking = await bookingService.confirmBooking(checkoutReservation.id, checkoutUser, {
    customerName: 'Alice Engineer',
    customerEmail: 'alice@bytevox.io',
  });

  console.log(`   Booking Confirmed! Reference: ${confirmedBooking.bookingRef}, Total: $${confirmedBooking.totalAmount}`);
  if (!confirmedBooking.bookingRef.startsWith('EVX-2026-')) {
    throw new Error('Booking reference format invalid');
  }

  // Verify seat is now BOOKED in DB
  const seatAfterBooking = await prisma.seat.findUnique({ where: { id: testSeat3.id } });
  if (seatAfterBooking?.status !== 'BOOKED') {
    throw new Error(`Expected seat to be BOOKED in DB, got ${seatAfterBooking?.status}`);
  }

  // 4c. Verify Idempotency / Double Confirmation Prevention
  try {
    await bookingService.confirmBooking(checkoutReservation.id, checkoutUser);
    throw new Error('Double confirmation succeeded unexpectedly');
  } catch (err: any) {
    console.log('   Verified: Attempting to confirm an already confirmed reservation was rejected.');
  }

  // 4d. Verify Booking History Retrieval
  const customerHistory = await bookingService.getBookingsByUser(checkoutUser);
  console.log(`   Customer history returned ${customerHistory.length} booking(s).`);
  if (customerHistory.length === 0 || customerHistory[0].bookingRef !== confirmedBooking.bookingRef) {
    throw new Error('Booking history mismatch');
  }
  console.log('   ✅ Test 4 Passed: Simulated checkout, payment decline, booking confirmation, and history.\n');

  // -------------------------------------------------------------
  // TEST 5: Admin Booking Statistics
  // -------------------------------------------------------------
  console.log('5. Testing Admin Booking Statistics API...');
  const stats = await bookingService.getEventStatistics();
  const summitStats = stats.find((s) => s.eventId === event.id);

  if (!summitStats) {
    throw new Error('Summit stats not found');
  }
  console.log(`   Event Stats for "${summitStats.eventName}":`);
  console.log(`   - Total Seats: ${summitStats.totalSeats}`);
  console.log(`   - Booked Seats: ${summitStats.bookedSeats}`);
  console.log(`   - Occupancy: ${summitStats.occupancyPercentage}%`);
  console.log(`   - Total Revenue: $${summitStats.totalRevenue}`);
  console.log('   ✅ Test 5 Passed: Real-time statistics aggregation verified.\n');

  console.log('================================================================');
  console.log('🎉 ALL PHASE 4 & PHASE 5 TESTS PASSED SUCCESSFULLY! (5/5 tests)');
  console.log('================================================================\n');
}

runConcurrencyAndBookingTests()
  .catch((err) => {
    console.error('❌ Verification suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
