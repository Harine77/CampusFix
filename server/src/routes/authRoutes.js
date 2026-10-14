import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' })
});
router.post('/register', authLimit, controller.register);
router.post('/login', authLimit, controller.login);
router.get('/me', authenticate, controller.me);
export default router;
