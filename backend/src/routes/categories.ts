import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/categories - Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const { featured } = req.query;
    
    const where: any = {};
    
    if (featured === 'true') {
      where.featured = true;
    }
    
    const categories = await prisma.category.findMany({
      where,
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

    // Update productCount with actual count
    const categoriesWithCount = categories.map(category => ({
      ...category,
      productCount: category._count.products,
    }));
    
    res.json(categoriesWithCount);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id - Get single category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const categoryWithCount = {
      ...category,
      productCount: category._count.products,
    };
    
    res.json(categoryWithCount);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST /api/categories - Create new category (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const categoryData = req.body;
    
    const category = await prisma.category.create({
      data: categoryData,
    });
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update category (admin only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });
    
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.category.delete({
      where: { id },
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
