import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import productsRouter from './routes/products';
import categoriesRouter from './routes/categories';
import adminRouter from './routes/admin';
import authRouter from './routes/auth';
import customerAuthRouter from './routes/customer-auth';
import cartRouter from './routes/cart';
import ordersRouter from './routes/orders';
import userProfileRouter from './routes/user-profile';
import reviewsRouter from './routes/reviews';
import uploadRouter from './routes/upload';
import favoritesRouter from './routes/favorites';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/auth', authRouter); // Admin auth
app.use('/api/customer-auth', customerAuthRouter); // Customer auth
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/user', userProfileRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/favorites', favoritesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
