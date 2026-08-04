import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateMaterialExpenseSchema,
  CreateShopExpenseSchema,
  CreateMiscExpenseSchema,
  VoidReasonSchema,
  ExpenseQuerySchema,
} from '@shop-finance/shared';
import * as expenseService from '../services/expenseService';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ────────────────────────────────────────
// Material Expenses
// ────────────────────────────────────────

router.post('/material', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateMaterialExpenseSchema.parse(req.body);
    const expense = await expenseService.createMaterialExpense(
      req.user!.shopId,
      req.user!.userId,
      input,
      req
    );
    res.status(201).json({
      success: true,
      data: { ...expense, amount: expense.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/material', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = ExpenseQuerySchema.parse(req.query);
    const expenses = await expenseService.listMaterialExpenses(req.user!.shopId, filters);
    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
});

router.patch('/material/:id/void', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.parse(req.body);
    const expense = await expenseService.voidMaterialExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      input,
      req
    );
    res.json({
      success: true,
      data: { ...expense, amount: expense.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────
// Shop Expenses
// ────────────────────────────────────────

router.post('/shop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateShopExpenseSchema.parse(req.body);
    const expense = await expenseService.createShopExpense(
      req.user!.shopId,
      req.user!.userId,
      input,
      req
    );
    res.status(201).json({
      success: true,
      data: { ...expense, amount: expense.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/shop', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = ExpenseQuerySchema.parse(req.query);
    const expenses = await expenseService.listShopExpenses(req.user!.shopId, filters);
    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
});

router.patch('/shop/:id/void', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.parse(req.body);
    const expense = await expenseService.voidShopExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      input,
      req
    );
    res.json({
      success: true,
      data: { ...expense, amount: expense.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

// ────────────────────────────────────────
// Misc Expenses
// ────────────────────────────────────────

router.post('/misc', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateMiscExpenseSchema.parse(req.body);
    const expense = await expenseService.createMiscExpense(
      req.user!.shopId,
      req.user!.userId,
      input,
      req
    );
    res.status(201).json({
      success: true,
      data: { ...expense, amount: expense.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/misc', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = ExpenseQuerySchema.parse(req.query);
    const expenses = await expenseService.listMiscExpenses(req.user!.shopId, filters);
    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
});

router.patch('/misc/:id/void', authorize('OWNER'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.parse(req.body);
    const expense = await expenseService.voidMiscExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      input,
      req
    );
    res.json({
      success: true,
      data: { ...expense, amount: expense.amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
