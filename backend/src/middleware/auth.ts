import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// For demonstration - in production, use proper JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Admin user interface
interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}

// Generate JWT token for admin
export const generateAdminToken = (admin: AdminUser): string => {
  return jwt.sign(
    { 
      id: admin.id, 
      email: admin.email, 
      role: admin.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to authenticate admin users
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Access denied. No token provided or invalid format.' 
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ 
      error: 'Access denied. Invalid token.' 
    });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }

  req.user = decoded;
  next();
};

// Login endpoint for admin
export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find admin user in database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.userType !== 'ADMIN') {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Create admin object for token generation
    const admin = {
      id: user.id,
      email: user.email,
      role: 'admin' as const,
    };

    const token = generateAdminToken(admin);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current admin user info
export const getCurrentAdmin = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    res.json({
      admin: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error getting current admin:', error);
    res.status(500).json({ error: 'Failed to get admin info' });
  }
};

// Logout endpoint (client-side token removal)
export const logoutAdmin = async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful. Please remove the token from client storage.',
  });
};
