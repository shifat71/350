'use client'

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useProduct } from '@/contexts/ProductContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import api from '@/lib/api';
import { Product, ReviewsResponse, CreateReviewData } from '@/types';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { invalidateProductCache } = useProduct();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setReviewsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'specifications'>('description');
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState<CreateReviewData>({
    rating: 5,
    title: '',
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [, setUserHasPurchased] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);

  const productId = parseInt(params.id as string);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProduct(productId);
      setProduct(data);
      // Update product cache
      invalidateProductCache(productId);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, invalidateProductCache]);

  const fetchReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      const data = await api.reviews.getReviews(productId, { limit: 20 });
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  }, [productId]);

  const checkUserReviewStatus = useCallback(() => {
    if (!user || !reviews) return;
    
    const userReview = reviews.reviews.find(review => review.userId === user.id);
    setUserHasReviewed(!!userReview);
    
    // Check if user has purchased this product (simplified check based on verified reviews)
    const hasVerifiedReview = reviews.reviews.some(review => 
      review.userId === user.id && review.verified
    );
    setUserHasPurchased(hasVerifiedReview);
  }, [user, reviews]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchReviews();
    }
  }, [productId, fetchProduct, fetchReviews]);

  useEffect(() => {
    if (reviews && user) {
      checkUserReviewStatus();
    }
  }, [reviews, user, checkUserReviewStatus]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    if (!token) {
      toast.error('Please login to add items to cart');
      router.push('/login');
      return;
    }
    
    try {
      await addToCart(product, quantity);
      toast.success(`Added ${quantity} ${product.name}${quantity > 1 ? 's' : ''} to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please login to submit a review');
      router.push('/login');
      return;
    }
    
    if (!reviewForm.title || !reviewForm.comment) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmittingReview(true);
      await api.reviews.createReview(token, productId, reviewForm);
      
      // Reset form and hide it
      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      
      // Refresh both reviews and product data to get updated rating/review count
      await Promise.all([fetchReviews(), fetchProduct()]);
      
      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShowReviewForm = () => {
    if (!token) {
      toast.error('Please login to write a review');
      router.push('/login');
      return;
    }
    setShowReviewForm(true);
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (!token) return;
    
    try {
      await api.reviews.markHelpful(token, reviewId);
      await fetchReviews(); // Refresh to show updated helpful count
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-2xl ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''}`}
            onClick={() => interactive && onRatingChange?.(star)}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!reviews) return null;

    const { ratingDistribution, totalReviews } = reviews.summary;
    
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = ratingDistribution[rating as keyof typeof ratingDistribution];
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center space-x-2 text-sm">
              <span className="w-8">{rating}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading || !product) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading product...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={product.images[selectedImage] || product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {product.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    {renderStars(product.rating)}
                    <span className="text-gray-600 ml-2">
                      ({product.reviews} review{product.reviews !== 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl font-bold text-gray-900">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-xl text-gray-500 line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className={`text-sm ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                  {product.inStock ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                </div>
              </div>

              {/* Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium">Quantity:</label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    {[...Array(Math.min(10, product.stock))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {!token ? 'Login to Add to Cart' : product.inStock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                  
                  <button
                    onClick={() => toggleFavorite(product)}
                    className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                      isFavorite(product.id)
                        ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title={isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <HeartIcon 
                      className={`h-6 w-6 ${
                        isFavorite(product.id) ? 'fill-current' : ''
                      }`} 
                    />
                  </button>
                </div>
              </div>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-8 bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8">
              {['description', 'reviews', 'specifications'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'description' | 'reviews' | 'specifications')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                  {tab === 'reviews' && reviews && (
                    <span className="ml-1 text-gray-400">({reviews.summary.totalReviews})</span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {product.description || 'No description available.'}
                </p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                {product.specifications ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="font-medium text-gray-700">{key}:</span>
                        <span className="text-gray-600">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No specifications available.</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* Review Summary */}
                {reviews && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Customer Reviews</h3>
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="text-4xl font-bold">{reviews.summary.averageRating.toFixed(1)}</div>
                        <div>
                          {renderStars(Math.round(reviews.summary.averageRating))}
                          <div className="text-sm text-gray-600 mt-1">
                            Based on {reviews.summary.totalReviews} review{reviews.summary.totalReviews !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-4">Rating Distribution</h4>
                      {renderRatingDistribution()}
                    </div>
                  </div>
                )}

                {/* Write Review Button */}
                <div className="border-t pt-6">
                  {!userHasReviewed ? (
                    <button
                      onClick={handleShowReviewForm}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      {!user ? 'Login to Write a Review' : 'Write a Review'}
                    </button>
                  ) : (
                    <p className="text-gray-600 font-medium">
                      ✓ You have already reviewed this product
                    </p>
                  )}
                </div>

                {/* Review Form */}
                {showReviewForm && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold mb-4">Write Your Review</h4>
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Rating</label>
                        {renderStars(reviewForm.rating, true, (rating) => 
                          setReviewForm({ ...reviewForm, rating })
                        )}
                      </div>
                      
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium mb-2">
                          Review Title
                        </label>
                        <input
                          type="text"
                          id="title"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Summarize your review..."
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="comment" className="block text-sm font-medium mb-2">
                          Review
                        </label>
                        <textarea
                          id="comment"
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          rows={4}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="Tell others about your experience with this product..."
                          required
                        />
                      </div>
                      
                      <div className="flex space-x-4">
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Reviews List */}
                {reviews && reviews.reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            {review.userAvatar ? (
                              <img
                                src={review.userAvatar}
                                alt={review.userName}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-gray-600 font-medium">
                                  {review.userName.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium">{review.userName}</span>
                              {review.verified && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                  Verified Purchase
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              {renderStars(review.rating)}
                              <span className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h5 className="font-semibold mb-2">{review.title}</h5>
                            <p className="text-gray-700 mb-3">{review.comment}</p>
                            
                            <div className="flex items-center space-x-4">
                              <button
                                onClick={() => handleMarkHelpful(review.id)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                                disabled={!token}
                              >
                                👍 Helpful ({review.helpful})
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
}