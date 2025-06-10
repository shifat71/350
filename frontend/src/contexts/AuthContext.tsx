'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthUser, LoginCredentials, RegisterData } from '@/types';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AuthUser; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: AuthUser };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false
  });

  // Check for existing token on mount - only on client side
  useEffect(() => {
    const checkAuth = async () => {
      // SSR guard - only run on client side
      if (typeof window === 'undefined') {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/customer-auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { user: data.user, token } 
            });
          } else {
            localStorage.removeItem('auth_token');
            dispatch({ type: 'LOGIN_FAILURE' });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    dispatch({ type: 'LOGIN_START' });
    
    try {
      const response = await fetch(`${API_BASE_URL}/customer-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok) {
        // Only set localStorage on client side
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token);
        }
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user: data.user, token: data.token } 
        });
        toast.success('Successfully logged in!');
      } else {
        // Handle email verification error specifically
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          dispatch({ type: 'LOGIN_FAILURE' });
          const errorWithEmail = new Error(data.error);
          (errorWithEmail as Error & { code?: string; email?: string }).code = 'EMAIL_NOT_VERIFIED';
          (errorWithEmail as Error & { code?: string; email?: string }).email = credentials.email;
          throw errorWithEmail;
        } else {
          throw new Error(data.error || 'Login failed');
        }
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Split name into firstName and lastName
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const requestData = {
        email: data.email,
        password: data.password,
        firstName,
        lastName
      };
      
      const response = await fetch(`${API_BASE_URL}/customer-auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const responseData = await response.json();

      if (response.ok) {
        // Don't log in user immediately - they need to verify email first
        dispatch({ type: 'SET_LOADING', payload: false });
        toast.success('Account created successfully! Please check your email to verify your account before logging in.');
        return responseData; // Return response data so component can handle it
      } else {
        throw new Error(responseData.error || 'Registration failed');
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    dispatch({ type: 'LOGOUT' });
    toast.success('Successfully logged out!');
  };

  const refreshUser = async () => {
    // SSR guard - only run on client side
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const response = await fetch(`${API_BASE_URL}/customer-auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          dispatch({ type: 'SET_USER', payload: data.user });
        }
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}