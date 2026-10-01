"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface ProductReviewsProps {
  productId: string;
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  verified: boolean;
  title: string;
  comment: string;
  size: string;
  helpful: number;
  images?: string[];
}

// Mock reviews data - in real app this would come from API
const mockReviews: Review[] = [
  {
    id: "1",
    userName: "Priya S.",
    rating: 5,
    date: "2024-01-15",
    verified: true,
    title: "Beautiful quality, exceeded expectations!",
    comment: "The fabric quality is amazing and the handblock print is so intricate. Fits perfectly and the color is exactly as shown. Received so many compliments wearing this.",
    size: "M",
    helpful: 12,
    images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80"]
  },
  {
    id: "2", 
    userName: "Meera K.",
    rating: 4,
    date: "2024-01-10",
    verified: true,
    title: "Good quality but runs slightly large",
    comment: "Love the fabric and the craftsmanship. Only issue is it runs a bit large so I'd suggest sizing down. The dupatta is gorgeous with beautiful tassels.",
    size: "L",
    helpful: 8
  },
  {
    id: "3",
    userName: "Anita M.",
    rating: 5,
    date: "2024-01-05", 
    verified: true,
    title: "Perfect for festive occasions",
    comment: "Wore this for Diwali celebrations and it was perfect. The mul cotton is so comfortable even for long hours. The packaging was also very premium.",
    size: "S",
    helpful: 15
  }
];

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'rating'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // In real app, this would be filtered/sorted data from API
  const reviews = mockReviews.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'helpful') return b.helpful - a.helpful;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0;
  });

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    stars: rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
  }));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Reviews Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Overall Rating */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <div>
              <div className="flex items-center mb-1">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill={i < Math.floor(averageRating) ? "#fbbf24" : "#e5e7eb"}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <div className="text-sm text-gray-600">{reviews.length} reviews</div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Rating Breakdown</h4>
          <div className="space-y-2">
            {ratingDistribution.map((rating) => (
              <div key={rating.stars} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8">{rating.stars}★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${rating.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8">{rating.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-gray-200">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterRating(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filterRating === null ? 'bg-[#881337] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              onClick={() => setFilterRating(rating)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                filterRating === rating ? 'bg-[#881337] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {rating}★ ({ratingDistribution.find(r => r.stars === rating)?.count || 0})
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#881337] focus:border-transparent"
        >
          <option value="newest">Newest First</option>
          <option value="helpful">Most Helpful</option>
          <option value="rating">Highest Rating</option>
        </select>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews
          .filter(review => filterRating === null || review.rating === filterRating)
          .map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-xl p-6 bg-white"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#881337] to-[#b91c1c] rounded-full flex items-center justify-center text-white font-semibold">
                    {review.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{review.userName}</span>
                      {review.verified && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg 
                            key={i} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill={i < review.rating ? "#fbbf24" : "#e5e7eb"}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">• {formatDate(review.date)} • Size: {review.size}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{review.title}</h4>
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                
                {/* Review Images */}
                {review.images && (
                  <div className="flex gap-2">
                    {review.images.map((image, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={image}
                        alt={`Review image ${imgIndex + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Review Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 10v12l4-4 4 4V10M7 10l5-7 5 7M7 10H3"/>
                  </svg>
                  Helpful ({review.helpful})
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900 transition">
                  Report
                </button>
              </div>
            </motion.div>
          ))}
      </div>

      {/* Write Review Button */}
      <div className="text-center pt-8 border-t border-gray-200">
        <button className="bg-[#881337] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#701a35] transition">
          Write a Review
        </button>
      </div>
    </div>
  );
}