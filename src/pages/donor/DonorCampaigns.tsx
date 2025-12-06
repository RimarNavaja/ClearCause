import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DonorLayout from '@/components/layout/DonorLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CampaignGrid from '@/components/ui/campaign/CampaignGrid';
import { Search, Filter, Check, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as campaignService from '@/services/campaignService';
import * as donationService from '@/services/donationService';
import { Campaign } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { debounce } from '@/utils/helpers';

const CATEGORIES = [
  "All Categories",
  "Clean Water",
  "Education",
  "Food Security",
  "Healthcare",
  "Environment",
  "Disaster Relief",
  "Animal Welfare",
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_raised', label: 'Most Raised' },
  { value: 'least_raised', label: 'Least Raised' },
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'recommended', label: 'Recommended for You' },
];

const DonorCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donatedCampaignIds, setDonatedCampaignIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { user } = useAuth();

  // Check if user is a donor (has donor role)
  const isDonor = user?.role === 'donor';

  // Debounced search function
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, 500);

  // Load donor's donation history to highlight supported campaigns
  const loadDonationHistory = async () => {
    if (!user?.id) return;

    try {
      const result = await donationService.getDonationsByDonor(
        user.id,
        { page: 1, limit: 100 },
        user.id
      );

      if (result.success && result.data) {
        const campaignIds = new Set(
          result.data
            .filter((d: any) => d.campaign?.id && d.status === 'completed')
            .map((d: any) => d.campaign.id)
        );
        setDonatedCampaignIds(campaignIds);
      }
    } catch (err) {
      console.error('Error loading donation history:', err);
    }
  };

  // Load campaigns from backend
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        category: selectedCategory !== "All Categories" ? [selectedCategory] : undefined,
        search: searchQuery || undefined,
        status: ['active'],
      };

      const params = {
        page: currentPage,
        limit: 12,
        sortBy: sortBy === 'newest' ? 'created_at' :
                sortBy === 'oldest' ? 'created_at' :
                sortBy === 'most_raised' ? 'current_amount' :
                sortBy === 'least_raised' ? 'current_amount' : 'created_at',
        sortOrder: sortBy === 'oldest' || sortBy === 'least_raised' ? 'asc' : 'desc',
      };

      const result = await campaignService.getAllCampaigns(filters, params);

      if (result.success && result.data) {
        setCampaigns(result.data);
        setTotalPages(result.pagination.totalPages);
        setTotalCount(result.pagination.total);
      } else {
        setError(result.error || 'Failed to load campaigns');
      }
    } catch (err) {
      setError('An unexpected error occurred while loading campaigns');
      console.error('Campaign loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load donation history once on mount
  useEffect(() => {
    loadDonationHistory();
  }, [user?.id]);

  // Load campaigns when filters change
  useEffect(() => {
    loadCampaigns();
  }, [selectedCategory, searchQuery, verifiedOnly, sortBy, currentPage]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategory("All Categories");
    setSearchQuery("");
    setSearchInput("");
    setVerifiedOnly(false);
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== "All Categories") count++;
    if (searchQuery) count++;
    if (verifiedOnly) count++;
    if (sortBy !== "newest") count++;
    return count;
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Use different layouts based on user role
  const PageContent = () => (
    <div className={isDonor ? "space-y-6" : "space-y-6"}>
        {/* Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-poppinsregular">
            Discover verified campaigns and make a difference. Campaigns you've supported are highlighted with a badge.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchInput}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-4">
              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {getActiveFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>

              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-4">
                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort By */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Verified Only Toggle */}
                <Button
                  variant={verifiedOnly ? "default" : "outline"}
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className="whitespace-nowrap"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Verified Only
                </Button>

                {/* Clear Filters */}
                {getActiveFilterCount() > 0 && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Filters Panel */}
          {showFilters && (
            <div className="lg:hidden mt-4 pt-4 border-t space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
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

              <div className="flex items-center justify-between">
                <Button
                  variant={verifiedOnly ? "default" : "outline"}
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className="flex-1 mr-2"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Verified Only
                </Button>

                {getActiveFilterCount() > 0 && (
                  <Button variant="ghost" onClick={clearFilters} className="flex-1 ml-2">
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {!loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {totalCount > 0 ? (
                <>
                  Showing {((currentPage - 1) * 12) + 1}-{Math.min(currentPage * 12, totalCount)} of {totalCount} campaigns
                  {searchQuery && (
                    <span className="ml-2">
                      for "<strong>{searchQuery}</strong>"
                    </span>
                  )}
                </>
              ) : (
                'No campaigns found'
              )}
            </p>

            {/* Active Filters Display */}
            {getActiveFilterCount() > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                <div className="flex gap-1">
                  {selectedCategory !== "All Categories" && (
                    <Badge variant="secondary">{selectedCategory}</Badge>
                  )}
                  {verifiedOnly && (
                    <Badge variant="secondary">Verified</Badge>
                  )}
                  {sortBy !== "newest" && (
                    <Badge variant="secondary">
                      {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campaign Grid */}
        <CampaignGrid
          campaigns={campaigns}
          loading={loading}
          error={error}
          showRealTimeUpdates={true}
          donatedCampaignIds={donatedCampaignIds}
        />

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>

            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                const isActive = page === currentPage;

                return (
                  <Button
                    key={page}
                    variant={isActive ? "default" : "outline"}
                    onClick={() => handlePageChange(page)}
                    className="w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                );
              })}

              {totalPages > 5 && (
                <>
                  {totalPages > 6 && <span className="px-2 text-gray-500">...</span>}
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    onClick={() => handlePageChange(totalPages)}
                    className="w-10 h-10 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>

            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
  );

  // Return with appropriate layout
  if (isDonor) {
    return (
      <DonorLayout title="Browse Campaigns">
        <PageContent />
      </DonorLayout>
    );
  }

  // Public view (non-donor users)
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-poppinsregular">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 font-robotobold">Browse Campaigns</h1>
            <p className="mt-2 text-gray-600">
              Discover verified campaigns and make a difference.
            </p>
          </div>
          <PageContent />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DonorCampaigns;
