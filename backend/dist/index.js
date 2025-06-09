"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const products_1 = __importDefault(require("./routes/products"));
const categories_1 = __importDefault(require("./routes/categories"));
const admin_1 = __importDefault(require("./routes/admin"));
const auth_1 = __importDefault(require("./routes/auth"));
const customer_auth_1 = __importDefault(require("./routes/customer-auth"));
const cart_1 = __importDefault(require("./routes/cart"));
const orders_1 = __importDefault(require("./routes/orders"));
const user_profile_1 = __importDefault(require("./routes/user-profile"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const upload_1 = __importDefault(require("./routes/upload"));
const favorites_1 = __importDefault(require("./routes/favorites"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/products', products_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/auth', auth_1.default); // Admin auth
app.use('/api/customer-auth', customer_auth_1.default); // Customer auth
app.use('/api/cart', cart_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/user', user_profile_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/favorites', favorites_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
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
exports.default = app;
//# sourceMappingURL=index.js.map