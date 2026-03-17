import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { AppError, errorHandler } from './utils/errors.js';

// Import Routes (To be created)
import authRoutes from './routes/auth.routes.js';
import rideRoutes from './routes/ride.routes.js';
import recurringRoutes from './routes/recurring.routes.js';

const app = express();

// Trust proxy for rate limiter to get correct IP from Vite/Reverse proxy
app.set('trust proxy', 1);

// Global Middlewares
app.use(helmet()); // Set security HTTP headers
app.use(cors({ origin: true, credentials: true })); // Enable CORS
app.use(express.json({ limit: '10kb' })); // Body parser
app.use(morgan('dev')); // Development logging

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/recurring', recurringRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, timestamp: new Date() }));

// Handle unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
