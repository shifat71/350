"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProductSearchQuery = exports.getCategoryHierarchy = exports.sanitizeProductData = exports.getProductStatistics = exports.canDeleteCategory = exports.validateCategoryData = exports.validateProductData = exports.updateCategoryProductCount = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Utility function to update category product counts
const updateCategoryProductCount = async (categoryId) => {
    const productCount = await prisma.product.count({
        where: { categoryId },
    });
    await prisma.category.update({
        where: { id: categoryId },
        data: { productCount },
    });
};
exports.updateCategoryProductCount = updateCategoryProductCount;
// Utility function to validate product data
const validateProductData = (productData) => {
    const errors = [];
    if (!productData.name || productData.name.trim().length === 0) {
        errors.push('Product name is required');
    }
    if (!productData.price || productData.price <= 0) {
        errors.push('Product price must be greater than 0');
    }
    if (productData.originalPrice && productData.originalPrice <= productData.price) {
        errors.push('Original price must be greater than current price');
    }
    if (!productData.image || productData.image.trim().length === 0) {
        errors.push('Product image is required');
    }
    if (!productData.categoryId || productData.categoryId.trim().length === 0) {
        errors.push('Category ID is required');
    }
    if (productData.stock && productData.stock < 0) {
        errors.push('Stock cannot be negative');
    }
    if (productData.rating && (productData.rating < 0 || productData.rating > 5)) {
        errors.push('Rating must be between 0 and 5');
    }
    if (productData.reviews && productData.reviews < 0) {
        errors.push('Reviews count cannot be negative');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
exports.validateProductData = validateProductData;
// Utility function to validate category data
const validateCategoryData = (categoryData) => {
    const errors = [];
    if (!categoryData.name || categoryData.name.trim().length === 0) {
        errors.push('Category name is required');
    }
    if (!categoryData.image || categoryData.image.trim().length === 0) {
        errors.push('Category image is required');
    }
    if (categoryData.name && categoryData.name.length > 50) {
        errors.push('Category name must be less than 50 characters');
    }
    if (categoryData.description && categoryData.description.length > 500) {
        errors.push('Category description must be less than 500 characters');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
exports.validateCategoryData = validateCategoryData;
// Utility function to check if category can be deleted
const canDeleteCategory = async (categoryId) => {
    const productCount = await prisma.product.count({
        where: { categoryId },
    });
    if (productCount > 0) {
        return {
            canDelete: false,
            reason: `Cannot delete category. It contains ${productCount} products. Please move or delete the products first.`,
        };
    }
    return { canDelete: true };
};
exports.canDeleteCategory = canDeleteCategory;
// Utility function to get product statistics
const getProductStatistics = async (categoryId) => {
    const where = categoryId ? { categoryId } : {};
    const [totalProducts, inStockProducts, outOfStockProducts, averagePrice, averageRating, totalValue,] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.count({ where: { ...where, inStock: true } }),
        prisma.product.count({ where: { ...where, inStock: false } }),
        prisma.product.aggregate({
            where,
            _avg: { price: true },
        }),
        prisma.product.aggregate({
            where,
            _avg: { rating: true },
        }),
        prisma.product.aggregate({
            where,
            _sum: { price: true },
        }),
    ]);
    return {
        totalProducts,
        inStockProducts,
        outOfStockProducts,
        averagePrice: averagePrice._avg.price || 0,
        averageRating: averageRating._avg.rating || 0,
        totalValue: totalValue._sum.price || 0,
        stockPercentage: totalProducts > 0 ? (inStockProducts / totalProducts) * 100 : 0,
    };
};
exports.getProductStatistics = getProductStatistics;
// Utility function to sanitize product data for database
const sanitizeProductData = (productData) => {
    return {
        ...productData,
        price: productData.price ? parseFloat(productData.price) : undefined,
        originalPrice: productData.originalPrice ? parseFloat(productData.originalPrice) : undefined,
        rating: productData.rating ? parseFloat(productData.rating) : undefined,
        reviews: productData.reviews ? parseInt(productData.reviews) : undefined,
        stock: productData.stock ? parseInt(productData.stock) : undefined,
        features: Array.isArray(productData.features) ? productData.features : [],
        images: Array.isArray(productData.images) ? productData.images : [],
    };
};
exports.sanitizeProductData = sanitizeProductData;
// Utility function to get category hierarchy with product counts
const getCategoryHierarchy = async () => {
    const categories = await prisma.category.findMany({
        include: {
            _count: {
                select: { products: true },
            },
        },
        orderBy: [
            { featured: 'desc' },
            { name: 'asc' },
        ],
    });
    return categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        featured: category.featured,
        productCount: category._count.products,
        image: category.image,
    }));
};
exports.getCategoryHierarchy = getCategoryHierarchy;
// Utility function for search and filtering
const buildProductSearchQuery = (params) => {
    const where = {};
    if (params.search) {
        where.OR = [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
            { features: { hasSome: [params.search] } },
        ];
    }
    if (params.category) {
        where.categoryId = params.category;
    }
    if (params.inStock !== undefined) {
        where.inStock = params.inStock;
    }
    if (params.minPrice !== undefined) {
        where.price = { ...where.price, gte: params.minPrice };
    }
    if (params.maxPrice !== undefined) {
        where.price = { ...where.price, lte: params.maxPrice };
    }
    if (params.minRating !== undefined) {
        where.rating = { gte: params.minRating };
    }
    return where;
};
exports.buildProductSearchQuery = buildProductSearchQuery;
exports.default = {
    updateCategoryProductCount: exports.updateCategoryProductCount,
    validateProductData: exports.validateProductData,
    validateCategoryData: exports.validateCategoryData,
    canDeleteCategory: exports.canDeleteCategory,
    getProductStatistics: exports.getProductStatistics,
    sanitizeProductData: exports.sanitizeProductData,
    getCategoryHierarchy: exports.getCategoryHierarchy,
    buildProductSearchQuery: exports.buildProductSearchQuery,
};
//# sourceMappingURL=adminUtils.js.map