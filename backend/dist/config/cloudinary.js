"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinary = exports.extractPublicId = exports.deleteImage = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
Object.defineProperty(exports, "cloudinary", { enumerable: true, get: function () { return cloudinary_1.v2; } });
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Create storage configuration for multer
const storage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: (req, file) => ({
        folder: 'ecommerce',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' },
        ],
    }),
});
// Create multer upload middleware
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};
exports.deleteImage = deleteImage;
// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (url) => {
    try {
        // Cloudinary URLs typically have format: https://res.cloudinary.com/[cloud]/image/upload/[version]/[public_id].[format]
        const urlParts = url.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex === -1 || uploadIndex + 2 >= urlParts.length) {
            return null;
        }
        // Get the part after 'upload' and version (if exists)
        let publicIdWithExtension = urlParts[uploadIndex + 2];
        // If there's a version (starts with 'v'), get the next part
        if (publicIdWithExtension.startsWith('v') && urlParts[uploadIndex + 3]) {
            publicIdWithExtension = urlParts[uploadIndex + 3];
        }
        // Remove file extension
        const publicId = publicIdWithExtension.split('.')[0];
        return `ecommerce/${publicId}`; // Include folder name
    }
    catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};
exports.extractPublicId = extractPublicId;
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.js.map