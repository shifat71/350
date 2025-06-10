'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import ProductCard from '@/components/ProductCard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { HeartIcon } from '@heroicons/react/24/outline';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { favorites, isLoading, isInitialLoading, refreshFavorites } = useFavorites();
  const router = useRouter();

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
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <HeartIcon className="h-8 w-8 text-red-500 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
          </div>
          <p className="text-gray-600">
            {favorites.length === 0 
              ? "You haven't added any favorites yet" 
              : `You have ${favorites.length} favorite ${favorites.length === 1 ? 'product' : 'products'}`
            }
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <HeartIcon className="mx-auto h-24 w-24 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No favorites yet</h3>
            <p className="text-gray-500 mb-6">
              Start browsing and add products to your favorites to see them here.
            </p>
            <button
              onClick={() => router.push('/products')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="min-h-[400px]">
            <div className="stable-grid">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="grid-fade-in"
                  style={{ minHeight: '450px' }}
                >
                  <ProductCard product={favorite.product} />
                </div>
              ))}
            </div>
            
            {/* Show subtle loading indicator during refresh */}
            {isLoading && (
              <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span className="text-sm">Refreshing...</span>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
