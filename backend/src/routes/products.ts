import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/products - Get all products with optional filtering and sorting
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      featured, 
      inStock, 
      minPrice, 
      maxPrice, 
      sortBy = 'createdAt', 
      sortOrder = 'desc', 
      limit, 
      page = 1,
      search 
    } = req.query;
    
    const where: any = {};
    
    // Category filtering - support both category ID and name
    if (category) {
      // Check if it's a category ID (number) or name (string)
      const categoryValue = category as string;
      if (/^\d+$/.test(categoryValue)) {
        // It's an ID
        where.categoryId = categoryValue;
      } else {
        // It's a name
        where.category = {
          name: { equals: categoryValue, mode: 'insensitive' }
        };
      }
    }
    
    // Stock filtering
    if (inStock !== undefined) {
      where.inStock = inStock === 'true';
    }
    
    // Price range filtering
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }
    
    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const take = limit ? parseInt(limit as string) : undefined;
    const skip = limit ? (parseInt(page as string) - 1) * parseInt(limit as string) : undefined;
    
    // Set up ordering
    const orderBy: any = {};
    const validSortFields = ['name', 'price', 'rating', 'createdAt', 'stock'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    orderBy[sortField] = sortOrder === 'desc' ? 'desc' : 'asc';
    
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
      filteredProducts = products.filter(product => product.rating >= 4.5);
    }

    const total = await prisma.product.count({ where });
    const totalPages = take ? Math.ceil(total / take) : 1;
    
    res.json({
      products: filteredProducts,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: totalPages,
      },
      totalPages, // Add this for compatibility with frontend
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id - Get single product by ID
router.get('/:id', async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products - Create new product (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const productData = req.body;
    
    const product = await prisma.product.create({
      data: productData,
      include: {
        category: true,
      },
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
