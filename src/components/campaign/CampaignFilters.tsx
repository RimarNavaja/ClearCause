import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

export interface FilterOptions {
  categories: string[];
  status: string[];
}

interface CampaignFiltersProps {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  }>;
  selectedCategories: string[];
  selectedStatuses: string[];
  onCategoryToggle: (categorySlug: string) => void;
  onStatusToggle: (status: string) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "text-green-500" },
  { value: "pending", label: "Pending", color: "text-yellow-500" },
  { value: "completed", label: "Completed", color: "text-blue-500" },
  { value: "paused", label: "Paused", color: "text-gray-500" },
];

export const CampaignFilters: React.FC<CampaignFiltersProps> = ({
  categories,
  selectedCategories,
  selectedStatuses,
  onCategoryToggle,
  onStatusToggle,
  onClearFilters,
  activeFilterCount,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filters */}
        <div>
          <h3 className="font-medium text-sm text-gray-700 mb-3">Categories</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.slug)}
                  onChange={() => onCategoryToggle(category.slug)}
                  className="rounded border-gray-300 text-clearcause-primary focus:ring-clearcause-primary"
                />
                <span className="text-sm flex items-center gap-1.5">
                  {category.icon && <span>{category.icon}</span>}
                  <span>{category.name}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div>
          <h3 className="font-medium text-sm text-gray-700 mb-3">Status</h3>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((status) => (
              <label
                key={status.value}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status.value)}
                  onChange={() => onStatusToggle(status.value)}
                  className="rounded border-gray-300 text-clearcause-primary focus:ring-clearcause-primary"
                />
                <span
                  className={`text-sm flex items-center gap-2 ${status.color}`}
                >
                  {status.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
