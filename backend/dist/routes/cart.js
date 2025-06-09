"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const customer_auth_1 = require("./customer-auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get user's cart items
router.get('/', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        originalPrice: true,
                        image: true,
                        images: true,
                        inStock: true,
                        stock: true,
                        categoryId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        // Calculate totals
        const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        res.json({
            success: true,
            cartItems,
            total,
            itemCount
        });
    }
    catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to get cart items' });
    }
});
// Add item to cart
router.post('/add', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { productId, quantity = 1 } = req.body;
        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }
        if (quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }
        // Check if product exists and is in stock
        const product = await prisma.product.findUnique({
            where: { id: parseInt(productId) }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (!product.inStock) {
            return res.status(400).json({ error: 'Product is out of stock' });
        }
        if (quantity > product.stock) {
            return res.status(400).json({
                error: `Only ${product.stock} items available in stock`
            });
        }
        // Check if item already exists in cart
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: parseInt(productId)
                }
            }
        });
        let cartItem;
        if (existingCartItem) {
            // Update quantity
            const newQuantity = existingCartItem.quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({
                    error: `Cannot add ${quantity} more. Only ${product.stock - existingCartItem.quantity} items available`
                });
            }
            cartItem = await prisma.cartItem.update({
                where: {
                    userId_productId: {
                        userId,
                        productId: parseInt(productId)
                    }
                },
                data: { quantity: newQuantity },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            originalPrice: true,
                            image: true,
                            images: true,
                            inStock: true,
                            stock: true
                        }
                    }
                }
            });
        }
        else {
            // Create new cart item
            cartItem = await prisma.cartItem.create({
                data: {
                    userId,
                    productId: parseInt(productId),
                    quantity
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            originalPrice: true,
                            image: true,
                            images: true,
                            inStock: true,
                            stock: true
                        }
                    }
                }
            });
        }
        res.json({
            success: true,
            message: 'Item added to cart',
            cartItem
        });
    }
    catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});
// Update cart item quantity
router.put('/update', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { productId, quantity } = req.body;
        if (!productId || quantity === undefined) {
            return res.status(400).json({ error: 'Product ID and quantity are required' });
        }
        if (quantity < 0) {
            return res.status(400).json({ error: 'Quantity cannot be negative' });
        }
        // If quantity is 0, remove the item
        if (quantity === 0) {
            await prisma.cartItem.delete({
                where: {
                    userId_productId: {
                        userId,
                        productId: parseInt(productId)
                    }
                }
            });
            return res.json({
                success: true,
                message: 'Item removed from cart'
            });
        }
        // Check product stock
        const product = await prisma.product.findUnique({
            where: { id: parseInt(productId) }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (quantity > product.stock) {
            return res.status(400).json({
                error: `Only ${product.stock} items available in stock`
            });
        }
        // Update cart item
        const cartItem = await prisma.cartItem.update({
            where: {
                userId_productId: {
                    userId,
                    productId: parseInt(productId)
                }
            },
            data: { quantity },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        originalPrice: true,
                        image: true,
                        images: true,
                        inStock: true,
                        stock: true
                    }
                }
            }
        });
        res.json({
            success: true,
            message: 'Cart item updated',
            cartItem
        });
    }
    catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
});
// Remove item from cart
router.delete('/remove/:productId', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const productId = parseInt(req.params.productId);
        if (!productId) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        await prisma.cartItem.delete({
            where: {
                userId_productId: {
                    userId,
                    productId
                }
            }
        });
        res.json({
            success: true,
            message: 'Item removed from cart'
        });
    }
    catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});
// Clear entire cart
router.delete('/clear', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        await prisma.cartItem.deleteMany({
            where: { userId }
        });
        res.json({
            success: true,
            message: 'Cart cleared'
        });
    }
    catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});
exports.default = router;
//# sourceMappingURL=cart.js.map