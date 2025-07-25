"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/products - Get all products with optional filtering
router.get('/', async (req, res) => {
    try {
        const { category, featured, limit, page = 1 } = req.query;
        const where = {};
        if (category) {
            where.category = {
                name: { equals: category, mode: 'insensitive' }
            };
        }
        const take = limit ? parseInt(limit) : undefined;
        const skip = limit ? (parseInt(page) - 1) * parseInt(limit) : undefined;
        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take,
            skip,
        });
        // If featured is requested, filter to highly rated products
        let filteredProducts = products;
        if (featured === 'true') {
            filteredProducts = products.filter(product => product.rating >= 4.5);
        }
        const total = await prisma.product.count({ where });
        res.json({
            products: filteredProducts,
            pagination: {
                page: parseInt(page),
                limit: take,
                total,
                pages: take ? Math.ceil(total / take) : 1,
            },
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// GET /api/products/:id - Get single product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: {
                category: true,
            },
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// POST /api/products - Create new product (admin only)
router.post('/', async (req, res) => {
    try {
        const productData = req.body;
        const product = await prisma.product.create({
            data: productData,
            include: {
                category: true,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// PUT /api/products/:id - Update product (admin only)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                category: true,
            },
        });
        res.json(product);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({
            where: { id: parseInt(id) },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map