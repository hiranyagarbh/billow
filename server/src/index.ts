// ============================================
// Billow Backend — Server Entry Point
// ============================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ─── Middleware Stack ────────────────────────────────────────────────────────
// helmet: Sets HTTP headers for basic security
app.use(helmet());

// cors: Allow cross-origin requests from our Vite development server
app.use(cors({
  origin: config.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// morgan: Logs incoming requests (method, status, duration) to terminal
app.use(morgan('dev'));

// compression: Gzip compression to reduce packet payload sizes
app.use(compression());

// express.json: Parse JSON-formatted body data in POST/PUT requests
app.use(express.json());

// ─── Router Mounting ─────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// ─── Error Handler (MUST be last middleware) ──────────────────────────────────
app.use(errorHandler);

// ─── Server Start ────────────────────────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  console.log(`==================================================`);
  console.log(`🌊 Billow Backend running on port ${config.PORT}`);
  console.log(`⚙️  Environment: ${config.NODE_ENV}`);
  console.log(`📦 Mock Data Mode: ${config.USE_MOCK_DATA}`);
  console.log(`🔌 Allowed CORS Origin: ${config.CORS_ORIGIN}`);
  console.log(`==================================================`);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
const shutdown = (signal: string) => {
  console.log(`\n📥 Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Express server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
