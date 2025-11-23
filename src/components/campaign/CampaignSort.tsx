import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SortOption = 'newest' | 'oldest' | 'most-funded' | 'ending-soon' | 'alphabetical';

interface CampaignSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most-funded', label: 'Most Funded' },
  { value: 'ending-soon', label: 'Ending Soon' },
  { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
];

export const CampaignSort: React.FC<CampaignSortProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <ArrowUpDown className="h-4 w-4 text-gray-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
