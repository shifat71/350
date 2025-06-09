import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility function to update category product counts
export const updateCategoryProductCount = async (categoryId: string): Promise<void> => {
  const productCount = await prisma.product.count({
    where: { categoryId },
  });

  await prisma.category.update({
    where: { id: categoryId },
    data: { productCount },
  });
};

// Utility function to validate product data
export const validateProductData = (productData: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

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

// Utility function to validate category data
export const validateCategoryData = (categoryData: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

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

// Utility function to check if category can be deleted
export const canDeleteCategory = async (categoryId: string): Promise<{ canDelete: boolean; reason?: string }> => {
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

// Utility function to get product statistics
export const getProductStatistics = async (categoryId?: string) => {
  const where = categoryId ? { categoryId } : {};

  const [
    totalProducts,
    inStockProducts,
    outOfStockProducts,
    averagePrice,
    averageRating,
    totalValue,
  ] = await Promise.all([
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

// Utility function to sanitize product data for database
export const sanitizeProductData = (productData: any) => {
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

// Utility function to get category hierarchy with product counts
export const getCategoryHierarchy = async () => {
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

// Utility function for search and filtering
export const buildProductSearchQuery = (params: {
  search?: string;
  category?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}) => {
  const where: any = {};

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

export default {
  updateCategoryProductCount,
  validateProductData,
  validateCategoryData,
  canDeleteCategory,
  getProductStatistics,
  sanitizeProductData,
  getCategoryHierarchy,
  buildProductSearchQuery,
};
