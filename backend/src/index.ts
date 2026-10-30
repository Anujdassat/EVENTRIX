import express from 'express';
import cors from 'cors';
import { config } from './config';
import healthRoutes from './routes/health.routes';
import eventRoutes from './routes/event.routes';
import reservationRoutes from './routes/reservation.routes';
import bookingRoutes from './routes/booking.routes';
import { errorHandler } from './middleware/errorHandler';
import { startExpiryDaemon, stopExpiryDaemon } from './services/expiry.service';

const app = express();

// Global Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api', bookingRoutes);

// Centralized Error Handling
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[Server] Event Ticket backend running on http://localhost:${config.port}`);
  console.log(`[Server] Environment: ${config.nodeEnv}`);
  // Start the background 5-minute reservation expiry cleaner
  startExpiryDaemon();
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM signal received. Closing HTTP server gracefully.');
  stopExpiryDaemon();
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT signal received. Closing HTTP server gracefully.');
  stopExpiryDaemon();
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

export default app;
