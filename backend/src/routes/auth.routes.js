import express from 'express';
import { validate } from '../middlewares/validate.js';
import { protect } from '../middlewares/auth.js';
import {
  register,
  registerSchema,
  login,
  loginSchema,
  getMe
} from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

export default router;
