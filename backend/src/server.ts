import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { connectDB } from './database/connection';
import { verifyToken } from './utils/jwt';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
import authRoutes from './routes/authRoutes';
import contributorRoutes from './routes/contributorRoutes';
import depositRoutes from './routes/depositRoutes';
import withdrawalRoutes from './routes/withdrawalRoutes';
import reconciliationRoutes from './routes/reconciliationRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contributors', contributorRoutes);
app.use('/api/v1/deposits', depositRoutes);
app.use('/api/v1/withdrawals', withdrawalRoutes);
app.use('/api/v1/reconciliation', reconciliationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket connection handling
// Allow connection without auth, but require auth for joining rooms
io.use((socket, next) => {
  // JWT authentication check - optional for connection, required for rooms
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = verifyToken(token);
      (socket as any).user = decoded;
    } catch (error: any) {
      // Invalid token, but allow connection (will be checked when joining rooms)
      (socket as any).user = null;
    }
  }
  
  next();
});

io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });

  // Join dashboard room for real-time updates
  socket.on('join:dashboard', () => {
    const user = (socket as any).user;
    if (!user || user.role !== 'super_admin') {
      socket.emit('error', { message: 'Unauthorized: Super admin access required' });
      return;
    }
    socket.join('dashboard');
    logger.info('Client joined dashboard room', { socketId: socket.id, userId: user.userId });
  });

  socket.on('leave:dashboard', () => {
    socket.leave('dashboard');
    logger.info('Client left dashboard room', { socketId: socket.id });
  });
});

// Export io for use in other modules
export { io };

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, { environment: process.env.NODE_ENV });
      logger.info(`WebSocket server ready`, { port: PORT });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export default app;
