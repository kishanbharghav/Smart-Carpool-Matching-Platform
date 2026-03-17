import { z } from 'zod';
import prisma from '../config/db.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/errors.js';

export const postRideSchema = z.object({
  body: z.object({
    originLat: z.number(),
    originLng: z.number(),
    originAddress: z.string().optional(),
    destLat: z.number(),
    destLng: z.number(),
    destAddress: z.string().optional(),
    departureAt: z.string().datetime(),
    maxSeats: z.number().int().min(1)
  })
});

export const createRide = catchAsync(async (req, res, next) => {
  const { originLat, originLng, originAddress, destLat, destLng, destAddress, departureAt, maxSeats } = req.body;
  
  const ride = await prisma.ride.create({
    data: {
      driverId: req.user.id,
      originLat, originLng, originAddress,
      destLat, destLng, destAddress,
      departureAt: new Date(departureAt),
      maxSeats,
      status: 'scheduled'
    }
  });

  res.status(201).json({ status: 'success', data: { ride } });
});

export const getRides = catchAsync(async (req, res, next) => {
  // Simple search & filtering
  const { date, my, status } = req.query;
  const whereCmd = {};

  if (date === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    whereCmd.departureAt = { gte: start, lte: end };
  } else if (date === 'upcoming') {
    whereCmd.departureAt = { gte: new Date() };
  }

  if (status) {
    whereCmd.status = status;
  } else {
    // Hide completed/cancelled by default unless specifically asked
    whereCmd.status = { in: ['scheduled', 'active'] };
  }

  if (my === 'true') {
    whereCmd.OR = [
      { driverId: req.user.id },
      { passengers: { some: { userId: req.user.id } } }
    ];
  }

  const rides = await prisma.ride.findMany({
    where: whereCmd,
    include: {
      driver: { select: { id: true, name: true, avatar: true, totalRides: true } },
      passengers: { select: { user: { select: { id: true, name: true, avatar: true } } } }
    },
    orderBy: { departureAt: 'asc' }
  });

  res.status(200).json({ status: 'success', results: rides.length, data: { rides } });
});

export const joinRide = catchAsync(async (req, res, next) => {
  const rideId = parseInt(req.params.id);
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: { passengers: true }
  });

  if (!ride) return next(new AppError('Ride not found', 404));
  if (ride.driverId === req.user.id) return next(new AppError('You cannot join your own ride', 400));
  if (ride.passengers.length >= ride.maxSeats) return next(new AppError('Ride is full', 400));
  if (ride.status !== 'scheduled') return next(new AppError('Ride is not taking new passengers', 400));
  if (ride.passengers.some(p => p.userId === req.user.id)) return next(new AppError('You already joined this ride', 400));

  await prisma.ridePassenger.create({
    data: { rideId, userId: req.user.id }
  });

  res.status(200).json({ status: 'success', message: 'Joined ride successfully' });
});

export const updateRideStatus = catchAsync(async (req, res, next) => {
  const rideId = parseInt(req.params.id);
  const { status } = req.body;
  
  if (!['active', 'completed', 'cancelled'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return next(new AppError('Ride not found', 404));
  if (ride.driverId !== req.user.id) return next(new AppError('Only the driver can update status', 403));

  const updatedRide = await prisma.ride.update({
    where: { id: rideId },
    data: { status }
  });

  // If completed, update user stats (dummy logic to extend later with true fuelCost saving)
  if (status === 'completed') {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { totalRides: { increment: 1 }, totalCarbonSaved: { increment: 2.5 } } // Ex: dummy increment 2.5kg
    });
  }

  res.status(200).json({ status: 'success', data: { ride: updatedRide } });
});

export const getRideById = catchAsync(async (req, res, next) => {
  const rideId = parseInt(req.params.id);
  const ride = await prisma.ride.findUnique({
    where: { id: rideId },
    include: {
      driver: { select: { id: true, name: true, avatar: true, totalRides: true } },
      passengers: { select: { user: { select: { id: true, name: true, avatar: true } } } },
      messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }
    }
  });
  
  if (!ride) return next(new AppError('Ride not found', 404));

  res.status(200).json({ status: 'success', data: { ride } });
});
