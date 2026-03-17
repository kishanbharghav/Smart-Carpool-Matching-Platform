import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.errors || error.issues || [];
      const errorMessages = issues.map((issue) => ({
        message: `${issue.path.join('.')} is ${issue.message}`,
      }));
      return res.status(400).json({ status: 'fail', errors: errorMessages });
    }
    next(error);
  }
};
