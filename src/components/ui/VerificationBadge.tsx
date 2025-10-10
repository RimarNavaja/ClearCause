import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';

interface VerificationBadgeProps {
  status: VerificationStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md'
}) => {
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';

  switch (status) {
    case 'approved':
      return (
        <Badge
          variant="secondary"
          className={`bg-green-100 text-green-800 ${textSize}`}
        >
          {showIcon && <CheckCircle className={`${iconSize} mr-1`} />}
          ✅ Verified
        </Badge>
      );
    case 'pending':
      return (
        <Badge
          variant="secondary"
          className={`bg-blue-100 text-blue-800 ${textSize}`}
        >
          {showIcon && <Clock className={`${iconSize} mr-1`} />}
          ⏳ Pending
        </Badge>
      );
    case 'under_review':
      return (
        <Badge
          variant="secondary"
          className={`bg-yellow-100 text-yellow-800 ${textSize}`}
        >
          {showIcon && <AlertTriangle className={`${iconSize} mr-1`} />}
          ⏳ Under Review
        </Badge>
      );
    case 'rejected':
      return (
        <Badge
          variant="secondary"
          className={`bg-red-100 text-red-800 ${textSize}`}
        >
          {showIcon && <XCircle className={`${iconSize} mr-1`} />}
          ❌ Rejected
        </Badge>
      );
    case 'resubmission_required':
      return (
        <Badge
          variant="secondary"
          className={`bg-orange-100 text-orange-800 ${textSize}`}
        >
          {showIcon && <AlertTriangle className={`${iconSize} mr-1`} />}
          ⚠️ Resubmission Required
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={textSize}>
          Unknown
        </Badge>
      );
  }
};

export default VerificationBadge;
