import { Request, Response, NextFunction } from 'express';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SEAT_UNAVAILABLE'
  | 'RESERVATION_EXPIRED'
  | 'UNAUTHORIZED_RESERVATION'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 400, errorCode: ErrorCode = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode,
        status: err.statusCode,
        details: err.details ?? null,
      },
    });
    return;
  }

  // Fallback for unhandled exceptions
  console.error('[UnhandledError]', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error occurred.',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      details: null,
    },
  });
}
