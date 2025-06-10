'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '@/types';
import api from '@/lib/api';

interface ProductContextType {
  refreshProduct: (productId: number) => Promise<void>;
  refreshAllProducts: () => void;
  getUpdatedProduct: (productId: number) => Promise<Product | null>;
  invalidateProductCache: (productId?: number) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Cache to store recently fetched products for a short time
const productCache = new Map<number, { product: Product; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const refreshProduct = useCallback(async (productId: number) => {
    try {
      const product = await api.getProduct(productId);
      
      // Update cache with fresh data
      productCache.set(productId, {
        product,
        timestamp: Date.now()
      });

      return product;
    } catch (error) {
      console.error('Error refreshing product:', error);
      throw error;
    }
  }, []);

  const refreshAllProducts = useCallback(() => {
    // Clear cache and trigger refresh
    productCache.clear();
  }, []);

  const getUpdatedProduct = useCallback(async (productId: number): Promise<Product | null> => {
    // Check cache first
    const cached = productCache.get(productId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.product;
    }

    // Fetch fresh data
    try {
      const product = await api.getProduct(productId);
      productCache.set(productId, {
        product,
        timestamp: Date.now()
      });
      return product;
    } catch (error) {
      console.error('Error fetching updated product:', error);
      return null;
    }
  }, []);

  const invalidateProductCache = useCallback((productId?: number) => {
    if (productId) {
      productCache.delete(productId);
    } else {
      productCache.clear();
    }
  }, []);

  const value = {
    refreshProduct,
    refreshAllProducts,
    getUpdatedProduct,
    invalidateProductCache,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
}
