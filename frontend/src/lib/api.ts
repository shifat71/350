const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = {
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
  },
};

export default api;
