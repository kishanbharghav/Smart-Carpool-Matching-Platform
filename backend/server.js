import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './config/db.js';
import { createServer } from 'http';
import { initSocket } from './socket.js';

import authRoutes from './routes/auth.js';
import rideRoutes from './routes/rides.js';
import recurringRoutes from './routes/recurring.js';

initDb();

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/recurring', recurringRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
