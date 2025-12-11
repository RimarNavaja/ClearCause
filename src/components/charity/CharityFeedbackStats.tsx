import React from 'react';
import { Star, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CharityFeedbackStats as FeedbackStats } from '@/lib/types';

interface CharityFeedbackStatsProps {
  stats: FeedbackStats | null;
  loading?: boolean;
}

const CharityFeedbackStats: React.FC<CharityFeedbackStatsProps> = ({
  stats,
  loading = false,
}) => {
  if (loading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              star <= Math.round(stats.averageRating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getPercentage = (count: number) => {
    if (stats.totalFeedback === 0) return 0;
    return Math.round((count / stats.totalFeedback) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Rating */}
        <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
          <div className="text-5xl font-bold text-gray-900 mb-2">
            {stats.averageRating.toFixed(1)}
          </div>
          <div className="flex justify-center mb-2">{renderStars(stats.averageRating)}</div>
          <p className="text-sm text-gray-600">
            Based on {stats.totalFeedback} {stats.totalFeedback === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Rating Distribution</h4>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
            const percentage = getPercentage(count);

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-16 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">With Comments</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.feedbackWithComments}
            </p>
            <p className="text-xs text-blue-700">
              {stats.totalFeedback > 0
                ? `${Math.round((stats.feedbackWithComments / stats.totalFeedback) * 100)}%`
                : '0%'}
            </p>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-4 h-4 text-green-600" />
              <p className="text-sm font-medium text-green-900">Positive</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.ratingDistribution[4] + stats.ratingDistribution[5]}
            </p>
            <p className="text-xs text-green-700">
              {stats.totalFeedback > 0
                ? `${Math.round(
                    ((stats.ratingDistribution[4] + stats.ratingDistribution[5]) /
                      stats.totalFeedback) *
                      100
                  )}%`
                : '0%'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CharityFeedbackStats;
