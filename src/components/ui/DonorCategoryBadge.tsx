import React from 'react';
import { User as UserIcon, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Assuming shadcn/ui badge component
import { User } from '@/lib/types';

interface DonorCategoryBadgeProps {
  user: Pick<User, 'donorCategory' | 'donorOrganizationName' | 'fullName'>;
  isAnonymous?: boolean;
  size?: 'sm' | 'md';
}

export const formatDonorName = (user: Pick<User, 'donorCategory' | 'donorOrganizationName' | 'fullName'>, isAnonymous?: boolean): string => {
  if (isAnonymous) {
    return 'Anonymous';
  }
  if (user.donorCategory === 'organization' && user.donorOrganizationName) {
    return user.donorOrganizationName;
  }
  return user.fullName || 'Anonymous'; // Fallback if fullName is missing
};

export const DonorCategoryBadge: React.FC<DonorCategoryBadgeProps> = ({ user, isAnonymous, size = 'md' }) => {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (isAnonymous) {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-700 ${textSize}`}>
        <UserIcon className={`${iconSize} mr-1`} />
        Anonymous
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`bg-blue-100 text-blue-700 ${textSize}`}>
      {user.donorCategory === 'organization' ? (
        <Building2 className={`${iconSize} mr-1`} />
      ) : (
        <UserIcon className={`${iconSize} mr-1`} />
      )}
      {user.donorCategory === 'organization' ? 'Organization' : 'Individual'}
    </Badge>
  );
};
