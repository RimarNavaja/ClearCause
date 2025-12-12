/**
 * Activity Log Service
 * Manages audit trail data retrieval and formatting for the Activity Log feature
 */

import { supabase } from '../lib/supabase';
import {
  ActivityLogEntry,
  ActivityLogFilters,
  PaginatedResponse,
  PaginationParams,
  ClearCauseError,
} from '../lib/types';
import { withErrorHandling, handleSupabaseError } from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { validateData, paginationSchema } from '../utils/validation';

/**
 * Get all activity logs with filters and pagination
 */
export const getActivityLogs = withErrorHandling(async (
  filters: ActivityLogFilters = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<ActivityLogEntry>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access activity logs', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        role
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Apply search (searches across action and entity_type)
  if (filters.search) {
    query = query.or(`action.ilike.%${filters.search}%,entity_type.ilike.%${filters.search}%`);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform to ActivityLogEntry format
  const activityLogs: ActivityLogEntry[] = (data || []).map(log => ({
    id: log.id,
    userId: log.user_id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at,
    user: log.profiles ? {
      id: log.profiles.id,
      email: log.profiles.email,
      fullName: log.profiles.full_name,
      role: log.profiles.role,
    } : undefined,
  }));

  return createPaginatedResponse(activityLogs, count || 0, validatedParams);
});

/**
 * Get activity logs for Platform Settings changes only
 */
export const getSettingsActivityLogs = withErrorHandling(async (
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<ActivityLogEntry>> => {
  return getActivityLogs(
    { entityType: 'platform_setting' },
    params,
    currentUserId
  );
});

/**
 * Get activity logs for Charity Verification actions only
 */
export const getVerificationActivityLogs = withErrorHandling(async (
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<ActivityLogEntry>> => {
  return getActivityLogs(
    { 
      action: 'CHARITY_VERIFICATION_UPDATE'
    },
    params,
    currentUserId
  );
});

/**
 * Get activity logs for a specific charity (Personalized View)
 * Allows charities to see actions on their own account/campaigns, including Admin actions.
 */
export const getCharityActivityLogs = withErrorHandling(async (
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<ActivityLogEntry>> => {
  // Check if current user is a charity
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'charity') {
    throw new ClearCauseError('FORBIDDEN', 'Only approved charities can access their activity logs', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit } = validatedParams;
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.rpc('get_charity_audit_logs', {
    p_limit: limit,
    p_offset: offset
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform to ActivityLogEntry format
  const activityLogs: ActivityLogEntry[] = (data || []).map((log: any) => ({
    id: log.id,
    userId: 'system', // The RPC handles visibility, we focus on the actor info below
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    createdAt: log.created_at,
    user: {
      id: 'unknown', // RPC doesn't return ID to protect privacy if needed, but returns email
      email: log.actor_email,
      fullName: log.actor_email, // Use email as name if name unavailable
      role: log.actor_role,
    },
  }));

  // We don't get a total count from the RPC efficiently without a separate query
  // For now, we'll return the current page count or simple logic
  // A real implementation might add a count output to the RPC
  const estimatedCount = activityLogs.length < limit ? (page - 1) * limit + activityLogs.length : (page * limit) + 1; // Simple estimation

  return createPaginatedResponse(activityLogs, estimatedCount, validatedParams);
});

/**
 * Get recent critical activity logs (Platform Settings + Verifications)
 * Used for dashboard display
 */
export const getRecentCriticalActivity = withErrorHandling(async (
  limit: number = 10,
  currentUserId: string
): Promise<ActivityLogEntry[]> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access activity logs', 403);
  }

  // Query for recent activity (all types)
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        role
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform to ActivityLogEntry format
  const activityLogs: ActivityLogEntry[] = (data || []).map(log => ({
    id: log.id,
    userId: log.user_id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    details: log.details,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at,
    user: log.profiles ? {
      id: log.profiles.id,
      email: log.profiles.email,
      fullName: log.profiles.full_name,
      role: log.profiles.role,
    } : undefined,
  }));

  return activityLogs;
});

/**
 * Get unique action types from audit logs (for filter dropdown)
 */
export const getUniqueActionTypes = withErrorHandling(async (
  currentUserId: string
): Promise<string[]> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access activity logs', 403);
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('action')
    .order('action');

  if (error) {
    throw handleSupabaseError(error);
  }

  // Get unique action values
  const uniqueActions = [...new Set((data || []).map(log => log.action))];
  return uniqueActions;
});

/**
 * Format action name for display
 */
export const formatActionName = (action: string): string => {
  // Convert snake_case or UPPER_CASE to Title Case
  return action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Get icon and color for action type
 */
export const getActionStyle = (action: string): { icon: string; color: string } => {
  const actionLower = action.toLowerCase();

  if (actionLower.includes('override')) {
    return { icon: 'AlertTriangle', color: 'text-orange-600' };
  }
  
  if (actionLower.includes('withdrawal')) {
    return { icon: 'DollarSign', color: 'text-green-600' };
  }
  
  if (actionLower.includes('ban') || actionLower.includes('unban')) {
    return { icon: 'Ban', color: 'text-red-600' };
  }

  if (actionLower.includes('login') || actionLower.includes('signin')) {
    return { icon: 'LogIn', color: 'text-blue-500' };
  }

  if (actionLower.includes('approve')) {
    return { icon: 'CheckCircle', color: 'text-green-600' };
  }
  
  if (actionLower.includes('reject')) {
    return { icon: 'XCircle', color: 'text-red-600' };
  }
  
  if (actionLower.includes('update') || actionLower.includes('edit')) {
    return { icon: 'Edit', color: 'text-blue-600' };
  }
  
  if (actionLower.includes('create')) {
    return { icon: 'Plus', color: 'text-green-600' };
  }
  
  if (actionLower.includes('delete')) {
    return { icon: 'Trash2', color: 'text-red-600' };
  }
  
  if (actionLower.includes('verification')) {
    return { icon: 'Shield', color: 'text-orange-600' };
  }
  
  if (actionLower.includes('setting')) {
    return { icon: 'Settings', color: 'text-purple-600' };
  }

  return { icon: 'Activity', color: 'text-gray-600' };
};

/**
 * Export activity logs to CSV format
 */
export const exportActivityLogsToCSV = (logs: ActivityLogEntry[]): string => {
  const headers = ['Timestamp', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details'];
  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = [
      log.createdAt,
      log.user?.fullName || log.user?.email || log.userId,
      log.action,
      log.entityType,
      log.entityId || '',
      JSON.stringify(log.details || {}).replace(/,/g, ';'), // Escape commas in JSON
    ];
    csvRows.push(row.map(field => `"${field}"`).join(','));
  });

  return csvRows.join('\n');
};
