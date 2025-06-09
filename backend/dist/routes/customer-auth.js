"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../utils/emailService");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
// Customer registration
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        // Validation
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                error: 'Email, password, first name, and last name are required'
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long'
            });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email already exists'
            });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Generate email verification token
        const emailVerificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                userType: 'CUSTOMER',
                isEmailVerified: false,
                emailVerificationToken,
                emailVerificationExpiry
            }
        });
        // Send verification email
        try {
            await (0, emailService_1.sendVerificationEmail)(email, firstName, emailVerificationToken);
        }
        catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Continue with registration even if email fails
        }
        // Return success message (don't generate JWT yet - user needs to verify email first)
        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email to verify your account before logging in.',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userType: user.userType,
                isEmailVerified: user.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});
// Customer login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(401).json({
                error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            userType: user.userType
        }, JWT_SECRET, { expiresIn: '7d' });
        // Return user info (without password) and token
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userType: user.userType,
                isEmailVerified: user.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});
// Get current user
router.get('/me', authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                userType: true,
                avatar: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user information' });
    }
});
// Email verification endpoint
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({
                error: 'Verification token is required'
            });
        }
        // Find user with this verification token
        const user = await prisma.user.findUnique({
            where: {
                emailVerificationToken: token
            }
        });
        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired verification token'
            });
        }
        // Check if token has expired
        if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
            return res.status(400).json({
                error: 'Verification token has expired. Please request a new verification email.'
            });
        }
        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(200).json({
                success: true,
                message: 'Email is already verified. You can now log in.'
            });
        }
        // Update user to mark email as verified
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                emailVerificationToken: null,
                emailVerificationExpiry: null
            }
        });
        // Send welcome email
        try {
            await (0, emailService_1.sendWelcomeEmail)(user.email, user.firstName);
        }
        catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue even if welcome email fails
        }
        res.json({
            success: true,
            message: 'Email verified successfully! You can now log in to your account.',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                isEmailVerified: updatedUser.isEmailVerified
            }
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});
// Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                error: 'Email is required'
            });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }
        // Check if already verified
        if (user.isEmailVerified) {
            return res.status(400).json({
                error: 'Email is already verified'
            });
        }
        // Generate new verification token
        const emailVerificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Update user with new token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken,
                emailVerificationExpiry
            }
        });
        // Send verification email
        try {
            await (0, emailService_1.sendVerificationEmail)(email, user.firstName, emailVerificationToken);
            res.json({
                success: true,
                message: 'Verification email sent successfully. Please check your inbox.'
            });
        }
        catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            res.status(500).json({
                error: 'Failed to send verification email. Please try again later.'
            });
        }
    }
    catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
});
// Middleware to authenticate users
function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Access denied. No token provided or invalid format.'
        });
    }
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({
            error: 'Access denied. Invalid token.'
        });
    }
}
exports.default = router;
//# sourceMappingURL=customer-auth.js.map