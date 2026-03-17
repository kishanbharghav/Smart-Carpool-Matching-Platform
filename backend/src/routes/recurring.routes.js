import express from 'express';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createRecurringTemplate,
  recurringSchema,
  getRecurringTemplates,
  deleteRecurringTemplate
} from '../controllers/recurring.controller.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRecurringTemplates)
  .post(validate(recurringSchema), createRecurringTemplate);

router.route('/:id')
  .delete(deleteRecurringTemplate);

export default router;
