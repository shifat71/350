import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create storage configuration for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req: any, file: any) => ({
    folder: 'ecommerce',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto' },
    ],
  }),
});

// Create multer upload middleware
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Helper function to delete image from Cloudinary
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
export const extractPublicId = (url: string): string | null => {
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
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

export { cloudinary };
export default cloudinary;
