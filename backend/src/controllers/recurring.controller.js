import { z } from 'zod';
import prisma from '../config/db.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/errors.js';

export const recurringSchema = z.object({
  body: z.object({
    originLat: z.number(),
    originLng: z.number(),
    originAddress: z.string().optional(),
    destLat: z.number(),
    destLng: z.number(),
    destAddress: z.string().optional(),
    departureTime: z.string(),
    daysOfWeek: z.string(),
    maxSeats: z.number().int().min(1)
  })
});

export const createRecurringTemplate = catchAsync(async (req, res, next) => {
  const { originLat, originLng, originAddress, destLat, destLng, destAddress, departureTime, daysOfWeek, maxSeats } = req.body;
  
  const template = await prisma.recurringTemplate.create({
    data: {
      driverId: req.user.id,
      originLat, originLng, originAddress,
      destLat, destLng, destAddress,
      departureTime,
      daysOfWeek,
      maxSeats,
    }
  });

  res.status(201).json({ status: 'success', data: { template } });
});

export const getRecurringTemplates = catchAsync(async (req, res, next) => {
  const templates = await prisma.recurringTemplate.findMany({
    where: { driverId: req.user.id }
  });

  res.status(200).json({ status: 'success', results: templates.length, data: { templates } });
});

export const deleteRecurringTemplate = catchAsync(async (req, res, next) => {
  const id = parseInt(req.params.id);
  const template = await prisma.recurringTemplate.findUnique({ where: { id } });

  if (!template) return next(new AppError('Template not found', 404));
  if (template.driverId !== req.user.id) return next(new AppError('Unauthorized', 403));

  await prisma.recurringTemplate.delete({ where: { id } });
  
  res.status(204).json({ status: 'success', data: null });
});
