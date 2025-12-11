import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Validation schema
const feedbackSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface CharityFeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => void | Promise<void>;
  initialData?: Partial<FeedbackFormData>;
  isLoading?: boolean;
  charityName: string;
}

const CharityFeedbackForm: React.FC<CharityFeedbackFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
  charityName,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: initialData?.rating || 0,
      comment: initialData?.comment || '',
    },
  });

  const rating = watch('rating');

  const handleRatingClick = (value: number) => {
    setValue('rating', value, { shouldValidate: true });
  };

  const renderStars = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingClick(star)}
            className="transition-transform hover:scale-110 focus:outline-none"
            disabled={isLoading}
          >
            <Star
              className={`w-8 h-8 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Charity Name */}
      <div>
        <p className="text-sm text-gray-600">
          Leaving feedback for <span className="font-semibold">{charityName}</span>
        </p>
      </div>

      {/* Rating */}
      <div>
        <Label>Rating *</Label>
        <div className="mt-2">{renderStars()}</div>
        <p className="text-sm text-gray-500 mt-1">Click to rate (1-5 stars)</p>
        {errors.rating && (
          <p className="text-sm text-red-600 mt-1">{errors.rating.message}</p>
        )}
      </div>

      {/* Comment */}
      <div>
        <Label htmlFor="comment">Your Feedback (Optional)</Label>
        <Textarea
          id="comment"
          {...register('comment')}
          placeholder="Share your experience with this charity organization..."
          rows={4}
          className="mt-1"
          disabled={isLoading}
          maxLength={1000}
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-gray-500">
            Help others make informed decisions by sharing your experience
          </p>
          {watch('comment') && (
            <p className="text-xs text-gray-500">
              {watch('comment')?.length || 0}/1000
            </p>
          )}
        </div>
        {errors.comment && (
          <p className="text-sm text-red-600 mt-1">{errors.comment.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || rating === 0}>
          {isLoading ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </Button>
      </div>

      {/* Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-2">Feedback Guidelines</h4>
        <ul className="space-y-1 text-xs text-blue-800">
          <li>• Be honest and constructive in your feedback</li>
          <li>• Focus on your personal experience with the charity</li>
          <li>• Avoid offensive language or personal attacks</li>
          <li>• Your feedback will be published immediately</li>
        </ul>
      </div>
    </form>
  );
};

export default CharityFeedbackForm;
