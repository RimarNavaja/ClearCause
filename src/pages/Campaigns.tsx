import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CampaignGrid from '@/components/ui/campaign/CampaignGrid';
import { CampaignSearch } from '@/components/campaign/CampaignSearch';
import { CampaignFilters } from '@/components/campaign/CampaignFilters';
import { CampaignSort, SortOption } from '@/components/campaign/CampaignSort';
import { Search, Filter, Check, X, SlidersHorizontal, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as campaignService from '@/services/campaignService';
import * as categoryService from '@/services/categoryService';
import { Campaign } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { debounce } from '@/utils/helpers';

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string; icon?: string; color?: string }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['active']);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { user } = useAuth();

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await categoryService.getActiveCategories();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Load campaigns from backend
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        category: selectedCategories.length > 0 ? selectedCategories : undefined,
        search: searchQuery || undefined,
        status: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      };

      const params = {
        page: currentPage,
        limit: 12,
        sortBy: sortBy === 'newest' ? 'created_at' :
                sortBy === 'oldest' ? 'created_at' :
                sortBy === 'most-funded' ? 'current_amount' :
                sortBy === 'ending-soon' ? 'end_date' :
                sortBy === 'alphabetical' ? 'title' : 'created_at',
        sortOrder: sortBy === 'oldest' ? 'asc' :
                   sortBy === 'alphabetical' ? 'asc' : 'desc',
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

  // Load campaigns when filters change
  useEffect(() => {
    loadCampaigns();
  }, [selectedCategories, selectedStatuses, searchQuery, sortBy, currentPage]);

  // Handle category filter toggle
  const handleCategoryToggle = (categorySlug: string) => {
    setSelectedCategories(prev =>
      prev.includes(categorySlug)
        ? prev.filter(c => c !== categorySlug)
        : [...prev, categorySlug]
    );
    setCurrentPage(1);
  };

  // Handle status filter toggle
  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Clear search
  const handleSearchClear = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses(['active']);
    setSearchQuery("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    count += selectedCategories.length;
    if (selectedStatuses.length !== 1 || !selectedStatuses.includes('active')) {
      count += selectedStatuses.length;
    }
    if (searchQuery) count++;
    if (sortBy !== "newest") count++;
    return count;
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Page Header */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 font-redhatbold hover:bg-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 font-robotobold">Browse Campaigns</h1>
            <p className="mt-2 text-lg text-gray-600 font-poppinsregular">
              Discover verified campaigns and track your impact in real-time
            </p>
          </div>
        </section>

        {/* Search and Sort */}
        <section className="bg-gray-50 border-b font-poppinsregular">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-2xl">
                <CampaignSearch
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onClear={handleSearchClear}
                />
              </div>

              {/* Sort and Mobile Filter Toggle */}
              <div className="flex items-center gap-4">
                {/* Mobile Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
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

                {/* Sort Dropdown */}
                <div className="hidden sm:block">
                  <CampaignSort value={sortBy} onChange={setSortBy} />
                </div>

                {/* Clear All Filters Button */}
                {getActiveFilterCount() > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="hidden lg:flex">
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Sort */}
            {showMobileFilters && (
              <div className="sm:hidden mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <CampaignSort value={sortBy} onChange={setSortBy} />
              </div>
            )}
          </div>
        </section>

        {/* Campaign Grid with Sidebar Filters */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Desktop Filter Sidebar */}
            <aside className="hidden lg:block">
              <CampaignFilters
                categories={categories}
                selectedCategories={selectedCategories}
                selectedStatuses={selectedStatuses}
                onCategoryToggle={handleCategoryToggle}
                onStatusToggle={handleStatusToggle}
                onClearFilters={clearFilters}
                activeFilterCount={getActiveFilterCount()}
              />
            </aside>

            {/* Mobile Filter Panel */}
            {showMobileFilters && (
              <div className="lg:hidden col-span-1">
                <CampaignFilters
                  categories={categories}
                  selectedCategories={selectedCategories}
                  selectedStatuses={selectedStatuses}
                  onCategoryToggle={handleCategoryToggle}
                  onStatusToggle={handleStatusToggle}
                  onClearFilters={clearFilters}
                  activeFilterCount={getActiveFilterCount()}
                />
              </div>
            )}

            {/* Main Content */}
            <div className="lg:col-span-3 font-poppinsregular">
              {/* Results Summary */}
              {!loading && (
                <div className="mb-6">
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
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-sm text-gray-500">Active filters:</span>
                      {selectedCategories.map(slug => {
                        const category = categories.find(c => c.slug === slug);
                        return category ? (
                          <Badge key={slug} variant="secondary">
                            {category.icon && `${category.icon} `}{category.name}
                          </Badge>
                        ) : null;
                      })}
                      {selectedStatuses.map(status => (
                        <Badge key={status} variant="secondary">
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      ))}
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
              />
            </div>
          </div>
        </section>

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
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
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Campaigns;