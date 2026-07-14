// ============================================
// Billow Backend — Global Error Handler
// ============================================
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Express middleware to capture all unhandled errors and return a standardized
 * JSON error payload instead of crashing the server or leaking stack traces.
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error occurred on ${req.method} ${req.path}:`, error);

  // 1. Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
      timestamp,
    });
    return;
  }

  // 2. Handle generic system/runtime errors
  const statusCode = (error as any).status || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected server error occurred.'
    : error.message;

  res.status(statusCode).json({
    error: message,
    timestamp,
    ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
  });
}
