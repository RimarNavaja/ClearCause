import React from 'react';
import { Star, Edit, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CharityFeedback } from '@/lib/types';

interface CharityFeedbackListProps {
  feedback: CharityFeedback[];
  loading?: boolean;
  onEdit?: (feedback: CharityFeedback) => void;
  onDelete?: (feedbackId: string) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

const CharityFeedbackList: React.FC<CharityFeedbackListProps> = ({
  feedback,
  loading = false,
  onEdit,
  onDelete,
  showActions = false,
  emptyMessage = 'No feedback yet',
}) => {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-16 bg-gray-200 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {emptyMessage}
        </h3>
        <p className="text-sm text-gray-500">
          Feedback from donors will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="w-12 h-12">
                <AvatarImage src={item.donor?.avatarUrl || undefined} />
                <AvatarFallback>
                  {item.donor?.fullName ? getInitials(item.donor.fullName) : 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h4 className="font-semibold">
                      {item.donor?.fullName || 'Anonymous Donor'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                  {showActions && onEdit && onDelete && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Charity Name (if shown) */}
                {item.charity && (
                  <div className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {item.charity.organizationName}
                    </span>
                  </div>
                )}

                {/* Rating */}
                <div className="mb-3">{renderStars(item.rating)}</div>

                {/* Comment */}
                {item.comment && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-foreground/90">{item.comment}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CharityFeedbackList;
