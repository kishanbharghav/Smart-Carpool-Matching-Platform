import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initSocket } from './utils/socket.js';
import { logger } from './utils/logger.js';
import prisma from './config/db.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
export const io = initSocket(server);

const startServer = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections Globally
process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION! 💥 Shutting down... ${err.name}, ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});
