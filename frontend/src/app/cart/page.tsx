'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TrashIcon, MinusIcon, PlusIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCart } from '@/contexts/CartContext';
import { useProduct } from '@/contexts/ProductContext';
import { formatPrice } from '@/lib/utils';
import CheckoutModal from '@/components/CheckoutModal';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, total, getTotalItems } = useCart();
  const { refreshAllProducts } = useProduct();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeFromCart(productId);
    } else {
      await updateQuantity(productId, newQuantity);
    }
    // Refresh products to show updated stock after cart changes
    refreshAllProducts();
  };

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const handleCheckout = async () => {
    setShowCheckoutModal(true);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBagIcon className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">
            Looks like you haven&apos;t added any items to your cart yet.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Cart Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'} in your cart
            </h2>
            <p className="text-sm text-gray-500">
              Free shipping on orders over $50
            </p>
          </div>
        </div>

        {/* Cart Items */}
        <div className="divide-y divide-gray-200">
          {items.map((item) => (
            <div key={item.id} className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900">
                    <Link 
                      href={`/products/${item.product.id}`}
                      className="hover:text-blue-600"
                    >
                      {item.product.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatPrice(item.product.price)} each
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="p-2 hover:bg-gray-50 focus:outline-none"
                    >
                      <MinusIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <span className="px-3 py-2 text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="p-2 hover:bg-gray-50 focus:outline-none"
                    >
                      <PlusIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  {/* Item Total */}
                  <div className="text-lg font-medium text-gray-900 min-w-[5rem] text-right">
                    {formatPrice(item.product.price * item.quantity)}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg focus:outline-none"
                    title="Remove item"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="bg-gray-50 px-6 py-6 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium text-gray-900">Subtotal:</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(total)}
            </span>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>{total >= 50 ? 'Free' : '$5.99'}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>Calculated at checkout</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            >
              Continue Shopping
            </Link>
            <button
              onClick={handleCheckout}
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : `Checkout • ${formatPrice(total)}`}
            </button>
          </div>

          {total < 50 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Add {formatPrice(50 - total)} more to qualify for free shipping!
            </p>
          )}
        </div>
      </div>

      {/* Recommended Products */}
      
      {/* Checkout Modal */}
      <CheckoutModal 
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        total={total}
      />
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">You might also like</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-500 text-center">
            Product recommendations coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
