# ByteVox Technical Assignment: Design Decisions Document

### Event Ticket Booking & Seat Reservation System

---

### 1. How seats are reserved and bookings are confirmed

#### Seat Reservation Flow:
When a customer selects seats on the interactive map:
1. The client dispatches `POST /api/events/:id/reservations` with the selected `seatIds` and session header `x-user-id`.
2. The service verifies the event is published, deduplicates seat IDs, and runs real-time lazy cleanup for any stale reservations.
3. Inside an **ACID transaction**, the system verifies all requested seats belong to the event and have status `AVAILABLE`.
4. It executes an atomic update (`status = 'HELD', version = version + 1`) matching `count === seatIds.length`.
5. It records a new `Reservation` entity with `expiresAt = now + 5 minutes` and status `ACTIVE`.
6. The client receives `{ id, expiresAt, serverTime, remainingSeconds }`, initializing the synchronized countdown timer in the floating bar and navbar.

#### Booking Confirmation Flow:
1. The customer confirms checkout via `POST /api/reservations/:id/confirm`.
2. The service enforces:
   - **Ownership verification**: `reservation.userId === sessionUserId`.
   - **Status & TTL verification**: `reservation.status === 'ACTIVE'` and `reservation.expiresAt > now`. If expired, it triggers immediate release and rejects with `410 Gone`.
   - **Price Integrity**: Total amount is computed dynamically from database seat pricing (never trusting client parameters).
3. In a transaction:
   - Seats transition from `HELD` to `BOOKED`.
   - Reservation transitions from `ACTIVE` to `CONFIRMED`.
   - A unique alphanumeric booking reference is generated (`EVX-2026-XXXXX`).
   - A `Booking` record with `BookingItem` relations is created.

---

### 2. How we prevent double booking when multiple users select the same seat

Concurrency control is guaranteed at the **database transaction level**, not merely in-memory or on the frontend:

1. **Atomic Conditional Update Pattern**:
   ```sql
   UPDATE "Seat"
   SET "status" = 'HELD', "version" = "version" + 1
   WHERE "id" IN (:seatIds)
     AND "status" = 'AVAILABLE';
   ```
2. **Strict Count Equality Assertion**:
   - Inside `prisma.$transaction`, if `updateResult.count !== requestedSeatIds.length`, the transaction immediately throws an `AppError('Seat conflict detected', 409, 'SEAT_UNAVAILABLE')` and aborts.
   - Any concurrent attempt to reserve the same seat simultaneously fails cleanly with `409 Conflict`.
   - Our automated stress test ([`backend/src/tests/concurrency.verify.ts`](file:///d:/dev/event%20ticket/backend/src/tests/concurrency.verify.ts)) simulates 5 concurrent users requesting the same seat at the exact same millisecond: **exactly 1 request succeeds (201) while the other 4 fail with 409 Conflict**.
3. **Optimistic Version Token**:
   - Each seat contains an integer `version` incremented on status change, preventing lost updates in high-contention environments.

---

### 3. How temporary reservations expire and seats become available again

EVENTRIX employs a **Dual-Layer Expiration Strategy**:

1. **Layer 1: Real-Time Lazy Expiration (On-Demand)**:
   - Whenever any user queries seat availability (`GET /api/events/:id/seats`) or initiates a reservation, the service actively identifies any active reservations whose `expiresAt < now()`.
   - It marks those reservations `EXPIRED` and restores their seats to `AVAILABLE` inside a transaction.
   - *Advantage*: Guarantees that clients never encounter stale "held" seats even if a background worker is delayed.

2. **Layer 2: Background Expiration Daemon (Active Scheduled Polling)**:
   - A lightweight in-memory background worker ([`backend/src/services/expiry.service.ts`](file:///d:/dev/event%20ticket/backend/src/services/expiry.service.ts)) runs every **10 seconds**.
   - It queries `Reservation.findMany({ where: { status: 'ACTIVE', expiresAt: { lt: now } }, take: 100 })`.
   - Batch-updates expired reservations and bulk-restores seat statuses to `AVAILABLE`.

3. **Voluntary User Cancellation**:
   - Customers can click "Release Hold" (`DELETE /api/reservations/:id`), which immediately transitions the reservation to `CANCELLED` and resets the seats to `AVAILABLE` without waiting for the 5-minute timeout.

---

### 4. How the database stores events, seats, reservations, and bookings

The schema uses relational integrity constraints modeled in Prisma:

- **`Event`**: Stores event metadata, venue, date, and publishing status.
- **`Seat`**: Represents physical seat coordinates (`row`, `number`, `section`, `price`, `status`, `version`).
  - Constraint: `@@unique([eventId, row, number])` ensures no duplicate coordinates can exist within an event.
  - Index: `@@index([eventId, status])` accelerates real-time availability lookups.
- **`Reservation`**: Represents a 5-minute hold session tied to an anonymous `userId` session, with `expiresAt` and `status` (`ACTIVE | EXPIRED | CONFIRMED | CANCELLED`).
  - Index: `@@index([status, expiresAt])` enables 10-second expiration scans in constant time.
- **`ReservationItem`**: Junction table mapping held seats to the reservation.
- **`Booking`**: Immutable record of confirmed purchases, storing unique `bookingRef` (`EVX-2026-XXXXX`), customer information, total amount, and timestamp.
- **`BookingItem`**: Captures historical price snapshot for every seat booked, guaranteeing financial auditability even if seat base prices change later.

---

### 5. How the system could handle a large number of users booking a popular event

For flash-sale events (e.g. 50,000 users competing for 5,000 seats):

1. **Redis Distributed Locking / In-Memory Reservation**:
   - Use Redis `SET seat:{id} {userId} NX EX 300` (Atomic Set if Not Exists with 300s TTL).
   - This absorbs the immense write throughput in sub-millisecond memory without putting read/write locks on the primary database.
2. **Virtual Waiting Room & Queue (e.g. RabbitMQ / Redis Streams / Cloudflare Waiting Room)**:
   - Buffer incoming checkout traffic using tokenized admission rates (e.g., admitting 200 users per second into the reservation checkout pipeline).
3. **Database Read Replicas & Cache-Aside**:
   - Cache event metadata and venue geometries in Redis or CDN edges.
   - Route seat availability queries through read replicas while reserving write masters for atomic transactions.
4. **WebSocket / SSE Availability Broadcasts**:
   - Push seat status transitions (`HELD`, `AVAILABLE`, `BOOKED`) via WebSockets to connected browsers, eliminating polling overhead.
