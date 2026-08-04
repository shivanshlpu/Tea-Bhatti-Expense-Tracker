import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrf';

// Route imports
import authRoutes from './routes/auth';
import salesRoutes from './routes/sales';
import expenseRoutes from './routes/expenses';
import withdrawalRoutes from './routes/withdrawals';
import dashboardRoutes from './routes/dashboard';
import analyticsRoutes from './routes/analytics';
import reportsRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import assistantRoutes from './routes/assistant';

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const app = express();

// ── Security Headers ──
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS — Allow configuration or wildcard fallback for production ──
const corsOrigin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  })
);

// ── Body parsing with size limits ──
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Cookie parsing ──
app.use(cookieParser());

// ── Global rate limiting ──
app.use(generalRateLimiter);

// ── CSRF protection ──
app.use(csrfProtection);

// ── Request logging ──
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/assistant', assistantRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({ name: 'Shop Finance API', status: 'running' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Start server listening on 0.0.0.0 for Cloud Hosting
const PORT = Number(process.env.PORT) || env.PORT || 10000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});

server.on('error', (err) => {
  console.error('❌ Server Listen Error:', err);
});

export default app;
