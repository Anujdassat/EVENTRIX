# EVENTRIX System Architecture

ByteVox Event Ticket Booking & Seat Reservation System

---

## 1. High-Level Architecture Overview

EVENTRIX is built as a high-concurrency event ticketing platform with a clean separation of concerns:
- **Client Tier**: React 19 + TypeScript + Vite with a reactive reservation timer context and dynamic seat maps.
- **API Tier**: Node.js + Express + TypeScript implementing 3-tier layering (Routes, Controllers, Services).
- **Data Tier**: SQLite / PostgreSQL managed via Prisma ORM with ACID transaction boundaries.
- **Worker Tier**: An automated 10-second background cleanup daemon coupled with real-time query-level lazy expiration.

```mermaid
graph TD
    Client["Client Browser (React 19 + Vite)"] -->|HTTP / REST + x-user-id| Router["Express Router Layer"]
    Router --> Middleware["Zod Validation & Error Handling"]
    Middleware --> Controllers["Controllers Layer"]
    Controllers --> Services["Services Layer"]
    
    subgraph Services_Layer["Business Domain Services"]
        EventSvc["EventService (List, Tiers, Matrix Gen)"]
        SeatSvc["SeatService (Grid, Status, Lazy Expiry)"]
        ResSvc["ReservationService (Concurrency Locks, 5-Min TTL)"]
        BookSvc["BookingService (Checkout, Ref Gen, Stats)"]
        Worker["ExpiryDaemon (10s Background Interval)"]
    end

    Services --> ORM["Prisma ORM (ACID Transactions)"]
    ORM --> Database[("SQLite / PostgreSQL Database")]
```

---

## 2. End-to-End Booking Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Browser)
    participant API as Backend API Layer
    participant DB as Prisma (Database)
    participant Worker as Background Expiry Daemon

    Customer->>API: GET /api/events/:id/seats
    API->>DB: Lazy check: Reset any expired HELD seats to AVAILABLE
    API->>DB: Fetch seats ordered by row, number
    DB-->>API: Seat Grid (AVAILABLE, HELD, BOOKED)
    API-->>Customer: 200 OK (Seats payload)

    Customer->>API: POST /api/events/:id/reservations (seatIds)
    Note over API,DB: BEGIN TRANSACTION (SERIALIZABLE)
    API->>DB: Verify seats exist and are AVAILABLE
    API->>DB: UPDATE seats SET status='HELD' WHERE status='AVAILABLE'
    API->>DB: INSERT Reservation (status='ACTIVE', expiresAt=now+5m)
    Note over API,DB: COMMIT TRANSACTION
    API-->>Customer: 201 Created (5-Min Reservation + remainingSeconds)

    alt Scenario A: Checkout Success within 5 Minutes
        Customer->>API: POST /api/reservations/:id/confirm
        Note over API,DB: BEGIN TRANSACTION
        API->>DB: Verify reservation is ACTIVE and expiresAt > now
        API->>DB: UPDATE seats SET status='BOOKED'
        API->>DB: UPDATE reservation SET status='CONFIRMED'
        API->>DB: INSERT Booking (bookingRef: EVX-2026-XXXXX)
        Note over API,DB: COMMIT TRANSACTION
        API-->>Customer: 200 OK (Confirmed Ticket Details)
    else Scenario B: Customer Abandons / Expiration (TTL Exceeded)
        Worker->>DB: Poll for ACTIVE reservations WHERE expiresAt < now()
        Worker->>DB: UPDATE reservations SET status='EXPIRED'
        Worker->>DB: UPDATE seats SET status='AVAILABLE'
    else Scenario C: Customer Manually Cancels Hold
        Customer->>API: DELETE /api/reservations/:id
        API->>DB: UPDATE reservation SET status='CANCELLED'
        API->>DB: UPDATE seats SET status='AVAILABLE'
        API-->>Customer: 200 OK (Hold Released)
    end
```

---

## 3. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    EVENT ||--o{ SEAT : contains
    EVENT ||--o{ RESERVATION : has
    EVENT ||--o{ BOOKING : has
    RESERVATION ||--o{ RESERVATION_ITEM : contains
    SEAT ||--o{ RESERVATION_ITEM : referenced_by
    BOOKING ||--o{ BOOKING_ITEM : includes
    SEAT ||--o{ BOOKING_ITEM : booked_as

    EVENT {
        string id PK
        string name
        string description
        datetime date
        string venue
        string status
        datetime createdAt
    }

    SEAT {
        string id PK
        string eventId FK
        string row
        int number
        string section "VIP | Premium | Standard"
        float price
        string status "AVAILABLE | HELD | BOOKED"
        int version "Optimistic lock version token"
    }

    RESERVATION {
        string id PK
        string eventId FK
        string userId "Session UUID"
        datetime expiresAt "CreatedAt + 5 minutes"
        string status "ACTIVE | EXPIRED | CONFIRMED | CANCELLED"
        datetime createdAt
    }

    RESERVATION_ITEM {
        string id PK
        string reservationId FK
        string seatId FK
    }

    BOOKING {
        string id PK
        string bookingRef UK "EVX-2026-XXXXX"
        string eventId FK
        string userId
        string reservationId FK
        float totalAmount
        string status "CONFIRMED | CANCELLED"
        string customerName
        string customerEmail
        datetime createdAt
    }

    BOOKING_ITEM {
        string id PK
        string bookingId FK
        string seatId FK
        float price
    }
```
