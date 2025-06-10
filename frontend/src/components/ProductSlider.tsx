'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import ProductCard from './ProductCard';
import { Product } from '@/types';
import { useHydration } from '@/hooks/useHydration';

interface ProductSliderProps {
  products: { id: string; product: Product }[] | Product[];
  title?: string;
  className?: string;
  itemsPerView?: number;
}

export default function ProductSlider({ 
  products, 
  title,
  className = '',
  itemsPerView = 4
}: ProductSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(itemsPerView);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isHydrated = useHydration();

  // Normalize products data - handle both formats
  const normalizedProducts = products.map(item => 
    'product' in item ? item.product : item
  );

  // Responsive items per view
  useEffect(() => {
    // Only run after hydration to avoid SSR mismatch
    if (!isHydrated) return;

    const updateVisibleItems = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleItems(1);
      } else if (width < 768) {
        setVisibleItems(2);
      } else if (width < 1024) {
        setVisibleItems(3);
      } else {
        setVisibleItems(itemsPerView);
      }
    };

    updateVisibleItems();
    window.addEventListener('resize', updateVisibleItems);
    return () => window.removeEventListener('resize', updateVisibleItems);
  }, [itemsPerView, isHydrated]);

  const maxIndex = Math.max(0, normalizedProducts.length - visibleItems);
  
  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.min(Math.max(0, index), maxIndex));
  };

  // Touch handlers for mobile swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0); // Reset touchEnd
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentIndex < maxIndex) {
      goToNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      goToPrevious();
    }
  };

  // Auto-play functionality (optional)
  useEffect(() => {
    if (normalizedProducts.length <= visibleItems || isPaused || !isHydrated) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= maxIndex) {
          return 0; // Loop back to start
        }
        return prev + 1;
      });
    }, 5000); // Auto-advance every 5 seconds

    return () => clearInterval(interval);
  }, [maxIndex, normalizedProducts.length, visibleItems, isPaused, isHydrated]);

  // Keyboard navigation
  useEffect(() => {
    // Only run after hydration to avoid SSR mismatch
    if (!isHydrated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, maxIndex, isHydrated]);

  if (normalizedProducts.length === 0) {
    return null;
  }

  // If there are fewer products than visible items, show them without slider functionality
  if (normalizedProducts.length <= visibleItems) {
    return (
      <div className={`w-full ${className}`}>
        {title && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-sm text-gray-500">{normalizedProducts.length} items</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {normalizedProducts.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`w-full group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {title && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-2">•</span>
              <span>{normalizedProducts.length} items</span>
              {normalizedProducts.length > visibleItems && (
                <>
                  <span className="mx-2">•</span>
                  <span className="hidden sm:inline">Use arrows or swipe to navigate</span>
                  <span className="sm:hidden">Swipe to navigate</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous products"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next products"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden">
        <div
          ref={sliderRef}
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleItems)}%)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {normalizedProducts.map((product, index) => (
            <div
              key={product.id}
              className="flex-shrink-0 px-2"
              style={{ width: `${100 / visibleItems}%` }}
            >
              <div className="h-full">
                <ProductCard product={product} />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows - only show on hover for desktop */}
        <div className="absolute inset-y-0 left-0 flex items-center">
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="ml-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Previous products"
          >
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            onClick={goToNext}
            disabled={currentIndex >= maxIndex}
            className="mr-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Next products"
          >
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Dots indicator */}
      {normalizedProducts.length > visibleItems && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-blue-600'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {normalizedProducts.length > visibleItems && (
        <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + visibleItems) / normalizedProducts.length) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}