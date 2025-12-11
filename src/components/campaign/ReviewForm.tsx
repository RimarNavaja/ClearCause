import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import * as reviewService from '@/services/reviewService';

// Form validation schema
const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  campaignId: string;
  onSuccess?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ campaignId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const handleRatingClick = (value: number) => {
    setRating(value);
    setValue('rating', value, { shouldValidate: true });
  };

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to submit a review',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await reviewService.createReview(
        {
          campaignId,
          rating: data.rating,
          comment: data.comment || undefined,
        },
        user.id
      );

      if (result.success) {
        toast({
          title: 'Review Submitted',
          description: result.message || 'Your review will be visible after admin approval',
        });
        reset();
        setRating(0);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.error || 'Failed to submit review');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 border rounded-lg bg-card font-poppinsregular">
      <div>
        <h3 className="text-lg font-robotobold mb-4">Leave a Review</h3>

        <div className="space-y-4">
          {/* Rating Input */}
          <div>
            <Label htmlFor="rating" className="mb-2">
              Your Rating *
            </Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRatingClick(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      value <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} {rating === 1 ? 'star' : 'stars'}
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive mt-1">{errors.rating.message}</p>
            )}
          </div>

          {/* Comment Input */}
          <div>
            <Label htmlFor="comment" className="mb-2">
              Your Review (Optional)
            </Label>
            <Textarea
              id="comment"
              {...register('comment')}
              placeholder="Share your experience with this campaign..."
              rows={4}
              className="resize-none"
            />
            {errors.comment && (
              <p className="text-sm text-destructive mt-1">{errors.comment.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || rating === 0}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Your review will be reviewed by our admin team before it appears publicly.
      </p>
    </form>
  );
};

export default ReviewForm;
