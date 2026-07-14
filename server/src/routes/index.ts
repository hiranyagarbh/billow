// ============================================
// Billow Backend — Central Router
// ============================================
import { Router } from 'express';
import costRoutes from './costRoutes.js';
import budgetRoutes from './budgetRoutes.js';

const router = Router();

// Mount sub-routers
router.use('/costs', costRoutes);
router.use('/budget', budgetRoutes);

/**
 * GET /api/health
 * Simple healthcheck endpoint for monitoring and Docker container health checks.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

export default router;
