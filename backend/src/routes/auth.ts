import { Router } from 'express';
import { loginAdmin, logoutAdmin, getCurrentAdmin, authenticateAdmin } from '../middleware/auth';

const router = Router();

// POST /api/auth/login - Admin login
router.post('/login', loginAdmin);

// POST /api/auth/logout - Admin logout
router.post('/logout', authenticateAdmin, logoutAdmin);

// GET /api/auth/me - Get current admin user
router.get('/me', authenticateAdmin, getCurrentAdmin);

export default router;
