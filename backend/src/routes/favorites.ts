import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from './customer-auth';

const router = Router();
const prisma = new PrismaClient();

// Get user's favorites
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      favorites: favorites.map(fav => ({
        id: fav.id,
        product: fav.product,
        createdAt: fav.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add product to favorites
router.post('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if already in favorites
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: parseInt(productId)
        }
      }
    });

    if (existingFavorite) {
      return res.status(400).json({ error: 'Product already in favorites' });
    }

    // Add to favorites
    const favorite = await prisma.favorite.create({
      data: {
        userId,
        productId: parseInt(productId)
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product added to favorites',
      favorite: {
        id: favorite.id,
        product: favorite.product,
        createdAt: favorite.createdAt
      }
    });

  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Remove product from favorites
router.delete('/:productId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if favorite exists
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: parseInt(productId)
        }
      }
    });

    if (!existingFavorite) {
      return res.status(404).json({ error: 'Product not in favorites' });
    }

    // Remove from favorites
    await prisma.favorite.delete({
      where: {
        userId_productId: {
          userId,
          productId: parseInt(productId)
        }
      }
    });

    res.json({
      success: true,
      message: 'Product removed from favorites'
    });

  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Check if product is in favorites
router.get('/check/:productId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: parseInt(productId)
        }
      }
    });

    res.json({
      success: true,
      isFavorite: !!favorite
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

// Get favorites count for user
router.get('/count', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const count = await prisma.favorite.count({
      where: { userId }
    });

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Error getting favorites count:', error);
    res.status(500).json({ error: 'Failed to get favorites count' });
  }
});

export default router;
