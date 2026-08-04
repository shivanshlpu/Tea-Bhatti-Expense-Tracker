import { z } from 'zod';

// ── Money: always validate as positive decimal with max 2 decimal places ──
// Upper bound prevents absurd values (10^10 = 10 billion — sane for any shop)
export const MoneySchema = z
  .number()
  .positive('Amount must be positive')
  .max(10_000_000_000, 'Amount exceeds maximum allowed value')
  .refine(
    (val) => Number.isFinite(val) && Math.round(val * 100) === val * 100,
    'Amount must have at most 2 decimal places'
  );

// ── Enums ──
export const SaleTypeSchema = z.enum(['CASH', 'ONLINE']);
export type SaleType = z.infer<typeof SaleTypeSchema>;

export const PayModeSchema = z.enum(['CASH', 'ONLINE']);
export type PayMode = z.infer<typeof PayModeSchema>;

export const RoleSchema = z.enum(['OWNER', 'STAFF']);
export type Role = z.infer<typeof RoleSchema>;

// ── Auth Schemas ──
export const SignupSchema = z.object({
  shopName: z.string().min(1, 'Shop name is required').max(100),
  ownerName: z.string().min(1, 'Owner name is required').max(100),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ── Sale Schemas ──
export const CreateSaleSchema = z.object({
  type: SaleTypeSchema,
  amount: MoneySchema,
  paymentMethod: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
  saleDate: z.string().datetime({ message: 'Invalid date format' }),
});
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;

export const VoidReasonSchema = z.object({
  reason: z
    .string()
    .min(3, 'Void reason must be at least 3 characters')
    .max(500),
});
export type VoidReasonInput = z.infer<typeof VoidReasonSchema>;

// ── Expense Schemas ──
export const MaterialExpenseCategorySchema = z
  .string()
  .min(1, 'Category is required')
  .max(100);

export const ShopExpenseCategorySchema = z.enum([
  'Rent',
  'Electricity',
  'Internet',
  'Salary',
  'Maintenance',
  'Loan Repayment',
  'Misc',
]);
export type ShopExpenseCategory = z.infer<typeof ShopExpenseCategorySchema>;

export const CreateMaterialExpenseSchema = z.object({
  category: MaterialExpenseCategorySchema,
  amount: MoneySchema,
  mode: PayModeSchema,
  note: z.string().max(500).optional(),
  expDate: z.string().datetime({ message: 'Invalid date format' }),
});
export type CreateMaterialExpenseInput = z.infer<typeof CreateMaterialExpenseSchema>;

export const CreateShopExpenseSchema = z.object({
  category: ShopExpenseCategorySchema,
  amount: MoneySchema,
  mode: PayModeSchema,
  note: z.string().max(500).optional(),
  expDate: z.string().datetime({ message: 'Invalid date format' }),
  isRecurring: z.boolean().default(false),
});
export type CreateShopExpenseInput = z.infer<typeof CreateShopExpenseSchema>;

export const CreateMiscExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  amount: MoneySchema,
  mode: PayModeSchema,
  note: z.string().max(500).optional(),
  expDate: z.string().datetime({ message: 'Invalid date format' }),
});
export type CreateMiscExpenseInput = z.infer<typeof CreateMiscExpenseSchema>;

// ── Withdrawal Schema ──
export const CreateWithdrawalSchema = z.object({
  amount: MoneySchema,
  mode: PayModeSchema,
  note: z.string().max(500).optional(),
  wDate: z.string().datetime({ message: 'Invalid date format' }),
});
export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalSchema>;

// ── Query Params ──
export const DateRangeQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
});
export type DateRangeQuery = z.infer<typeof DateRangeQuerySchema>;

export const SalesQuerySchema = DateRangeQuerySchema.extend({
  type: SaleTypeSchema.optional(),
});
export type SalesQuery = z.infer<typeof SalesQuerySchema>;

export const ExpenseQuerySchema = DateRangeQuerySchema.extend({
  category: z.string().optional(),
});
export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>;

// ── Assistant Schema ──
export const AskQuestionSchema = z.object({
  question: z
    .string()
    .min(2, 'Question too short')
    .max(300, 'Question must be under 300 characters'),
});
export type AskQuestionInput = z.infer<typeof AskQuestionSchema>;

// ── Settings Schema ──
export const UpdateShopSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  ownerName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  currency: z.string().length(3).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});
export type UpdateShopSettingsInput = z.infer<typeof UpdateShopSettingsSchema>;

// ── Dashboard Summary Range ──
export const DashboardRangeSchema = z.enum(['week', 'month', 'year']);
export type DashboardRange = z.infer<typeof DashboardRangeSchema>;

// ── Analytics Granularity ──
export const GranularitySchema = z.enum(['day', 'week', 'month']);
export type Granularity = z.infer<typeof GranularitySchema>;
