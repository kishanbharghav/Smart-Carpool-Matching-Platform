import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from './config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true },
  });

  io.on('connection', (socket) => {
    socket.on('join_ride', ({ rideId, role, token }) => {
      if (rideId) socket.join(`ride:${rideId}`);
      if (token) {
        try {
          const payload = jwt.verify(token, JWT_SECRET);
          socket.userId = payload.id;
        } catch {}
      }
    });

    socket.on('driver_location', ({ rideId, lat, lng }) => {
      if (rideId == null || lat == null || lng == null) return;
      const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(rideId);
      if (!ride || ride.driver_id !== socket.userId) return;
      socket.to(`ride:${rideId}`).emit('driver_location', { rideId, lat, lng });
    });

    socket.on('disconnect', () => {});
  });

  return io;
}
