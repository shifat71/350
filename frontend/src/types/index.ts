// Type definitions for the e-commerce application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'CUSTOMER' | 'ADMIN';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  addresses?: Address[];
}

export interface Address {
  id: string;
  type: 'SHIPPING' | 'BILLING';
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'CUSTOMER' | 'ADMIN';
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string; // We'll split this into firstName and lastName
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}