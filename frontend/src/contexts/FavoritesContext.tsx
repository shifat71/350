'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';
import { Product } from '@/types';
import toast from 'react-hot-toast';

interface FavoriteItem {
  id: string;
  product: Product;
  createdAt: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoritesCount: number;
  isLoading: boolean;
  isInitialLoading: boolean;
  addToFavorites: (product: Product) => Promise<void>;
  removeFromFavorites: (productId: number) => Promise<void>;
  toggleFavorite: (product: Product) => Promise<void>;
  isFavorite: (productId: number) => boolean;
  isStableFavorite: (productId: number) => boolean;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [stableFavoriteIds, setStableFavoriteIds] = useState<Set<number>>(new Set());
  const { user, token, isAuthenticated } = useAuth();

  const loadFavorites = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await api.favorites.getFavorites(token);
      if (response.success) {
        setFavorites(response.favorites);
        setFavoritesCount(response.favorites.length);
        
        // Update stable favorite IDs cache
        const favoriteIds = new Set<number>(response.favorites.map((fav: FavoriteItem) => fav.product.id));
        setStableFavoriteIds(favoriteIds);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [token]);

  // Load favorites when user is authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadFavorites();
    } else {
      // Clear favorites when user logs out
      setFavorites([]);
      setFavoritesCount(0);
      setStableFavoriteIds(new Set());
      setIsInitialLoading(false);
    }
  }, [isAuthenticated, token, loadFavorites]);

  const addToFavorites = useCallback(async (product: Product) => {
    if (!token) {
      toast.error('Please sign in to add items to favorites');
      return;
    }

    // Optimistically update stable cache
    setStableFavoriteIds(prev => new Set([...prev, product.id]));

    try {
      const response = await api.favorites.addToFavorites(token, product.id);
      if (response.success) {
        const newFavorite: FavoriteItem = {
          id: response.favorite.id,
          product: response.favorite.product,
          createdAt: response.favorite.createdAt
        };
        setFavorites(prev => [newFavorite, ...prev]);
        setFavoritesCount(prev => prev + 1);
        toast.success('Added to favorites');
      }
    } catch (error) {
      // Revert optimistic update on error
      setStableFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
      
      console.error('Error adding to favorites:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to add to favorites');
      }
    }
  }, [token]);

  const removeFromFavorites = useCallback(async (productId: number) => {
    if (!token) return;

    // Store current state for potential rollback
    const previousFavorites = favorites;
    
    // Optimistically update UI
    setStableFavoriteIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
    setFavorites(prev => prev.filter(fav => fav.product.id !== productId));
    setFavoritesCount(prev => prev - 1);

    try {
      const response = await api.favorites.removeFromFavorites(token, productId);
      if (response.success) {
        toast.success('Removed from favorites');
      }
    } catch (error) {
      // Revert optimistic updates on error
      setStableFavoriteIds(prev => new Set([...prev, productId]));
      setFavorites(previousFavorites);
      setFavoritesCount(previousFavorites.length);
      
      console.error('Error removing from favorites:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to remove from favorites');
      }
    }
  }, [token, favorites]);

  const toggleFavorite = useCallback(async (product: Product) => {
    const isCurrentlyFavorite = favorites.some(fav => fav.product.id === product.id);
    if (isCurrentlyFavorite) {
      await removeFromFavorites(product.id);
    } else {
      await addToFavorites(product);
    }
  }, [addToFavorites, removeFromFavorites, favorites]);

  const isFavorite = useCallback((productId: number): boolean => {
    return favorites.some(fav => fav.product.id === productId);
  }, [favorites]);

  const isStableFavorite = useCallback((productId: number): boolean => {
    // During loading states, use the stable cache to prevent flickering
    if (isLoading && !isInitialLoading) {
      return stableFavoriteIds.has(productId);
    }
    return isFavorite(productId);
  }, [isLoading, isInitialLoading, stableFavoriteIds, isFavorite]);

  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  const value: FavoritesContextType = {
    favorites,
    favoritesCount,
    isLoading,
    isInitialLoading,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    isStableFavorite,
    refreshFavorites,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};
