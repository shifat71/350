'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import SearchInput from '@/components/SearchInput';
import { api } from '@/lib/api';
import { fileToBase64, compressImage } from '@/lib/imageUtils';
import { SearchProduct, SearchResponse } from '@/types';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);
  
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const searchType = searchParams.get('type') || 'text';

  useEffect(() => {
    const performSearch = async () => {
      if (!query && searchType !== 'image') return;

      setIsLoading(true);
      setError(null);
      setSearchQuery(query);

      try {
        let response: SearchResponse;

        if (searchType === 'image') {
          const imageData = sessionStorage.getItem('searchImage');
          if (!imageData) {
            setError('No image data found');
            return;
          }
          
          // Ensure we have the full data URL format
          const fullDataUrl = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
          response = await api.search.imageSearch(fullDataUrl, query, 10);
          
          // Clear the session storage
          sessionStorage.removeItem('searchImage');
        } else {
          response = await api.search.textSearch(query, 10);
        }

        setSearchResults(response.products);
        setTotal(response.total);
      } catch (err: any) {
        console.error('Search failed:', err);
        let errorMessage = 'Search failed. Please try again.';
        
        // Handle specific error types
        if (err?.message?.includes('validation error') || err?.message?.includes('too_long')) {
          errorMessage = 'The search query is too complex. Please try with a simpler description.';
        } else if (err?.message?.includes('Invalid base64')) {
          errorMessage = 'There was an issue processing your image. Please try uploading a different image.';
        } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        setError(errorMessage);
        setSearchResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query, searchType]);

  const handleNewSearch = async (newQuery: string, imageFile?: File, imageBase64?: string) => {
    if (!newQuery.trim() && !imageFile) return;

    setIsLoading(true);
    setError(null);
    setSearchQuery(newQuery);

    try {
      let response: SearchResponse;

      if (imageFile && imageBase64) {
        // Use the pre-converted base64 data, ensure it has proper data URL format
        try {
          const fullDataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
          response = await api.search.imageSearch(fullDataUrl, newQuery, 10);
          setSearchResults(response.products);
          setTotal(response.total);
        } catch (err: any) {
          console.error('Image search failed:', err);
          let errorMessage = 'Image search failed. Please try again.';
          
          // Handle specific error types
          if (err?.message?.includes('validation error') || err?.message?.includes('too_long')) {
            errorMessage = 'The search query is too complex. Please try with a simpler description or just upload the image without additional text.';
          } else if (err?.message?.includes('Invalid base64')) {
            errorMessage = 'There was an issue processing your image. Please try uploading a different image.';
          } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
          
          setError(errorMessage);
          setSearchResults([]);
          setTotal(0);
        } finally {
          setIsLoading(false);
        }
      } else if (imageFile) {
        // Fallback: Convert image to base64 if not provided
        try {
          const compressedFile = await compressImage(imageFile);
          const base64Data = await fileToBase64(compressedFile);
          const fullDataUrl = `data:image/png;base64,${base64Data}`;
          response = await api.search.imageSearch(fullDataUrl, newQuery, 10);
          setSearchResults(response.products);
          setTotal(response.total);
        } catch (err: any) {
          console.error('Image search failed:', err);
          let errorMessage = 'Image search failed. Please try again.';
          
          // Handle specific error types
          if (err?.message?.includes('validation error') || err?.message?.includes('too_long')) {
            errorMessage = 'The search query is too complex. Please try with a simpler description or just upload the image without additional text.';
          } else if (err?.message?.includes('Invalid base64')) {
            errorMessage = 'There was an issue processing your image. Please try uploading a different image.';
          } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
          
          setError(errorMessage);
          setSearchResults([]);
          setTotal(0);
        } finally {
          setIsLoading(false);
        }
      } else {
        response = await api.search.textSearch(newQuery, 10);
        setSearchResults(response.products);
        setTotal(response.total);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      setSearchResults([]);
      setTotal(0);
      setIsLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return isNaN(numPrice) ? price : `$${numPrice.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Input */}
        <div className="mb-8">
          <SearchInput 
            onSearch={handleNewSearch}
            placeholder="Search for products..."
            className="max-w-2xl mx-auto"
          />
        </div>

        {/* Search Results Header */}
        {searchQuery && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Search Results
            </h1>
            <p className="text-gray-600">
              {isLoading ? 'Searching...' : `${total} results found for "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">Searching for products...</span>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && searchQuery && total === 0 && !error && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              We couldn't find any products matching your search. Try different keywords or browse our categories.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* Search Results Grid */}
        {!isLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200">
                  <Image
                    src={product.image || '/placeholder-product.jpg'}
                    alt={product.name}
                    width={300}
                    height={300}
                    className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                      {product.name}
                    </h3>
                    {product.score && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        {Math.round(product.score * 100)}%
                      </span>
                    )}
                  </div>
                  
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(product.price)}
                      </p>
                      {product.category_name && (
                        <p className="text-xs text-gray-500 mt-1">
                          {product.category_name}
                        </p>
                      )}
                    </div>
                    
                    <Link
                      href={`/products/${product.id}`}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State for New Visitors */}
        {!searchQuery && !isLoading && (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching</h3>
            <p className="text-gray-500">
              Enter a search term or upload an image to find products you're looking for.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}