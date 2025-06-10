import Image from "next/image";
import Link from "next/link";
import { HeartIcon, StarIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartIconSolid } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Product } from "@/types";
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { isStableFavorite, toggleFavorite, isLoading } = useFavorites();
  const router = useRouter();

  const isFavoriteStable = isStableFavorite(product.id);

  const handleAddToCart = async () => {
    if (product.inStock === false) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      // SSR guard - only run on client side
      if (typeof window === 'undefined') return;

      // Store the product in localStorage as a pending cart item
      const pendingCartItems = JSON.parse(localStorage.getItem('pendingCart') || '[]');
      const existingItemIndex = pendingCartItems.findIndex((item: { product: { id: number }, quantity: number }) => item.product.id === product.id);
      
      if (existingItemIndex >= 0) {
        pendingCartItems[existingItemIndex].quantity += 1;
      } else {
        pendingCartItems.push({
          id: `pending-${product.id}-${typeof window !== 'undefined' ? Date.now() : Math.floor(Math.random() * 1000000)}`,
          product,
          quantity: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      localStorage.setItem('pendingCart', JSON.stringify(pendingCartItems));
      
      // Show toast message and redirect to login
      toast.error('Please sign in to add items to your cart');
      
      // Redirect to login with current page as redirect parameter
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    try {
      await addToCart(product, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to manage favorites');
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    
    try {
      await toggleFavorite(product);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col group hover:scale-[1.02]">
      <div className="relative h-64 flex-shrink-0 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
        
        {/* Sale Badge */}
        {product.originalPrice && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
            Sale
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {product.inStock === false && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white font-semibold text-lg">Out of Stock</span>
          </div>
        )}
        
        {/* Wishlist Button */}
        <button 
          onClick={handleToggleWishlist}
          disabled={isLoading}
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2.5 rounded-full shadow-lg hover:bg-white transition-all duration-200 disabled:opacity-50 hover:scale-110"
        >
          {isFavoriteStable ? (
            <HeartIconSolid className="h-5 w-5 text-red-500" />
          ) : (
            <HeartIcon className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        {/* Category and Stock Status */}
        {(product.category || product.inStock !== undefined) && (
          <div className="flex items-center justify-between mb-2">
            {product.category && (
              <span className="text-sm text-blue-600 font-medium">
                {typeof product.category === 'string' ? product.category : product.category.name}
              </span>
            )}
            {product.inStock !== undefined && (
              <span className={`text-sm ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            )}
          </div>
        )}
        
        {/* Product Name */}
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem] hover:text-blue-600 transition-colors cursor-pointer">
            {product.name}
          </h3>
        </Link>
        
        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={`h-4 w-4 ${
                  i < Math.floor(product.rating)
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-600">
            {product.rating} ({product.reviews} reviews)
          </span>
        </div>
        
        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gray-900">${product.price}</span>
            {product.originalPrice && (
              <span className="text-lg text-gray-500 line-through">${product.originalPrice}</span>
            )}
          </div>
          <button 
            onClick={handleAddToCart}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
              product.inStock !== false
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105" 
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            disabled={product.inStock === false}
          >
            {product.inStock !== false ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
