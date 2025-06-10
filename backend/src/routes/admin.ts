import { Router, Request, Response } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// ========================= CATEGORIES ADMIN ROUTES =========================

// GET /api/admin/categories - Get all categories with detailed stats
router.get('/categories', authenticateAdmin, async (req: Request, res: Response) => {
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

    const categoriesWithStats = categories.map((category: any) => ({
      ...category,
      productCount: category._count.products,
      totalValue: category.products.reduce((sum: number, product: any) => sum + product.price, 0),
      inStockProducts: category.products.filter((product: any) => product.inStock).length,
      outOfStockProducts: category.products.filter((product: any) => !product.inStock).length,
    }));

    res.json(categoriesWithStats);
  } catch (error) {
    console.error('Error fetching categories for admin:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/admin/categories - Create new category
router.post('/categories', authenticateAdmin, async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/admin/categories/:id - Update category
router.put('/categories/:id', authenticateAdmin, async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete('/categories/:id', authenticateAdmin, async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ========================= PRODUCTS ADMIN ROUTES =========================

// GET /api/admin/products - Get all products with advanced filtering
router.get('/products', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      inStock, 
      featured, 
      limit, 
      page = 1, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;

    const where: any = {};

    if (category) {
      where.categoryId = category as string;
    }

    if (inStock !== undefined) {
      where.inStock = inStock === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = limit ? (parseInt(page as string) - 1) * parseInt(limit as string) : undefined;

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

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
      filteredProducts = products.filter((product: any) => product.rating >= 4.5);
    }

    const total = await prisma.product.count({ where });

    res.json({
      products: filteredProducts,
      pagination: {
        page: parseInt(page as string),
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
  } catch (error) {
    console.error('Error fetching products for admin:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/admin/products - Create new product
router.post('/products', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const {
      name,
      price,
      originalPrice,
      image,
      images = [],
      rating = 0,
      reviews = 0,
      inStock = true,
      stock = 0,
      description,
      features = [],
      specifications = {},
      categoryId,
    } = req.body;

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
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/admin/products/:id - Update product
router.put('/products/:id', authenticateAdmin, async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete('/products/:id', authenticateAdmin, async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ========================= BULK OPERATIONS =========================

// POST /api/admin/products/bulk-update - Bulk update products
router.post('/products/bulk-update', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { productIds, updateData } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    const updatedProducts = await prisma.product.updateMany({
      where: {
        id: {
          in: productIds.map((id: string) => parseInt(id)),
        },
      },
      data: updateData,
    });

    res.json({ 
      message: `Updated ${updatedProducts.count} products`,
      updatedCount: updatedProducts.count,
    });
  } catch (error) {
    console.error('Error bulk updating products:', error);
    res.status(500).json({ error: 'Failed to bulk update products' });
  }
});

// DELETE /api/admin/products/bulk-delete - Bulk delete products
router.delete('/products/bulk-delete', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // Get products to be deleted to update category counts
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds.map((id: string) => parseInt(id)),
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
          in: productIds.map((id: string) => parseInt(id)),
        },
      },
    });

    // Update category product counts
    const categoryUpdates = products.reduce((acc: any, product: any) => {
      acc[product.categoryId] = (acc[product.categoryId] || 0) + 1;
      return acc;
    }, {});

    for (const [categoryId, count] of Object.entries(categoryUpdates)) {
      await prisma.category.update({
        where: { id: categoryId },
        data: {
          productCount: {
            decrement: count as number,
          },
        },
      });
    }

    res.json({ 
      message: `Deleted ${deletedProducts.count} products`,
      deletedCount: deletedProducts.count,
    });
  } catch (error) {
    console.error('Error bulk deleting products:', error);
    res.status(500).json({ error: 'Failed to bulk delete products' });
  }
});

// ========================= ANALYTICS =========================

// GET /api/admin/analytics - Get admin analytics
router.get('/analytics', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const [
      totalProducts,
      totalCategories,
      inStockProducts,
      outOfStockProducts,
      featuredCategories,
      averageProductPrice,
      categoryStats,
    ] = await Promise.all([
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
      categories: categoryStats.map((category: any) => ({
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
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ========================= ORDER MANAGEMENT =========================

// GET /api/admin/orders - Get all orders with filtering
router.get('/orders', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};
    if (status) {
      where.status = status as string;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          address: true,
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
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total: totalOrders,
        pages: Math.ceil(totalOrders / take)
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST /api/admin/orders/:id/approve - Approve an order
router.post('/orders/:id/approve', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if order exists and is pending
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is not pending approval' });
    }

    // Check stock availability before approving
    for (const item of order.items) {
      if (!item.product.inStock) {
        return res.status(400).json({ 
          error: `${item.product.name} is no longer in stock` 
        });
      }
      if (item.quantity > item.product.stock) {
        return res.status(400).json({ 
          error: `Only ${item.product.stock} units of ${item.product.name} available` 
        });
      }
    }

    // Update order status and reduce stock
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'APPROVED' as any },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          address: true,
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
          }
        }
      });

      // Reduce product stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }

      return updated;
    });

    res.json({
      success: true,
      message: 'Order approved successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({ error: 'Failed to approve order' });
  }
});

// POST /api/admin/orders/:id/reject - Reject an order
router.post('/orders/:id/reject', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check if order exists and is pending
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Order is not pending approval' });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: 'REJECTED' as any,
        // You could add a rejectionReason field to store the reason
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        address: true,
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
        }
      }
    });

    res.json({
      success: true,
      message: 'Order rejected successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Failed to reject order' });
  }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        address: true,
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
        }
      }
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/admin/analytics/sales - Get sales statistics
router.get('/analytics/sales', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      rejectedOrders,
      totalRevenue,
      recentOrders,
      topProducts
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: { in: ['APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as any[] } } }),
      prisma.order.count({ where: { status: 'REJECTED' as any } }),
      prisma.order.aggregate({
        where: { status: { in: ['APPROVED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as any[] } },
        _sum: { total: true }
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        _count: { productId: true },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      })
    ]);

    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, image: true, price: true }
        });
        return {
          product,
          totalSold: item._sum.quantity || 0,
          orderCount: item._count.productId
        };
      })
    );

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        approvedOrders,
        rejectedOrders,
        totalRevenue: totalRevenue._sum?.total || 0,
        recentOrders,
        topProducts: topProductsWithDetails
      }
    });

  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ error: 'Failed to fetch sales statistics' });
  }
});

export default router;
