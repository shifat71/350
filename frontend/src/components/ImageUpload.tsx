import React, { useState, useRef } from 'react';
import { TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { useAdmin } from '@/contexts/AdminContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string, publicId?: string) => void;
  currentImage?: string;
  onImageRemoved?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  required?: boolean;
}

export default function ImageUpload({
  onImageUploaded,
  currentImage,
  onImageRemoved,
  accept = 'image/*',
  maxSize = 5,
  label = 'Upload Image',
  required = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAdmin();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }
    
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      setUploading(true);
      const result = await api.upload.image(token, file);
      onImageUploaded(result.imageUrl, result.publicId);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
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

  const handleRemove = () => {
    if (onImageRemoved) {
      onImageRemoved();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {currentImage ? (
        <div className="relative">
          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={currentImage}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            {!uploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleClick}
            disabled={uploading}
            className="mt-2 w-full py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Change Image'}
          </button>
        </div>
      ) : (
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
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <button
                    type="button"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Click to upload
                  </button>
                  <span> or drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to {maxSize}MB
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
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
}
