'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import ProductCard from '@/components/ProductCard';
import ProductSlider from '@/components/ProductSlider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { HeartIcon, Squares2X2Icon, QueueListIcon } from '@heroicons/react/24/outline';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { favorites, isLoading, isInitialLoading, refreshFavorites } = useFavorites();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'slider' | 'grid'>('slider');

  const handleViewModeChange = (mode: 'slider' | 'grid') => {
    setViewMode(mode);
    // Smooth scroll to top when changing view modes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/favorites');
      return;
    }

    if (isAuthenticated) {
      refreshFavorites();
    }
  }, [isAuthenticated, authLoading, router, refreshFavorites]);

  if (authLoading || isInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your favorites...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header with enhanced styling */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div className="flex items-center">
              <div className="bg-red-50 p-3 rounded-full mr-4">
                <HeartIcon className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Favorites</h1>
                <p className="text-lg text-gray-600">
                  {favorites.length === 0 
                    ? "You haven't added any favorites yet" 
                    : `${favorites.length} favorite ${favorites.length === 1 ? 'product' : 'products'} saved`
                  }
                </p>
              </div>
            </div>
            
            {/* View Toggle Buttons */}
            {favorites.length > 0 && (
              <div className="flex items-center space-x-4 flex-shrink-0">
                <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => handleViewModeChange('slider')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'slider'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <QueueListIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Slider</span>
                  </button>
                  <button
                    onClick={() => handleViewModeChange('grid')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">Grid</span>
                  </button>
                </div>
                
                {/* Quick actions */}
                <button
                  onClick={() => router.push('/products')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Add More
                </button>
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-gray-50 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-8">
              <HeartIcon className="h-16 w-16 text-gray-300" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No favorites yet</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              Discover amazing products and save your favorites to see them here. Start browsing our collection!
            </p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Conditional rendering based on view mode */}
            {viewMode === 'slider' ? (
              <div className="space-y-8">
                {/* Product Slider */}
                <ProductSlider 
                  products={favorites}
                  title="Your Favorite Products"
                  itemsPerView={4}
                  className="mb-8"
                />
                
                {/* Slider tips */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>Tip:</strong> Use keyboard arrows to navigate, hover to pause auto-scroll, or swipe on mobile devices.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Grid View */
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Favorite Products</h2>
                <div className="favorites-grid">
                  {favorites.map((favorite, index) => (
                    <div
                      key={favorite.id}
                      className="favorites-item"
                      style={{ 
                        animationDelay: `${index * 0.1}s`,
                      }}
                    >
                      <ProductCard product={favorite.product} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Statistics */}
            {favorites.length > 3 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mt-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-blue-600">{favorites.length}</div>
                    <div className="text-sm text-gray-600">Total Favorites</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">
                      ${Math.round(favorites.reduce((sum, fav) => sum + fav.product.price, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Total Value</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      ${Math.round(favorites.reduce((sum, fav) => sum + fav.product.price, 0) / favorites.length)}
                    </div>
                    <div className="text-sm text-gray-600">Average Price</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Bottom spacing */}
            <div className="h-8"></div>
            
            {/* Show subtle loading indicator during refresh */}
            {isLoading && (
              <div className="fixed bottom-6 right-6 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-full shadow-lg flex items-center space-x-3 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <span className="text-sm font-medium">Updating favorites...</span>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
