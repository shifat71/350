import React, { useState, useRef } from 'react';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAdmin } from '@/contexts/AdminContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface MultipleImageUploadProps {
  onImagesUploaded: (imageUrls: string[]) => void;
  currentImages?: string[];
  onImageRemoved?: (index: number) => void;
  accept?: string;
  maxSize?: number; // in MB
  maxImages?: number;
  label?: string;
}

export default function MultipleImageUpload({
  onImagesUploaded,
  currentImages = [],
  onImageRemoved,
  accept = 'image/*',
  maxSize = 5,
  maxImages = 5,
  label = 'Upload Images'
}: MultipleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAdmin();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed the max limit
    if (currentImages.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    
    const validFiles: File[] = [];
    
    // Validate each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${maxSize}MB`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length === 0) return;
    
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      setUploading(true);
      const result = await api.upload.images(token, validFiles);
      const newImageUrls = result.images.map((img: { imageUrl: string }) => img.imageUrl);
      onImagesUploaded([...currentImages, ...newImageUrls]);
      toast.success(`${validFiles.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleRemove = (index: number) => {
    if (onImageRemoved) {
      onImageRemoved(index);
    }
  };

  const canAddMore = currentImages.length < maxImages;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        {label} ({currentImages.length}/{maxImages})
      </label>
      
      {/* Display current images */}
      {currentImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentImages.map((image, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={image}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload area */}
      {canAddMore && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <div className="text-center">
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin mx-auto h-8 w-8 border-b-2 border-blue-500 rounded-full"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <PlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <button
                    type="button"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Add more images
                  </button>
                  <span> or drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to {maxSize}MB each
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading || !canAddMore}
      />
    </div>
  );
}
