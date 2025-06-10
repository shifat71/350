'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Category } from "@/types";
import api from "@/lib/api";
import Header from "@/components/Header";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.getCategories();
        // Backend returns categories array directly, not wrapped in an object
        setCategories(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Shop by Category</h1>
          <p className="mt-4 text-lg text-gray-600">Discover products organized by category</p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-300"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Featured Categories */}
            {categories.filter(category => category.featured).length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {categories.filter(category => category.featured).map((category) => (
                    <Link 
                      key={category.id} 
                      href={`/products?category=${category.id}`}
                      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative h-48">
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-opacity"></div>
                        <div className="absolute bottom-4 left-4 text-white">
                          <h3 className="text-xl font-bold">{category.name}</h3>
                          <p className="text-sm opacity-90">{category.productCount} products</p>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <p className="text-gray-600">{category.description}</p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-blue-600 font-medium group-hover:text-blue-700">
                            Shop Now →
                          </span>
                          <span className="text-sm text-gray-500">
                            {category.productCount} items
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All Categories */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">All Categories</h2>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No categories found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categories.map((category) => (
                    <Link 
                      key={category.id} 
                      href={`/products?category=${category.id}`}
                      className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="relative h-32">
                        <Image
                          src={category.image}
                          alt={category.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-10 group-hover:bg-opacity-20 transition-opacity"></div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {category.productCount} products
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Can&apos;t find what you&apos;re looking for?</h2>
          <p className="text-lg mb-6 opacity-90">Browse all our products or use our search feature</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/products"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              View All Products
            </Link>
            <button className="border border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-blue-600 transition-colors">
              Search Products
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}