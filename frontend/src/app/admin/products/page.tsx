'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import ImageUpload from '@/components/ImageUpload';
import MultipleImageUpload from '@/components/MultipleImageUpload';
import api from '@/lib/api';
import { Product, Category } from '@/types';
import { useAdmin } from '@/contexts/AdminContext';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  images: string[];
  categoryId: string;
  inStock?: boolean;
  features?: string[];
}

export default function AdminProducts() {
  const { token } = useAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    image: '',
    images: [],
    categoryId: '',
    inStock: true,
    features: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const extractPublicId = (imageUrl: string): string | null => {
    try {
      // Extract public ID from Cloudinary URL
      const parts = imageUrl.split('/');
      const uploadIndex = parts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
        const filename = parts[uploadIndex + 2];
        return filename.split('.')[0]; // Remove file extension
      }
      return null;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  };

  const deleteOldImages = async (imageUrls: string[]) => {
    if (!token) return;
    
    for (const imageUrl of imageUrls) {
      const publicId = extractPublicId(imageUrl);
      if (publicId) {
        try {
          await api.upload.deleteImage(token, publicId);
        } catch (error) {
          console.error('Failed to delete old image:', error);
          // Continue with other deletions even if one fails
        }
      }
    }
  };

  const fetchData = async () => {
    if (!token) return;
    
    try {
      const [productsResponse, categoriesData] = await Promise.all([
        api.admin.getProducts(token),
        api.admin.getCategories(token)
      ]);
      setProducts(productsResponse.products || productsResponse);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;
    
    try {
      if (editingProduct) {
        // For updates, track which images were removed for cleanup
        const oldImages = editingProduct.images || [];
        const newImages = formData.images;
        const removedImages = oldImages.filter(img => !newImages.includes(img));
        
        // Update the product first
        await api.admin.updateProduct(token, editingProduct.id, formData);
        
        // Clean up removed images in the background (don't block UI)
        if (removedImages.length > 0) {
          deleteOldImages(removedImages).catch(error => 
            console.error('Failed to clean up old images:', error)
          );
        }
        
        toast.success('Product updated successfully');
      } else {
        await api.admin.createProduct(token, formData);
        toast.success('Product created successfully');
      }
      
      await fetchData();
      resetForm();
    } catch (error) {
      toast.error(editingProduct ? 'Failed to update product' : 'Failed to create product');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    if (!token) return;

    try {
      // Find the product to get its images for cleanup
      const productToDelete = products.find(p => p.id === id);
      
      // Delete the product first
      await api.admin.deleteProduct(token, id);
      
      // Clean up images in the background
      if (productToDelete) {
        const imagesToDelete = [
          productToDelete.image,
          ...(productToDelete.images || [])
        ].filter(Boolean);
        
        if (imagesToDelete.length > 0) {
          deleteOldImages(imagesToDelete).catch(error => 
            console.error('Failed to clean up product images:', error)
          );
        }
      }
      
      toast.success('Product deleted successfully');
      await fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image: product.image,
      images: product.images || [],
      categoryId: product.categoryId,
      inStock: product.inStock,
      features: product.features || []
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      image: '',
      images: [],
      categoryId: '',
      inStock: true,
      features: []
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading products...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">Manage your products</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Product
          </button>
        </div>

        {/* Product Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <ImageUpload
                  currentImage={formData.image}
                  onImageUploaded={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
                  onImageRemoved={() => setFormData({ ...formData, image: '' })}
                  label="Product Image"
                  required
                />
                <MultipleImageUpload
                  currentImages={formData.images}
                  onImagesUploaded={(imageUrls) => setFormData({ ...formData, images: imageUrls })}
                  onImageRemoved={(index) => {
                    const newImages = [...formData.images];
                    newImages.splice(index, 1);
                    setFormData({ ...formData, images: newImages });
                  }}
                  label="Product Gallery"
                  maxImages={5}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {product.category?.name || 'No category'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${product.price}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {product.stock}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No products found</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-900"
              >
                Create your first product
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
