"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const customer_auth_1 = require("./customer-auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /api/reviews/:productId - Get all reviews for a product
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sortBy = 'newest' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        // Define sorting options
        let orderBy = { createdAt: 'desc' }; // Default: newest first
        switch (sortBy) {
            case 'oldest':
                orderBy = { createdAt: 'asc' };
                break;
            case 'highest':
                orderBy = { rating: 'desc' };
                break;
            case 'lowest':
                orderBy = { rating: 'asc' };
                break;
            case 'helpful':
                orderBy = { helpful: 'desc' };
                break;
        }
        const reviews = await prisma.review.findMany({
            where: {
                productId: parseInt(productId),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
            orderBy,
            skip,
            take,
        });
        const total = await prisma.review.count({
            where: {
                productId: parseInt(productId),
            },
        });
        // Calculate rating distribution
        const ratingDistribution = await prisma.review.groupBy({
            by: ['rating'],
            where: {
                productId: parseInt(productId),
            },
            _count: {
                rating: true,
            },
        });
        const ratingCounts = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
        };
        ratingDistribution.forEach((item) => {
            ratingCounts[item.rating] = item._count.rating;
        });
        // Calculate average rating
        const avgRating = await prisma.review.aggregate({
            where: {
                productId: parseInt(productId),
            },
            _avg: {
                rating: true,
            },
        });
        res.json({
            reviews: reviews.map(review => ({
                id: review.id,
                productId: review.productId,
                userId: review.userId,
                userName: `${review.user.firstName} ${review.user.lastName}`,
                userAvatar: review.user.avatar,
                rating: review.rating,
                title: review.title,
                comment: review.comment,
                helpful: review.helpful,
                verified: review.verified,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
            })),
            pagination: {
                page: parseInt(page),
                limit: take,
                total,
                pages: Math.ceil(total / take),
            },
            summary: {
                averageRating: avgRating._avg.rating || 0,
                totalReviews: total,
                ratingDistribution: ratingCounts,
            },
        });
    }
    catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});
// POST /api/reviews/:productId - Create a new review (authenticated users only)
router.post('/:productId', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const { productId } = req.params;
        const { rating, title, comment } = req.body;
        const userId = req.user.id;
        // Validate input
        if (!rating || !title || !comment) {
            return res.status(400).json({ error: 'Rating, title, and comment are required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        // Check if user has already reviewed this product
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId: {
                    userId,
                    productId: parseInt(productId),
                },
            },
        });
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }
        // Check if user has purchased this product
        const hasPurchased = await prisma.orderItem.findFirst({
            where: {
                productId: parseInt(productId),
                order: {
                    userId,
                    status: 'DELIVERED', // Only count delivered orders
                },
            },
        });
        // Create the review
        const review = await prisma.review.create({
            data: {
                productId: parseInt(productId),
                userId,
                rating: parseInt(rating),
                title,
                comment,
                verified: !!hasPurchased, // Mark as verified if user purchased
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                    },
                },
            },
        });
        // Update product rating and review count
        await updateProductRating(parseInt(productId));
        res.status(201).json({
            id: review.id,
            productId: review.productId,
            userId: review.userId,
            userName: `${review.user.firstName} ${review.user.lastName}`,
            userAvatar: review.user.avatar,
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            helpful: review.helpful,
            verified: review.verified,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        });
    }
    catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});
// PUT /api/reviews/:reviewId/helpful - Mark a review as helpful
router.put('/:reviewId/helpful', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await prisma.review.update({
            where: {
                id: reviewId,
            },
            data: {
                helpful: {
                    increment: 1,
                },
            },
        });
        res.json({ helpful: review.helpful });
    }
    catch (error) {
        console.error('Error updating helpful count:', error);
        res.status(500).json({ error: 'Failed to update helpful count' });
    }
});
// DELETE /api/reviews/:reviewId - Delete a review (only review author)
router.delete('/:reviewId', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;
        // Check if review exists and belongs to user
        const review = await prisma.review.findUnique({
            where: {
                id: reviewId,
            },
        });
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        if (review.userId !== userId) {
            return res.status(403).json({ error: 'You can only delete your own reviews' });
        }
        await prisma.review.delete({
            where: {
                id: reviewId,
            },
        });
        // Update product rating and review count
        await updateProductRating(review.productId);
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
});
// Helper function to update product rating and review count
async function updateProductRating(productId) {
    const stats = await prisma.review.aggregate({
        where: {
            productId,
        },
        _avg: {
            rating: true,
        },
        _count: {
            rating: true,
        },
    });
    await prisma.product.update({
        where: {
            id: productId,
        },
        data: {
            rating: stats._avg.rating || 0,
            reviews: stats._count.rating,
        },
    });
}
exports.default = router;
//# sourceMappingURL=reviews.js.map