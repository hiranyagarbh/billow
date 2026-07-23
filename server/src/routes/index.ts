// ============================================
// Billow Backend — Central Router
// ============================================
import { Router } from 'express';
import costRoutes from './costRoutes.js';
import budgetRoutes from './budgetRoutes.js';
import { getHealthStatus, recordRequest } from '../services/healthService.js';

const router = Router();

// ─── Request Counter ─────────────────────────────────────────────────────────
// Increment the global request counter for every API call.
// This runs before any route handler so the count stays accurate.
router.use((_req, _res, next) => {
  recordRequest();
  next();
});

// Mount sub-routers
router.use('/costs', costRoutes);
router.use('/budget', budgetRoutes);

/**
 * GET /api/health
 *
 * Returns a comprehensive health snapshot including:
 *   • Server uptime (start time, human-readable duration, raw seconds)
 *   • System info (Node version, platform, memory usage)
 *   • App state (environment, mock mode, total requests served)
 *
 * Used by Docker HEALTHCHECK, monitoring dashboards, and CI smoke tests.
 */
router.get('/health', (_req, res) => {
  res.json(getHealthStatus());
});

export default router;

