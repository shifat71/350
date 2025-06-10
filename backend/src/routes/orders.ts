import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from './customer-auth';

const router = Router();
const prisma = new PrismaClient();

// Get user's order history
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
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

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get order history' });
  }
});

// Get specific order details
router.get('/:orderId', authenticateUser, async (req: Request, res: Response) => {
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

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

// Create order from cart
router.post('/create', authenticateUser, async (req: Request, res: Response) => {
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
    const subtotal = cartItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
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
      const orderItems = await Promise.all(
        cartItems.map(item =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price // Store price at time of order
            }
          })
        )
      );

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

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Create order with checkout information
router.post('/create-checkout', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { customerInfo, shippingAddress } = req.body;

    if (!customerInfo || !shippingAddress) {
      return res.status(400).json({ error: 'Customer information and shipping address are required' });
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

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    const shipping = subtotal >= 50 ? 0 : 5.99; // Free shipping over $50
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + shipping + tax;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create or find address
      let address = await tx.address.findFirst({
        where: {
          userId,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          zipCode: shippingAddress.zipCode,
          country: shippingAddress.country
        }
      });

      if (!address) {
        address = await tx.address.create({
          data: {
            userId,
            type: 'SHIPPING',
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            zipCode: shippingAddress.zipCode,
            country: shippingAddress.country,
            isDefault: false
          }
        });
      }

      // Create the order with PENDING status (waiting for admin approval)
      const newOrder = await tx.order.create({
        data: {
          userId,
          addressId: address.id,
          subtotal,
          tax,
          shipping,
          total,
          status: 'PENDING', // Will need admin approval
          customerInfo: customerInfo // Store customer info as JSON
        }
      });

      // Create order items
      await Promise.all(
        cartItems.map(item =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price // Store price at time of order
            }
          })
        )
      );

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

    res.status(201).json({
      success: true,
      message: 'Order created successfully and sent for admin approval',
      order: completeOrder
    });

  } catch (error) {
    console.error('Create checkout order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

export default router;
