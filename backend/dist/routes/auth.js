"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/login - Admin login
router.post('/login', auth_1.loginAdmin);
// POST /api/auth/logout - Admin logout
router.post('/logout', auth_1.authenticateAdmin, auth_1.logoutAdmin);
// GET /api/auth/me - Get current admin user
router.get('/me', auth_1.authenticateAdmin, auth_1.getCurrentAdmin);
exports.default = router;
//# sourceMappingURL=auth.js.map