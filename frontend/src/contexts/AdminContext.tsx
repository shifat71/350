'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface AdminState {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AdminContextType extends AdminState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

type AdminAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AdminUser; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AdminUser };

const AdminContext = createContext<AdminContextType | undefined>(undefined);

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true
      };
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    default:
      return state;
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(adminReducer, {
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false
  });

  // Check for existing admin token on mount - only on client side
  useEffect(() => {
    const checkAuth = async () => {
      // SSR guard - only run on client side
      if (typeof window === 'undefined') {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const response = await api.admin.getCurrentAdmin(token);
          // Ensure cookie is set
          document.cookie = `adminToken=${token}; path=/; max-age=86400; SameSite=lax`;
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user: response.admin, token } 
          });
        } catch (error) {
          console.error('Admin auth check failed:', error);
          localStorage.removeItem('admin_token');
          document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      console.log('AdminContext: Starting login for', email);
      const response = await api.admin.login(email, password);
      console.log('AdminContext: Login response received', response);
      
      // Only set localStorage and cookies on client side
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', response.token);
        // Also set cookie for middleware
        document.cookie = `adminToken=${response.token}; path=/; max-age=86400; SameSite=lax`;
        console.log('AdminContext: Token stored in localStorage and cookie');
      }
      
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user: response.admin, token: response.token } 
      });
      
      console.log('AdminContext: Login success dispatched');
      toast.success('Admin login successful!');
    } catch (error) {
      console.error('AdminContext: Login failed', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      toast.error(error instanceof Error ? error.message : 'Admin login failed');
      throw error;
    }
  };

  const logout = () => {
    // Only access localStorage and cookies on client side
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      // Clear the cookie
      document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    dispatch({ type: 'LOGOUT' });
    toast.success('Admin logged out successfully!');
  };

  const refreshAdmin = async () => {
    // SSR guard - only run on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const response = await api.admin.getCurrentAdmin(token);
        dispatch({ type: 'SET_USER', payload: response.admin });
      } catch (error) {
        console.error('Failed to refresh admin:', error);
        logout();
      }
    }
  };

  return (
    <AdminContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
