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

const app = express();

// ── Security Headers (Section 9.5) ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true },
  })
);

// ── CORS — locked to frontend origin only, no wildcard (Section 9.5) ──
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  })
);

// ── Body parsing with size limits (Section 9.5) ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Cookie parsing (for refresh tokens + CSRF) ──
app.use(cookieParser());

// ── Global rate limiting (Section 9.5) ──
app.use(generalRateLimiter);

// ── CSRF protection (Section 9.5) ──
app.use(csrfProtection);

// ── Request logging ──
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// ── Routes (Section 5 REST API Contract) ──
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

// ── 404 handler ──
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ──
app.use(errorHandler);

// ── Start server ──
const PORT = env.PORT;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
  logger.info(`📡 CORS origin: ${env.CORS_ORIGIN}`);
});

export default app;
