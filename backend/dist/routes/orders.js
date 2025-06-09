"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const customer_auth_1 = require("./customer-auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get user's order history
router.get('/', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                price: true
                            }
                        }
                    }
                },
                address: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });
        const totalOrders = await prisma.order.count({
            where: { userId }
        });
        res.json({
            success: true,
            orders,
            pagination: {
                page,
                limit,
                total: totalOrders,
                pages: Math.ceil(totalOrders / limit)
            }
        });
    }
    catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get order history' });
    }
});
// Get specific order details
router.get('/:orderId', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const orderId = req.params.orderId;
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId // Ensure user can only access their own orders
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                images: true,
                                price: true,
                                description: true
                            }
                        }
                    }
                },
                address: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({
            success: true,
            order
        });
    }
    catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order details' });
    }
});
// Create order from cart
router.post('/create', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { addressId, shippingMethod = 'standard' } = req.body;
        if (!addressId) {
            return res.status(400).json({ error: 'Shipping address is required' });
        }
        // Get user's cart items
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: true
            }
        });
        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        // Check if all items are still in stock
        for (const item of cartItems) {
            if (!item.product.inStock) {
                return res.status(400).json({
                    error: `${item.product.name} is out of stock`
                });
            }
            if (item.quantity > item.product.stock) {
                return res.status(400).json({
                    error: `Only ${item.product.stock} units of ${item.product.name} available`
                });
            }
        }
        // Verify address belongs to user
        const address = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId
            }
        });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const shipping = subtotal >= 50 ? 0 : 5.99; // Free shipping over $50
        const tax = subtotal * 0.08; // 8% tax rate
        const total = subtotal + shipping + tax;
        // Create order with transaction
        const order = await prisma.$transaction(async (tx) => {
            // Create the order
            const newOrder = await tx.order.create({
                data: {
                    userId,
                    addressId,
                    subtotal,
                    tax,
                    shipping,
                    total,
                    status: 'PENDING'
                }
            });
            // Create order items
            const orderItems = await Promise.all(cartItems.map(item => tx.orderItem.create({
                data: {
                    orderId: newOrder.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.product.price // Store price at time of order
                }
            })));
            // Update product stock
            for (const item of cartItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
            }
            // Clear user's cart
            await tx.cartItem.deleteMany({
                where: { userId }
            });
            return newOrder;
        });
        // Fetch complete order with details
        const completeOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                price: true
                            }
                        }
                    }
                },
                address: true
            }
        });
        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            order: completeOrder
        });
    }
    catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map