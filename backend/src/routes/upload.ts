import { Router, Request, Response } from 'express';
import { upload, deleteImage, extractPublicId } from '../config/cloudinary';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

// Upload single image
router.post('/image', authenticateAdmin, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = (req.file as any).path;
    const publicId = (req.file as any).filename;

    res.json({
      success: true,
      imageUrl,
      publicId,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/images', authenticateAdmin, upload.array('images', 5), async (req: Request, res: Response) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedImages = files.map((file: any) => ({
      imageUrl: file.path,
      publicId: file.filename,
    }));

    res.json({
      success: true,
      images: uploadedImages,
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Delete image
router.delete('/image/:publicId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    
    // Decode the public ID if it's URL encoded
    const decodedPublicId = decodeURIComponent(publicId);
    
    await deleteImage(decodedPublicId);
    
    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
