'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { fileToBase64, isValidImageFile, compressImage } from '@/lib/imageUtils';

interface SearchInputProps {
  onSearch?: (query: string, imageFile?: File, imageBase64?: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ 
  onSearch, 
  placeholder = "Search for products...", 
  className = "" 
}: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() && !imageFile) return;

    setIsLoading(true);
    
    try {
      if (onSearch) {
        if (imageFile) {
          // Compress image if needed, then convert to base64
          const compressedFile = await compressImage(imageFile);
          const base64Data = await fileToBase64(compressedFile);
          onSearch(query, compressedFile, base64Data);
        } else {
          onSearch(query, undefined, undefined);
        }
      } else {
        // Navigate to search page with parameters
        const searchParams = new URLSearchParams();
        if (query.trim()) {
          searchParams.set('q', query.trim());
        }
        if (imageFile) {
          // Compress and convert image to base64 for session storage
          const compressedFile = await compressImage(imageFile);
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            sessionStorage.setItem('searchImage', base64);
            router.push(`/search?${searchParams.toString()}&type=image`);
          };
          reader.readAsDataURL(compressedFile);
          return;
        }
        router.push(`/search?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidImageFile(file)) {
      // Show loading state while processing image
      setIsLoading(true);
      try {
        // Compress the image if it's too large
        const compressedFile = await compressImage(file);
        setImageFile(compressedFile);
      } catch (error) {
        console.error('Error processing image:', error);
        // Fall back to original file if compression fails
        setImageFile(file);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Image Preview */}
        {imageFile && (
          <div className="mb-4 relative inline-block">
            <img
              src={URL.createObjectURL(imageFile)}
              alt="Upload preview"
              className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-24 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          
          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-12 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Upload image"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading || (!query.trim() && !imageFile)}
            className="absolute right-2 p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Search"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <MagnifyingGlassIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </form>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Searching...</span>
          </div>
        </div>
      )}
    </div>
  );
}
