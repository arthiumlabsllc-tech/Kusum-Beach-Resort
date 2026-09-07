import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, notFound } from './middleware/errorHandler';
import logger from './lib/logger';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import stockRoutes from './routes/stock';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import alertRoutes from './routes/alerts';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';

// Services
import { alertService } from './services/alertService';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// =============================================
// API ROUTES - RESTful Design
// =============================================
const api = config.apiPrefix;

// Authentication
app.use(`${api}/auth`, authRoutes);

// Products (Drinks)
app.use(`${api}/products`, productRoutes);

// Categories
app.use(`${api}/categories`, categoryRoutes);

// Inventory / Stock
app.use(`${api}/stock`, stockRoutes);

// Orders (POS)
app.use(`${api}/orders`, orderRoutes);

// Payments
app.use(`${api}/payments`, paymentRoutes);

// Alerts
app.use(`${api}/alerts`, alertRoutes);

// Analytics & Reports
app.use(`${api}/analytics`, analyticsRoutes);

// Users (Staff Management)
app.use(`${api}/users`, userRoutes);

// System Settings
app.use(`${api}/settings`, settingsRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start alert service
alertService.start();

export default app;
