"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cloudinary_1 = require("../config/cloudinary");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Upload single image
router.post('/image', auth_1.authenticateAdmin, cloudinary_1.upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        const imageUrl = req.file.path;
        const publicId = req.file.filename;
        res.json({
            success: true,
            imageUrl,
            publicId,
        });
    }
    catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});
// Upload multiple images
router.post('/images', auth_1.authenticateAdmin, cloudinary_1.upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No image files provided' });
        }
        const files = req.files;
        const uploadedImages = files.map((file) => ({
            imageUrl: file.path,
            publicId: file.filename,
        }));
        res.json({
            success: true,
            images: uploadedImages,
        });
    }
    catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});
// Delete image
router.delete('/image/:publicId', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { publicId } = req.params;
        // Decode the public ID if it's URL encoded
        const decodedPublicId = decodeURIComponent(publicId);
        await (0, cloudinary_1.deleteImage)(decodedPublicId);
        res.json({
            success: true,
            message: 'Image deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map