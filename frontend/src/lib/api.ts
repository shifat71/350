import { SearchResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Debug log to check if environment variable is loaded
if (typeof window !== 'undefined') {
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('API_BASE_URL:', API_BASE_URL);
}

export const api = {
  // Products
  getProducts: async (params?: {
    category?: string;
    featured?: boolean;
    inStock?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    page?: number;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    if (params?.category) searchParams.append('category', params.category);
    if (params?.featured) searchParams.append('featured', 'true');
    if (params?.inStock !== undefined) searchParams.append('inStock', params.inStock.toString());
    if (params?.minPrice !== undefined) searchParams.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice !== undefined) searchParams.append('maxPrice', params.maxPrice.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const url = `${API_BASE_URL}/products?${searchParams}`;
    console.log('Fetching products from:', url);
    
    const response = await fetch(url);
    console.log('Products response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Products fetch failed:', errorText);
      throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Products data received:', data);
    return data;
  },

  getProduct: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  // Categories
  getCategories: async (featured?: boolean) => {
    const searchParams = new URLSearchParams();
    if (featured) searchParams.append('featured', 'true');
    
    const response = await fetch(`${API_BASE_URL}/categories?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  getCategory: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`);
    if (!response.ok) throw new Error('Failed to fetch category');
    return response.json();
  },

  // Health check
  healthCheck: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error('API health check failed');
    return response.json();
  },

  // Authentication
  auth: {
    login: async (credentials: { email: string; password: string }) => {
      const response = await fetch(`${API_BASE_URL}/customer-auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }
      return response.json();
    },

    register: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const response = await fetch(`${API_BASE_URL}/customer-auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }
      return response.json();
    },

    getProfile: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/customer-auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
  },

  // Cart
  cart: {
    get: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch cart');
      return response.json();
    },

    add: async (token: string, productId: number, quantity: number = 1) => {
      const url = `${API_BASE_URL}/cart/add`;
      console.log('Adding to cart:', { url, productId, quantity });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });
      
      console.log('Cart add response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Cart add failed:', error);
        throw new Error(error.error || 'Failed to add to cart');
      }
      
      const data = await response.json();
      console.log('Cart add successful:', data);
      return data;
    },

    update: async (token: string, productId: number, quantity: number) => {
      const response = await fetch(`${API_BASE_URL}/cart/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update cart');
      }
      return response.json();
    },

    remove: async (token: string, productId: number) => {
      const response = await fetch(`${API_BASE_URL}/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove from cart');
      }
      return response.json();
    },

    clear: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/cart/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to clear cart');
      return response.json();
    },
  },

  // Orders
  orders: {
    getHistory: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch order history');
      return response.json();
    },

    getOrder: async (token: string, orderId: string) => {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch order details');
      return response.json();
    },

    createFromCart: async (token: string, shippingAddress: { street: string; city: string; state: string; zipCode: string; country: string }) => {
      const response = await fetch(`${API_BASE_URL}/orders/create-from-cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ shippingAddress }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }
      return response.json();
    },

    createWithCheckout: async (token: string, orderData: {
      customerInfo: {
        firstName: string;
        lastName: string;
        email: string;
        mobile: string;
      };
      shippingAddress: {
        firstName: string;
        lastName: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
      };
    }) => {
      const response = await fetch(`${API_BASE_URL}/orders/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }
      return response.json();
    },
  },

  // Reviews
  reviews: {
    getReviews: async (productId: number, params?: {
      page?: number;
      limit?: number;
      sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);

      const response = await fetch(`${API_BASE_URL}/reviews/${productId}?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },

    createReview: async (token: string, productId: number, reviewData: {
      rating: number;
      title: string;
      comment: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/reviews/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(reviewData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create review');
      }
      return response.json();
    },

    markHelpful: async (token: string, reviewId: string) => {
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/helpful`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to mark review as helpful');
      return response.json();
    },

    deleteReview: async (token: string, reviewId: string) => {
      const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete review');
      return response.json();
    },
  },

  // Admin API
  admin: {
    // Auth
    login: async (email: string, password: string) => {
      const url = `${API_BASE_URL}/auth/login`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin login failed:', { status: response.status, error: errorText });
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || 'Admin login failed');
        } catch {
          throw new Error(`Admin login failed: ${response.status} - ${errorText}`);
        }
      }
      
      return response.json();
    },

    getCurrentAdmin: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to get admin info');
      return response.json();
    },

    // Categories
    getCategories: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch admin categories');
      return response.json();
    },

    createCategory: async (token: string, categoryData: {
      name: string;
      description?: string;
      image: string;
      featured?: boolean;
    }) => {
      const response = await fetch(`${API_BASE_URL}/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
      return response.json();
    },

    updateCategory: async (token: string, id: string, categoryData: {
      name?: string;
      description?: string;
      image?: string;
      featured?: boolean;
    }) => {
      const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(categoryData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }
      return response.json();
    },

    deleteCategory: async (token: string, id: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }
    },

    // Products
    getProducts: async (token: string, params?: {
      category?: string;
      inStock?: boolean;
      featured?: boolean;
      limit?: number;
      page?: number;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
    }) => {
      const searchParams = new URLSearchParams();
      
      if (params?.category) searchParams.append('category', params.category);
      if (params?.inStock !== undefined) searchParams.append('inStock', params.inStock.toString());
      if (params?.featured !== undefined) searchParams.append('featured', params.featured.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
      if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
      if (params?.search) searchParams.append('search', params.search);
      
      const response = await fetch(`${API_BASE_URL}/admin/products?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch admin products');
      return response.json();
    },

    createProduct: async (token: string, productData: {
      name: string;
      price: number;
      originalPrice?: number;
      image: string;
      images?: string[];
      description?: string;
      features?: string[];
      specifications?: object;
      stock: number;
      categoryId: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create product');
      }
      return response.json();
    },

    updateProduct: async (token: string, id: number, productData: {
      name?: string;
      price?: number;
      originalPrice?: number;
      image?: string;
      images?: string[];
      description?: string;
      features?: string[];
      specifications?: object;
      stock?: number;
      inStock?: boolean;
      categoryId?: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update product');
      }
      return response.json();
    },

    deleteProduct: async (token: string, id: number) => {
      const response = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete product');
      }
    },

    // Orders
    getOrders: async (token: string, params?: {
      status?: string;
      page?: number;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append('status', params.status);
      if (params?.page) searchParams.append('page', params.page.toString());
      if (params?.limit) searchParams.append('limit', params.limit.toString());

      const response = await fetch(`${API_BASE_URL}/admin/orders?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },

    approveOrder: async (token: string, orderId: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to approve order');
      return response.json();
    },

    rejectOrder: async (token: string, orderId: string, reason?: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error('Failed to reject order');
      return response.json();
    },

    updateOrderStatus: async (token: string, orderId: string, status: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },

    getSalesStats: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/analytics/sales`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch sales stats');
      return response.json();
    },
  },

  // Upload API
  upload: {
    image: async (token: string, file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }
      
      return response.json();
    },

    images: async (token: string, files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/upload/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload images');
      }
      
      return response.json();
    },

    deleteImage: async (token: string, publicId: string) => {
      const response = await fetch(`${API_BASE_URL}/upload/image/${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete image');
      }
      
      return response.json();
    },
  },

  // Order Management (Admin)
  getOrders: async (params?: URLSearchParams) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('Admin authentication required');
    }
    
    const url = `${API_BASE_URL}/admin/orders${params ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('getOrders failed:', { status: response.status, error: errorText });
      if (response.status === 401) {
        throw new Error('Admin authentication required. Please login again.');
      }
      throw new Error('Failed to fetch orders');
    }
    return response.json();
  },

  approveOrder: async (orderId: string) => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('Admin authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new Error('Admin authentication required. Please login again.');
      }
      throw new Error(error.error || 'Failed to approve order');
    }
    return response.json();
  },

  rejectOrder: async (orderId: string, reason?: string) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject order');
    }
    return response.json();
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update order status');
    }
    return response.json();
  },

  getSalesStats: async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      throw new Error('Admin authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}/admin/analytics/sales`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Admin authentication required. Please login again.');
      }
      throw new Error('Failed to fetch sales stats');
    }
    return response.json();
  },

  // Favorites
  favorites: {
    getFavorites: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch favorites');
      return response.json();
    },

    addToFavorites: async (token: string, productId: number) => {
      const response = await fetch(`${API_BASE_URL}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to favorites');
      }
      return response.json();
    },

    removeFromFavorites: async (token: string, productId: number) => {
      const response = await fetch(`${API_BASE_URL}/favorites/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove from favorites');
      }
      return response.json();
    },

    checkIsFavorite: async (token: string, productId: number) => {
      const response = await fetch(`${API_BASE_URL}/favorites/check/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to check favorite status');
      return response.json();
    },

    getFavoritesCount: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/favorites/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to get favorites count');
      return response.json();
    },
  },

  // AI Search functionality
  search: {
    textSearch: async (query: string, limit: number = 5): Promise<SearchResponse> => {
      const response = await fetch('http://localhost:9000/search/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Text search failed: ${response.status}`);
      }
      
      return response.json();
    },

    imageSearch: async (imageBase64: string, query: string = '', limit: number = 5): Promise<SearchResponse> => {
      const response = await fetch('http://localhost:9000/search/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          query,
          limit
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Image search failed: ${response.status}`);
      }
      
      return response.json();
    }
  },
};

export default api;
