// ============================================
// Billow Backend — Budget Routes
// ============================================
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getBudget, updateBudget } from '../services/budgetService.js';
import { getCostSummary } from '../services/costService.js';

const router = Router();

// Validation schema for updating the budget config
const updateBudgetSchema = z.object({
  monthlyBudget: z.number().positive('Budget must be positive'),
  alertThresholds: z.array(z.number().min(0).max(200)),
  currency: z.string().default('USD'),
  alertMethod: z.enum(['email', 'telegram', 'both']),
});

/**
 * GET /api/budget
 * Retrieves the current budget configuration.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const budget = await getBudget();
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/budget
 * Updates the budget configuration.
 */
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsedBody = updateBudgetSchema.parse(req.body);
    const updated = await updateBudget(parsedBody);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/budget/status
 * Computes the current spend vs budget.
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const budget = await getBudget();
    const costSummary = await getCostSummary();
    
    const usedAmount = costSummary.totalThisMonth;
    const remainingAmount = Math.max(0, budget.monthlyBudget - usedAmount);
    const usedPercent = budget.monthlyBudget > 0 ? (usedAmount / budget.monthlyBudget) * 100 : 0;
    
    res.json({
      monthlyBudget: budget.monthlyBudget,
      currentSpend: usedAmount,
      remainingBudget: remainingAmount,
      usedPercent: parseFloat(usedPercent.toFixed(1)),
      currency: budget.currency,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
