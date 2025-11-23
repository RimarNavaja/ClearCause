/**
 * Category Service
 * Handles campaign category operations
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, ClearCauseError } from '../lib/types';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';

export interface CampaignCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all active campaign categories
 */
export const getActiveCategories = withErrorHandling(async (): Promise<ApiResponse<CampaignCategory[]>> => {
  const { data, error } = await supabase
    .from('campaign_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  const categories = (data || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    displayOrder: cat.display_order,
    isActive: cat.is_active,
    createdAt: cat.created_at,
    updatedAt: cat.updated_at,
  }));

  return createSuccessResponse(categories);
});

/**
 * Get category by ID
 */
export const getCategoryById = withErrorHandling(async (categoryId: string): Promise<ApiResponse<CampaignCategory>> => {
  const { data, error } = await supabase
    .from('campaign_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('CATEGORY_NOT_FOUND', 'Category not found', 404);
  }

  return createSuccessResponse({
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    icon: data.icon,
    color: data.color,
    displayOrder: data.display_order,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

/**
 * Get category by slug
 */
export const getCategoryBySlug = withErrorHandling(async (slug: string): Promise<ApiResponse<CampaignCategory>> => {
  const { data, error } = await supabase
    .from('campaign_categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('CATEGORY_NOT_FOUND', 'Category not found', 404);
  }

  return createSuccessResponse({
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    icon: data.icon,
    color: data.color,
    displayOrder: data.display_order,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});
