"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAdmin = exports.getCurrentAdmin = exports.loginAdmin = exports.authenticateAdmin = exports.verifyToken = exports.generateAdminToken = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// For demonstration - in production, use proper JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
// Generate JWT token for admin
const generateAdminToken = (admin) => {
    return jwt.sign({
        id: admin.id,
        email: admin.email,
        role: admin.role
    }, JWT_SECRET, { expiresIn: '24h' });
};
exports.generateAdminToken = generateAdminToken;
// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
// Middleware to authenticate admin users
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Access denied. No token provided or invalid format.'
        });
    }
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = (0, exports.verifyToken)(token);
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
exports.authenticateAdmin = authenticateAdmin;
// Login endpoint for admin
const loginAdmin = async (req, res) => {
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
            role: 'admin',
        };
        const token = (0, exports.generateAdminToken)(admin);
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
    }
    catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};
exports.loginAdmin = loginAdmin;
// Get current admin user info
const getCurrentAdmin = async (req, res) => {
    try {
        const user = req.user;
        res.json({
            admin: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Error getting current admin:', error);
        res.status(500).json({ error: 'Failed to get admin info' });
    }
};
exports.getCurrentAdmin = getCurrentAdmin;
// Logout endpoint (client-side token removal)
const logoutAdmin = async (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful. Please remove the token from client storage.',
    });
};
exports.logoutAdmin = logoutAdmin;
//# sourceMappingURL=auth.js.map