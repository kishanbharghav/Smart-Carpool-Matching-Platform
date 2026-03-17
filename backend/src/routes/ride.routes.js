import express from 'express';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  createRide,
  postRideSchema,
  getRides,
  joinRide,
  updateRideStatus,
  getRideById
} from '../controllers/ride.controller.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRides)
  .post(validate(postRideSchema), createRide);

router.route('/:id')
  .get(getRideById);

router.post('/:id/join', joinRide);
router.patch('/:id/status', updateRideStatus);

export default router;
