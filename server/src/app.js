import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { createHttpError } from './middleware/errors.js';
import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.clientOrigins, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '32kb' }));
app.use((req, _res, next) => {
  if (['POST', 'PATCH'].includes(req.method) && !req.is('multipart/form-data') && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) {
    return next(createHttpError(400, 'Send request data as a JSON object.'));
  }
  next();
});
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
