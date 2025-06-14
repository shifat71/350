// Type definitions for the e-commerce application

export interface Category {
  id: string;
  name: string;
  description?: string;
  image: string;
  productCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  products?: Product[];
}

export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  stock: number;
  description?: string;
  features: string[];
  specifications?: Record<string, any>;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

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

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  productId: number;
  orderId: string;
  product?: Product;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
  userId: string;
  shippingAddressId: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  user?: User;
  shippingAddress?: Address;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}

// Cart types for frontend state management
export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  success: boolean;
}

// Query parameters for API calls
export interface ProductQueryParams {
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CategoryQueryParams {
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface Review {
  id: string;
  productId: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  helpful: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

export interface CreateReviewData {
  rating: number;
  title: string;
  comment: string;
}

// AI Search Types
export interface SearchProduct {
  id: number;  // Changed from string to number to match backend
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  image: string;  // Changed from image_url to image to match backend
  images?: string[];
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  stock?: number;
  features?: string[];
  specifications?: any;
  category_name: string;
  score: number;
}

export interface SearchResponse {
  products: SearchProduct[];
  total: number;
}

export interface TextSearchRequest {
  query: string;
  limit?: number;
}

export interface ImageSearchRequest {
  image_base64: string;
  query?: string;
  limit?: number;
}