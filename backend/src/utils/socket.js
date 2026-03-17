import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication Error'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication Error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User Connected to Socket: ${socket.userId}`);

    // Ride Room Management
    socket.on('join_ride', async ({ rideId }) => {
      if (rideId) {
        socket.join(`ride:${rideId}`);
        logger.info(`User ${socket.userId} joined room ride:${rideId}`);
      }
    });

    socket.on('leave_ride', ({ rideId }) => {
       socket.leave(`ride:${rideId}`);
    });

    // Real-Time Location (Driver emits, broadcast to room)
    socket.on('driver_location', async ({ rideId, lat, lng }) => {
      if (!rideId || lat == null || lng == null) return;
      
      const ride = await prisma.ride.findUnique({
        where: { id: parseInt(rideId) },
        select: { driverId: true }
      });
      
      if (!ride || ride.driverId !== socket.userId) return; // Only driver can emit
      
      // Update DB last coordinates asynchronously
      prisma.ride.update({
        where: { id: parseInt(rideId) },
        data: { lastLat: lat, lastLng: lng }
      }).catch(err => logger.error(`Failed to map update DB: ${err.message}`));

      socket.to(`ride:${rideId}`).emit('driver_location', { rideId, lat, lng });
    });

    // In-Ride Chat System 
    socket.on('send_message', async ({ rideId, text }) => {
       if(!rideId || !text) return;
       // We should verify if user is part of ride before sending
       // Broadcast
       const messageData = { rideId, senderId: socket.userId, text, timestamp: new Date() };
       io.to(`ride:${rideId}`).emit('new_message', messageData);
       
       // Persist to DB 
       prisma.chatMessage.create({
         data: {
           rideId: parseInt(rideId),
           senderId: socket.userId,
           text
         }
       }).catch(err => logger.error(`Chat map update DB: ${err.message}`));
    });

    socket.on('disconnect', () => {
      logger.info(`User Disconnected: ${socket.userId}`);
    });
  });

  return io;
}
