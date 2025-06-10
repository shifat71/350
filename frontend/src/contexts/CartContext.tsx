'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Product, CartItem } from '@/types';
import { useAuth } from './AuthContext';
import { useProduct } from './ProductContext';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isLoading: boolean;
}

interface CartContextType extends CartState {
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  refreshCart: () => Promise<void>;
  migrateLocalCart: () => Promise<void>;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CART'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { productId: number; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_LOCAL_CART'; payload: CartItem[] };

const CartContext = createContext<CartContextType | undefined>(undefined);

function cartReducer(state: CartState, action: CartAction): CartState {
  console.log('🔄 CartReducer: Action dispatched', { 
    type: action.type, 
    payload: 'payload' in action ? action.payload : undefined 
  });
  
  switch (action.type) {
    case 'SET_LOADING':
      console.log('⏳ CartReducer: Setting loading state to', action.payload);
      return { ...state, isLoading: action.payload };

    case 'SET_CART': {
      const items = action.payload;
      const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      console.log('📋 CartReducer: Setting cart', { itemsCount: items.length, total, itemCount });
      return { items, total, itemCount, isLoading: false };
    }

    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item => item.product.id === action.payload.product.id);
      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        console.log('➕ CartReducer: Updating existing item quantity');
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        console.log('🆕 CartReducer: Adding new item to cart');
        newItems = [...state.items, action.payload];
      }

      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      console.log('✅ CartReducer: Add item complete', { itemsCount: newItems.length, total, itemCount });
      return { ...state, items: newItems, total, itemCount };
    }

    case 'UPDATE_ITEM': {
      const newItems = state.items.map(item =>
        item.product.id === action.payload.productId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      console.log('🔄 CartReducer: Updated item', { productId: action.payload.productId, newQuantity: action.payload.quantity });
      return { ...state, items: newItems, total, itemCount };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.product.id !== action.payload.productId);
      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      console.log('🗑️ CartReducer: Removed item', { productId: action.payload.productId });
      return { ...state, items: newItems, total, itemCount };
    }

    case 'CLEAR_CART':
      console.log('🧹 CartReducer: Clearing cart');
      return { ...state, items: [], total: 0, itemCount: 0 };

    case 'LOAD_LOCAL_CART': {
      const items = action.payload;
      const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      console.log('💾 CartReducer: Loaded local cart', { itemsCount: items.length, total, itemCount });
      return { items, total, itemCount, isLoading: false };
    }

    default:
      console.warn('⚠️ CartReducer: Unknown action type', (action as any).type);
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
    isLoading: false,
  });

  const { token, isAuthenticated } = useAuth();
  const { refreshAllProducts } = useProduct();

  // Define all functions first before useEffect
  const loadCart = async () => {
    if (!token) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await api.cart.get(token);
      dispatch({ type: 'SET_CART', payload: response.cartItems || [] });
    } catch (error) {
      console.error('Error loading cart:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadLocalCart = () => {
    try {
      // SSR guard - only run on client side
      if (typeof window === 'undefined') {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const items = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_LOCAL_CART', payload: items });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const migrateLocalCart = async () => {
    if (!isAuthenticated || !token) return;
    
    try {
      // SSR guard - only run on client side
      if (typeof window === 'undefined') return;

      // Migrate existing cart items
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const localItems: CartItem[] = JSON.parse(savedCart);
        
        // Add each local cart item to the database
        for (const item of localItems) {
          try {
            await api.cart.add(token, item.product.id, item.quantity);
          } catch (error) {
            console.error('Error migrating cart item:', error);
          }
        }
        
        // Clear local cart
        localStorage.removeItem('cart');
        
        if (localItems.length > 0) {
          toast.success(`Migrated ${localItems.length} items to your cart`);
        }
      }
      
      // Migrate pending cart items (items added while not authenticated)
      const pendingCart = localStorage.getItem('pendingCart');
      if (pendingCart) {
        const pendingItems: CartItem[] = JSON.parse(pendingCart);
        
        // Add each pending cart item to the database
        for (const item of pendingItems) {
          try {
            await api.cart.add(token, item.product.id, item.quantity);
          } catch (error) {
            console.error('Error migrating pending cart item:', error);
          }
        }
        
        // Clear pending cart
        localStorage.removeItem('pendingCart');
        
        if (pendingItems.length > 0) {
          toast.success(`Added ${pendingItems.length} items to your cart`);
        }
      }
      
      // Refresh cart from database
      await loadCart();
    } catch (error) {
      console.error('Error migrating local cart:', error);
    }
  };

  // Initialize cart on mount and handle auth changes
  useEffect(() => {
    const initializeCart = async () => {
      console.log('🔄 CartContext: Initializing cart', { isAuthenticated, token: !!token });
      
      // Set loading state
      dispatch({ type: 'SET_LOADING', payload: true });
      
      if (isAuthenticated && token) {
        // SSR guard - only run on client side
        if (typeof window === 'undefined') {
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Check if there's a local cart or pending cart to migrate
        const savedCart = localStorage.getItem('cart');
        const pendingCart = localStorage.getItem('pendingCart');
        
        if ((savedCart && JSON.parse(savedCart).length > 0) || (pendingCart && JSON.parse(pendingCart).length > 0)) {
          console.log('📦 CartContext: Found cart items to migrate');
          await migrateLocalCart();
        } else {
          console.log('🔐 CartContext: Loading authenticated cart');
          await loadCart();
        }
      } else if (isAuthenticated === false) {
        // User logged out - clear cart and load local cart
        console.log('🚪 CartContext: User logged out, clearing cart and loading local cart');
        dispatch({ type: 'CLEAR_CART' });
        loadLocalCart();
      } else {
        // Load from localStorage for non-authenticated users
        console.log('👤 CartContext: Loading local cart');
        loadLocalCart();
      }
    };

    initializeCart();
  }, [isAuthenticated, token]);

  // Handle initial mount with proper auth state detection
  useEffect(() => {
    const initOnMount = async () => {
      console.log('🚀 CartContext: Initial mount - checking auth state');
      
      // SSR guard - only run on client side
      if (typeof window === 'undefined') return;
      
      // Check if we have a token in localStorage (page reload scenario)
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedToken && !token) {
        // We have a stored token but auth context hasn't loaded yet
        console.log('⏳ CartContext: Auth token found, waiting for auth context...');
        // Don't load anything yet, wait for auth context to initialize
        return;
      }
      
      if (!token && !storedToken) {
        // No authentication, load local cart
        console.log('👤 CartContext: No auth token, loading local cart');
        loadLocalCart();
      }
    };

    initOnMount();
  }, []);

  // Save to localStorage for non-authenticated users
  useEffect(() => {
    // SSR guard - only run on client side
    if (typeof window === 'undefined') return;

    if (!isAuthenticated && state.items.length > 0) {
      console.log('💾 CartContext: Saving cart to localStorage', { itemCount: state.items.length });
      localStorage.setItem('cart', JSON.stringify(state.items));
    } else if (!isAuthenticated && state.items.length === 0) {
      // Clean up empty cart from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        console.log('🧹 CartContext: Cleaning empty cart from localStorage');
        localStorage.removeItem('cart');
      }
    }
  }, [state.items, isAuthenticated]);

  const addToCart = async (product: Product, quantity: number = 1) => {
    console.log('🛒 CartContext: addToCart called', { 
      productId: product.id, 
      productName: product.name, 
      quantity,
      isAuthenticated 
    });
    
    if (isAuthenticated && token) {
      try {
        console.log('🔐 CartContext: Using authenticated flow');
        await api.cart.add(token, product.id, quantity);
        // For authenticated users, refresh the cart to get updated data from server
        console.log('🔄 CartContext: Refreshing cart after add');
        await loadCart(); // Direct call to loadCart for immediate update
        // Refresh product data to show updated stock
        refreshAllProducts();
        toast.success('Added to cart!');
        console.log('✅ CartContext: Authenticated add successful');
      } catch (error) {
        console.error('❌ CartContext: Authenticated add failed:', error);
        toast.error('Failed to add to cart');
        throw error;
      }
    } else {
      console.log('👤 CartContext: Using local/non-authenticated flow');
      // Add to local cart for non-authenticated users
      const cartItem: CartItem = {
        id: `local-${product.id}-${typeof window !== 'undefined' ? Date.now() : Math.floor(Math.random() * 1000000)}`,
        product,
        quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      console.log('📦 CartContext: Created cart item:', cartItem);
      dispatch({ type: 'ADD_ITEM', payload: cartItem });
      toast.success('Added to cart!');
      console.log('✅ CartContext: Local add successful');
    }
  };

  const removeFromCart = async (productId: number) => {
    if (isAuthenticated && token) {
      try {
        await api.cart.remove(token, productId);
        // Refresh cart from server to ensure accuracy
        await loadCart();
        // Refresh product data to show updated stock
        refreshAllProducts();
        toast.success('Removed from cart');
      } catch (error) {
        console.error('Error removing from cart:', error);
        toast.error('Failed to remove from cart');
        throw error;
      }
    } else {
      // Remove from local cart for non-authenticated users
      dispatch({ type: 'REMOVE_ITEM', payload: { productId } });
      toast.success('Removed from cart');
    }
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (isAuthenticated && token) {
      try {
        await api.cart.update(token, productId, quantity);
        // Refresh cart from server to ensure accuracy
        await loadCart();
        // Refresh product data to show updated stock
        refreshAllProducts();
      } catch (error) {
        console.error('Error updating cart:', error);
        throw error;
      }
    } else {
      // Update local cart for non-authenticated users
      dispatch({ type: 'UPDATE_ITEM', payload: { productId, quantity } });
    }
  };

  const clearCart = async () => {
    if (isAuthenticated && token) {
      try {
        await api.cart.clear(token);
        dispatch({ type: 'CLEAR_CART' });
        // Refresh product data to show updated stock
        refreshAllProducts();
        toast.success('Cart cleared');
      } catch (error) {
        console.error('Error clearing cart:', error);
        toast.error('Failed to clear cart');
        throw error;
      }
    } else {
      // Clear local cart for non-authenticated users
      dispatch({ type: 'CLEAR_CART' });
      toast.success('Cart cleared');
    }
  };

  const getTotalItems = () => state.itemCount;

  const refreshCart = async () => {
    if (isAuthenticated && token) {
      await loadCart();
    } else {
      loadLocalCart();
    }
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    refreshCart,
    migrateLocalCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
