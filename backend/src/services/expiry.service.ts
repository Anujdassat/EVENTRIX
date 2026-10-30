import { prisma } from '../db/prisma';
import { config } from '../config';

let daemonInterval: NodeJS.Timeout | null = null;

/**
 * Background worker that scans for expired ACTIVE reservations
 * and releases their held seats back to AVAILABLE.
 */
export async function runExpiryCleanup(): Promise<number> {
  const now = new Date();

  try {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      include: {
        items: true,
      },
      take: 100, // Batch limit for high throughput
    });

    if (expiredReservations.length === 0) {
      return 0;
    }

    const expiredIds = expiredReservations.map((r) => r.id);
    const seatIds = expiredReservations.flatMap((r) => r.items.map((i) => i.seatId));

    await prisma.$transaction(async (tx) => {
      await tx.reservation.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      });

      if (seatIds.length > 0) {
        await tx.seat.updateMany({
          where: {
            id: { in: seatIds },
            status: 'HELD',
          },
          data: {
            status: 'AVAILABLE',
            version: { increment: 1 },
          },
        });
      }
    });

    console.log(
      `[ExpiryDaemon] Released ${seatIds.length} seat(s) from ${expiredIds.length} expired reservation(s).`
    );
    return seatIds.length;
  } catch (err) {
    console.error('[ExpiryDaemon] Error executing reservation expiry cleanup:', err);
    return 0;
  }
}

export function startExpiryDaemon(): void {
  if (daemonInterval) return;

  const intervalMs = config.expiryCleanupIntervalSeconds * 1000;
  console.log(`[ExpiryDaemon] Started background worker (running every ${config.expiryCleanupIntervalSeconds}s).`);

  // Run initial cleanup on startup
  runExpiryCleanup();

  daemonInterval = setInterval(() => {
    runExpiryCleanup();
  }, intervalMs);
}

export function stopExpiryDaemon(): void {
  if (daemonInterval) {
    clearInterval(daemonInterval);
    daemonInterval = null;
    console.log('[ExpiryDaemon] Background worker stopped.');
  }
}
