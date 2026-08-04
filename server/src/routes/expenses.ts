import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateMaterialExpenseSchema,
  CreateShopExpenseSchema,
  CreateMiscExpenseSchema,
  VoidReasonSchema,
  ExpenseQuerySchema,
} from '@shop-finance/shared';
import * as expenseService from '../services/expenseService';
import { authenticate } from '../middleware/auth';

const router = Router();

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

router.put('/material/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.updateMaterialExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      req.body,
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

router.delete('/material/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.voidMaterialExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: req.body?.reason || 'User deleted expense' },
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

router.patch('/material/:id/void', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.partial().parse(req.body || {});
    const expense = await expenseService.voidMaterialExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: input.reason || 'User voided expense' },
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

router.put('/shop/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.updateShopExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      req.body,
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

router.delete('/shop/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.voidShopExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: req.body?.reason || 'User deleted expense' },
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

router.patch('/shop/:id/void', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.partial().parse(req.body || {});
    const expense = await expenseService.voidShopExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: input.reason || 'User voided expense' },
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

router.put('/misc/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.updateMiscExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      req.body,
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

router.delete('/misc/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.voidMiscExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: req.body?.reason || 'User deleted expense' },
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

router.patch('/misc/:id/void', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = VoidReasonSchema.partial().parse(req.body || {});
    const expense = await expenseService.voidMiscExpense(
      req.user!.shopId,
      req.user!.userId,
      req.params.id as string,
      { reason: input.reason || 'User voided expense' },
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
