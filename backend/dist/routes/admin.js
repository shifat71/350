"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ========================= CATEGORIES ADMIN ROUTES =========================
// GET /api/admin/categories - Get all categories with detailed stats
router.get('/categories', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            include: {
                _count: {
                    select: { products: true },
                },
                products: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        inStock: true,
                        stock: true,
                    },
                },
            },
            orderBy: [
                { featured: 'desc' },
                { createdAt: 'desc' },
            ],
        });
        const categoriesWithStats = categories.map((category) => ({
            ...category,
            productCount: category._count.products,
            totalValue: category.products.reduce((sum, product) => sum + product.price, 0),
            inStockProducts: category.products.filter((product) => product.inStock).length,
            outOfStockProducts: category.products.filter((product) => !product.inStock).length,
        }));
        res.json(categoriesWithStats);
    }
    catch (error) {
        console.error('Error fetching categories for admin:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// POST /api/admin/categories - Create new category
router.post('/categories', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { name, description, image, featured = false } = req.body;
        // Validation
        if (!name || !image) {
            return res.status(400).json({
                error: 'Name and image are required fields'
            });
        }
        // Check if category name already exists
        const existingCategory = await prisma.category.findUnique({
            where: { name },
        });
        if (existingCategory) {
            return res.status(409).json({
                error: 'Category with this name already exists'
            });
        }
        const category = await prisma.category.create({
            data: {
                name,
                description,
                image,
                featured,
                productCount: 0,
            },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
        res.status(201).json({
            ...category,
            productCount: category._count.products,
        });
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});
// PUT /api/admin/categories/:id - Update category
router.put('/categories/:id', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image, featured } = req.body;
        // Check if category exists
        const existingCategory = await prisma.category.findUnique({
            where: { id },
        });
        if (!existingCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }
        // If name is being changed, check for conflicts
        if (name && name !== existingCategory.name) {
            const nameConflict = await prisma.category.findUnique({
                where: { name },
            });
            if (nameConflict) {
                return res.status(409).json({
                    error: 'Category with this name already exists'
                });
            }
        }
        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(image && { image }),
                ...(featured !== undefined && { featured }),
            },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
        res.json({
            ...category,
            productCount: category._count.products,
        });
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});
// DELETE /api/admin/categories/:id - Delete category
router.delete('/categories/:id', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if category exists
        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        // Check if category has products
        if (category._count.products > 0) {
            return res.status(400).json({
                error: `Cannot delete category. It contains ${category._count.products} products. Please move or delete the products first.`
            });
        }
        await prisma.category.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});
// ========================= PRODUCTS ADMIN ROUTES =========================
// GET /api/admin/products - Get all products with advanced filtering
router.get('/products', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { category, inStock, featured, limit, page = 1, sortBy = 'createdAt', sortOrder = 'desc', search } = req.query;
        const where = {};
        if (category) {
            where.categoryId = category;
        }
        if (inStock !== undefined) {
            where.inStock = inStock === 'true';
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const take = limit ? parseInt(limit) : undefined;
        const skip = limit ? (parseInt(page) - 1) * parseInt(limit) : undefined;
        const orderBy = {};
        orderBy[sortBy] = sortOrder;
        const products = await prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy,
            take,
            skip,
        });
        // If featured is requested, filter to highly rated products
        let filteredProducts = products;
        if (featured === 'true') {
            filteredProducts = products.filter((product) => product.rating >= 4.5);
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
            summary: {
                totalProducts: total,
                inStockProducts: await prisma.product.count({ where: { ...where, inStock: true } }),
                outOfStockProducts: await prisma.product.count({ where: { ...where, inStock: false } }),
            },
        });
    }
    catch (error) {
        console.error('Error fetching products for admin:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// POST /api/admin/products - Create new product
router.post('/products', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { name, price, originalPrice, image, images = [], rating = 0, reviews = 0, inStock = true, stock = 0, description, features = [], specifications = {}, categoryId, } = req.body;
        // Validation
        if (!name || !price || !image || !categoryId) {
            return res.status(400).json({
                error: 'Name, price, image, and categoryId are required fields',
            });
        }
        // Validate category exists
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return res.status(400).json({ error: 'Invalid categoryId' });
        }
        // Validate price
        if (price <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0' });
        }
        if (originalPrice && originalPrice <= price) {
            return res.status(400).json({
                error: 'Original price must be greater than current price'
            });
        }
        const product = await prisma.product.create({
            data: {
                name,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                image,
                images,
                rating: parseFloat(rating),
                reviews: parseInt(reviews),
                inStock,
                stock: parseInt(stock),
                description,
                features,
                specifications,
                categoryId,
            },
            include: {
                category: true,
            },
        });
        // Update category product count
        await prisma.category.update({
            where: { id: categoryId },
            data: {
                productCount: {
                    increment: 1,
                },
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// PUT /api/admin/products/:id - Update product
router.put('/products/:id', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        // Check if product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: parseInt(id) },
        });
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Validate category if being updated
        if (updateData.categoryId && updateData.categoryId !== existingProduct.categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: updateData.categoryId },
            });
            if (!category) {
                return res.status(400).json({ error: 'Invalid categoryId' });
            }
        }
        // Validate price if being updated
        if (updateData.price && updateData.price <= 0) {
            return res.status(400).json({ error: 'Price must be greater than 0' });
        }
        if (updateData.originalPrice && updateData.price && updateData.originalPrice <= updateData.price) {
            return res.status(400).json({
                error: 'Original price must be greater than current price'
            });
        }
        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                ...updateData,
                ...(updateData.price && { price: parseFloat(updateData.price) }),
                ...(updateData.originalPrice && { originalPrice: parseFloat(updateData.originalPrice) }),
                ...(updateData.rating && { rating: parseFloat(updateData.rating) }),
                ...(updateData.reviews && { reviews: parseInt(updateData.reviews) }),
                ...(updateData.stock && { stock: parseInt(updateData.stock) }),
            },
            include: {
                category: true,
            },
        });
        // Update category product counts if category changed
        if (updateData.categoryId && updateData.categoryId !== existingProduct.categoryId) {
            // Decrease count from old category
            await prisma.category.update({
                where: { id: existingProduct.categoryId },
                data: {
                    productCount: {
                        decrement: 1,
                    },
                },
            });
            // Increase count in new category
            await prisma.category.update({
                where: { id: updateData.categoryId },
                data: {
                    productCount: {
                        increment: 1,
                    },
                },
            });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /api/admin/products/:id - Delete product
router.delete('/products/:id', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        await prisma.product.delete({
            where: { id: parseInt(id) },
        });
        // Update category product count
        await prisma.category.update({
            where: { id: product.categoryId },
            data: {
                productCount: {
                    decrement: 1,
                },
            },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
// ========================= BULK OPERATIONS =========================
// POST /api/admin/products/bulk-update - Bulk update products
router.post('/products/bulk-update', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { productIds, updateData } = req.body;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'productIds array is required' });
        }
        const updatedProducts = await prisma.product.updateMany({
            where: {
                id: {
                    in: productIds.map((id) => parseInt(id)),
                },
            },
            data: updateData,
        });
        res.json({
            message: `Updated ${updatedProducts.count} products`,
            updatedCount: updatedProducts.count,
        });
    }
    catch (error) {
        console.error('Error bulk updating products:', error);
        res.status(500).json({ error: 'Failed to bulk update products' });
    }
});
// DELETE /api/admin/products/bulk-delete - Bulk delete products
router.delete('/products/bulk-delete', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { productIds } = req.body;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'productIds array is required' });
        }
        // Get products to be deleted to update category counts
        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: productIds.map((id) => parseInt(id)),
                },
            },
            select: {
                categoryId: true,
            },
        });
        // Delete products
        const deletedProducts = await prisma.product.deleteMany({
            where: {
                id: {
                    in: productIds.map((id) => parseInt(id)),
                },
            },
        });
        // Update category product counts
        const categoryUpdates = products.reduce((acc, product) => {
            acc[product.categoryId] = (acc[product.categoryId] || 0) + 1;
            return acc;
        }, {});
        for (const [categoryId, count] of Object.entries(categoryUpdates)) {
            await prisma.category.update({
                where: { id: categoryId },
                data: {
                    productCount: {
                        decrement: count,
                    },
                },
            });
        }
        res.json({
            message: `Deleted ${deletedProducts.count} products`,
            deletedCount: deletedProducts.count,
        });
    }
    catch (error) {
        console.error('Error bulk deleting products:', error);
        res.status(500).json({ error: 'Failed to bulk delete products' });
    }
});
// ========================= ANALYTICS =========================
// GET /api/admin/analytics - Get admin analytics
router.get('/analytics', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const [totalProducts, totalCategories, inStockProducts, outOfStockProducts, featuredCategories, averageProductPrice, categoryStats,] = await Promise.all([
            prisma.product.count(),
            prisma.category.count(),
            prisma.product.count({ where: { inStock: true } }),
            prisma.product.count({ where: { inStock: false } }),
            prisma.category.count({ where: { featured: true } }),
            prisma.product.aggregate({
                _avg: { price: true },
            }),
            prisma.category.findMany({
                include: {
                    _count: {
                        select: { products: true },
                    },
                },
            }),
        ]);
        const analytics = {
            overview: {
                totalProducts,
                totalCategories,
                inStockProducts,
                outOfStockProducts,
                featuredCategories,
                averageProductPrice: averageProductPrice._avg.price || 0,
            },
            categories: categoryStats.map((category) => ({
                id: category.id,
                name: category.name,
                productCount: category._count.products,
                featured: category.featured,
            })),
            stockStatus: {
                inStock: inStockProducts,
                outOfStock: outOfStockProducts,
                stockPercentage: totalProducts > 0 ? (inStockProducts / totalProducts) * 100 : 0,
            },
        };
        res.json(analytics);
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map