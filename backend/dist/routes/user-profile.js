"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const customer_auth_1 = require("./customer-auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get user profile
router.get('/', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                userType: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
                addresses: {
                    orderBy: { isDefault: 'desc' }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            user
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});
// Update user profile
router.put('/', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { firstName, lastName, avatar } = req.body;
        const updateData = {};
        if (firstName)
            updateData.firstName = firstName;
        if (lastName)
            updateData.lastName = lastName;
        if (avatar)
            updateData.avatar = avatar;
        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                userType: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Change password
router.put('/password', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required'
            });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'New password must be at least 6 characters long'
            });
        }
        // Get current user with password
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });
        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// Add address
router.post('/addresses', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { type, firstName, lastName, street, city, state, zipCode, country, isDefault = false } = req.body;
        // Validation
        if (!type || !firstName || !lastName || !street || !city || !state || !zipCode || !country) {
            return res.status(400).json({
                error: 'All address fields are required'
            });
        }
        // If this is set as default, unset other default addresses
        if (isDefault) {
            await prisma.address.updateMany({
                where: {
                    userId,
                    type
                },
                data: { isDefault: false }
            });
        }
        const address = await prisma.address.create({
            data: {
                userId,
                type,
                firstName,
                lastName,
                street,
                city,
                state,
                zipCode,
                country,
                isDefault
            }
        });
        res.status(201).json({
            success: true,
            message: 'Address added successfully',
            address
        });
    }
    catch (error) {
        console.error('Add address error:', error);
        res.status(500).json({ error: 'Failed to add address' });
    }
});
// Update address
router.put('/addresses/:addressId', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const addressId = req.params.addressId;
        const { type, firstName, lastName, street, city, state, zipCode, country, isDefault } = req.body;
        // Check if address belongs to user
        const existingAddress = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId
            }
        });
        if (!existingAddress) {
            return res.status(404).json({ error: 'Address not found' });
        }
        const updateData = {};
        if (type)
            updateData.type = type;
        if (firstName)
            updateData.firstName = firstName;
        if (lastName)
            updateData.lastName = lastName;
        if (street)
            updateData.street = street;
        if (city)
            updateData.city = city;
        if (state)
            updateData.state = state;
        if (zipCode)
            updateData.zipCode = zipCode;
        if (country)
            updateData.country = country;
        if (isDefault !== undefined) {
            updateData.isDefault = isDefault;
            // If setting as default, unset other default addresses of same type
            if (isDefault) {
                await prisma.address.updateMany({
                    where: {
                        userId,
                        type: type || existingAddress.type,
                        id: { not: addressId }
                    },
                    data: { isDefault: false }
                });
            }
        }
        const address = await prisma.address.update({
            where: { id: addressId },
            data: updateData
        });
        res.json({
            success: true,
            message: 'Address updated successfully',
            address
        });
    }
    catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});
// Delete address
router.delete('/addresses/:addressId', customer_auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user?.id;
        const addressId = req.params.addressId;
        // Check if address belongs to user
        const existingAddress = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId
            }
        });
        if (!existingAddress) {
            return res.status(404).json({ error: 'Address not found' });
        }
        await prisma.address.delete({
            where: { id: addressId }
        });
        res.json({
            success: true,
            message: 'Address deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
});
exports.default = router;
//# sourceMappingURL=user-profile.js.map