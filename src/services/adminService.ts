/**
 * Admin Service
 * Handles administrative operations, audit logging, and system management
 */

import { supabase } from '../lib/supabase';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  AuditLog,
  User,
  Campaign,
  Donation,
  ClearCauseError,
  PlatformSetting,
  CampaignCategory
} from '../lib/types';
import { validateData, paginationSchema } from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import * as milestoneService from './milestoneService';

/**
 * Log audit event
 */
export const logAuditEvent = withErrorHandling(async (
  userId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, any> | null,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

  if (error) {
    // Silently handle audit log errors to prevent console spam
    // This is expected in development environments with limited RLS permissions
    if (process.env.NODE_ENV === 'development') {
      console.debug('Audit logging disabled due to permissions:', error.message);
    }
    // Don't throw error to prevent breaking the main operation
  }
});

/**
 * Get platform statistics
 */
export const getPlatformStatistics = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{
  totalUsers: number;
  totalCharities: number;
  totalCampaigns: number;
  totalDonations: number;
  totalAmountRaised: number;
  activeUsers: number;
  activeCampaigns: number;
  pendingVerifications: number;
  // Growth metrics
  newUsersThisMonth: number;
  newCampaignsThisMonth: number;
  donationsThisMonth: number;
  amountRaisedThisMonth: number;
  // Performance metrics
  averageDonationAmount: number;
  completedCampaigns: number;
  failedDonations: number;
  // Campaign status breakdown
  draftCampaigns: number;
  pausedCampaigns: number;
  completedCampaignsList: number;
}>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access platform statistics', 403);
  }

  // Calculate date for "this month"
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Get all statistics in parallel
  const [
    usersResult,
    charitiesResult,
    campaignsResult,
    donationsResult,
    activeCampaignsResult,
    pendingVerificationsResult,
    newUsersResult,
    newCampaignsResult,
    thisMonthDonationsResult,
    draftCampaignsResult,
    pausedCampaignsResult,
    completedCampaignsResult,
  ] = await Promise.allSettled([
    // Total users
    supabase.from('profiles').select('id', { count: 'exact', head: true }),

    // Total charities
    supabase.from('charities').select('id', { count: 'exact', head: true }),

    // Total campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }),

    // Total donations and amount
    supabase.from('donations').select('amount, status'),

    // Active campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),

    // Pending verifications
    supabase.from('charities').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),

    // New users this month
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth),

    // New campaigns this month
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth),

    // Donations this month
    supabase.from('donations').select('amount, status').gte('donated_at', firstDayOfMonth),

    // Draft campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'draft'),

    // Paused campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'paused'),

    // Completed campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  ]);

  // Process basic results
  const totalUsers = usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0;
  const totalCharities = charitiesResult.status === 'fulfilled' ? charitiesResult.value.count || 0 : 0;
  const totalCampaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.count || 0 : 0;

  // Process donations
  let totalDonations = 0;
  let totalAmountRaised = 0;
  let failedDonations = 0;
  let completedDonationAmount = 0;
  let completedDonationCount = 0;

  if (donationsResult.status === 'fulfilled' && donationsResult.value.data) {
    const donations = donationsResult.value.data;
    totalDonations = donations.length;

    donations.forEach(d => {
      if (d.status === 'completed') {
        completedDonationAmount += d.amount;
        completedDonationCount++;
      } else if (d.status === 'failed') {
        failedDonations++;
      }
    });

    totalAmountRaised = completedDonationAmount;
  }

  // Calculate average donation
  const averageDonationAmount = completedDonationCount > 0 ? completedDonationAmount / completedDonationCount : 0;

  // Process growth metrics
  const newUsersThisMonth = newUsersResult.status === 'fulfilled' ? newUsersResult.value.count || 0 : 0;
  const newCampaignsThisMonth = newCampaignsResult.status === 'fulfilled' ? newCampaignsResult.value.count || 0 : 0;

  let donationsThisMonth = 0;
  let amountRaisedThisMonth = 0;
  if (thisMonthDonationsResult.status === 'fulfilled' && thisMonthDonationsResult.value.data) {
    const monthDonations = thisMonthDonationsResult.value.data;
    donationsThisMonth = monthDonations.filter(d => d.status === 'completed').length;
    amountRaisedThisMonth = monthDonations
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + d.amount, 0);
  }

  // Campaign status breakdown
  const activeCampaigns = activeCampaignsResult.status === 'fulfilled' ? activeCampaignsResult.value.count || 0 : 0;
  const draftCampaigns = draftCampaignsResult.status === 'fulfilled' ? draftCampaignsResult.value.count || 0 : 0;
  const pausedCampaigns = pausedCampaignsResult.status === 'fulfilled' ? pausedCampaignsResult.value.count || 0 : 0;
  const completedCampaignsList = completedCampaignsResult.status === 'fulfilled' ? completedCampaignsResult.value.count || 0 : 0;

  // Pending verifications
  const pendingVerifications = pendingVerificationsResult.status === 'fulfilled' ? pendingVerificationsResult.value.count || 0 : 0;

  // Active users calculation skipped due to audit_logs RLS restrictions
  const activeUsers = 0;

  return createSuccessResponse({
    totalUsers,
    totalCharities,
    totalCampaigns,
    totalDonations,
    totalAmountRaised,
    activeUsers,
    activeCampaigns,
    pendingVerifications,
    // Growth metrics
    newUsersThisMonth,
    newCampaignsThisMonth,
    donationsThisMonth,
    amountRaisedThisMonth,
    // Performance metrics
    averageDonationAmount,
    completedCampaigns: completedCampaignsList,
    failedDonations,
    // Campaign status breakdown
    draftCampaigns,
    pausedCampaigns,
    completedCampaignsList,
  });
});

/**
 * Get audit logs
 */
export const getAuditLogs = withErrorHandling(async (
  filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<AuditLog>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access audit logs', 403);
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

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const auditLogs = data.map(log => ({
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

  return createPaginatedResponse(auditLogs, count || 0, validatedParams);
});

/**
 * Get system health status
 */
export const getSystemHealth = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{
  database: boolean;
  storage: boolean;
  auth: boolean;
  overall: 'healthy' | 'degraded' | 'down';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    responseTime?: number;
  }>;
}>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access system health', 403);
  }

  const checks = [];
  let healthyCount = 0;

  // Database check
  const dbStart = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const dbTime = Date.now() - dbStart;
    
    if (!error) {
      checks.push({
        name: 'Database',
        status: 'pass' as const,
        responseTime: dbTime,
      });
      healthyCount++;
    } else {
      checks.push({
        name: 'Database',
        status: 'fail' as const,
        message: error.message,
        responseTime: dbTime,
      });
    }
  } catch (error) {
    checks.push({
      name: 'Database',
      status: 'fail' as const,
      message: 'Database connection failed',
      responseTime: Date.now() - dbStart,
    });
  }

  // Auth check
  const authStart = Date.now();
  try {
    const { error } = await supabase.auth.getSession();
    const authTime = Date.now() - authStart;
    
    if (!error) {
      checks.push({
        name: 'Authentication',
        status: 'pass' as const,
        responseTime: authTime,
      });
      healthyCount++;
    } else {
      checks.push({
        name: 'Authentication',
        status: 'fail' as const,
        message: error.message,
        responseTime: authTime,
      });
    }
  } catch (error) {
    checks.push({
      name: 'Authentication',
      status: 'fail' as const,
      message: 'Auth service failed',
      responseTime: Date.now() - authStart,
    });
  }

  // Storage check
  const storageStart = Date.now();
  try {
    const { error } = await supabase.storage.listBuckets();
    const storageTime = Date.now() - storageStart;
    
    if (!error) {
      checks.push({
        name: 'Storage',
        status: 'pass' as const,
        responseTime: storageTime,
      });
      healthyCount++;
    } else {
      checks.push({
        name: 'Storage',
        status: 'fail' as const,
        message: error.message,
        responseTime: storageTime,
      });
    }
  } catch (error) {
    checks.push({
      name: 'Storage',
      status: 'fail' as const,
      message: 'Storage service failed',
      responseTime: Date.now() - storageStart,
    });
  }

  // Determine overall health
  let overall: 'healthy' | 'degraded' | 'down';
  if (healthyCount === checks.length) {
    overall = 'healthy';
  } else if (healthyCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'down';
  }

  return createSuccessResponse({
    database: checks.find(c => c.name === 'Database')?.status === 'pass',
    storage: checks.find(c => c.name === 'Storage')?.status === 'pass',
    auth: checks.find(c => c.name === 'Authentication')?.status === 'pass',
    overall,
    checks,
  });
});

/**
 * Get recent activity summary
 */
export const getRecentActivity = withErrorHandling(async (
  limit: number = 50,
  currentUserId: string
): Promise<ApiResponse<Array<{
  id: string;
  type: 'user_signup' | 'donation' | 'campaign_created' | 'verification' | 'other';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}>>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access recent activity', 403);
  }

  // Note: audit_logs table has RLS restrictions in development
  // Return empty array to avoid console errors
  // TODO: Enable when audit_logs RLS policies are configured for admin access

  // Uncomment when audit_logs is accessible:
  // const { data: auditLogs, error: auditError } = await supabase
  //   .from('audit_logs')
  //   .select(`
  //     *,
  //     profiles:user_id (
  //       full_name,
  //       email
  //     )
  //   `)
  //   .order('created_at', { ascending: false })
  //   .limit(limit);
  //
  // if (auditError) {
  //   throw handleSupabaseError(auditError);
  // }

  const auditLogs: any[] = []; // Empty for now due to RLS restrictions

  const activities = auditLogs.map(log => {
    let type: 'user_signup' | 'donation' | 'campaign_created' | 'verification' | 'other' = 'other';
    let title = log.action;
    let description = `${log.profiles?.full_name || log.profiles?.email || 'Unknown user'} performed ${log.action}`;

    // Categorize and format activities
    switch (log.action) {
      case 'USER_SIGNUP':
        type = 'user_signup';
        title = 'New User Registration';
        description = `${log.profiles?.full_name || log.profiles?.email} signed up`;
        break;

      case 'DONATION_CREATED':
        type = 'donation';
        title = 'New Donation';
        description = `${log.profiles?.full_name || 'Anonymous'} made a donation`;
        break;

      case 'CAMPAIGN_CREATED':
        type = 'campaign_created';
        title = 'New Campaign';
        description = `${log.profiles?.full_name || log.profiles?.email} created a campaign`;
        break;

      case 'CHARITY_VERIFICATION_UPDATE':
        type = 'verification';
        title = 'Charity Verification';
        description = `Charity verification status updated`;
        break;

      default:
        description = `${log.profiles?.full_name || log.profiles?.email || 'System'} performed ${log.action.toLowerCase().replace(/_/g, ' ')}`;
    }

    return {
      id: log.id,
      type,
      title,
      description,
      timestamp: log.created_at,
      userId: log.user_id,
      userName: log.profiles?.full_name || log.profiles?.email,
    };
  });

  return createSuccessResponse(activities);
});

/**
 * Export data for reporting
 */
export const exportData = withErrorHandling(async (
  entityType: 'users' | 'campaigns' | 'donations' | 'audit_logs',
  filters: Record<string, any> = {},
  currentUserId: string
): Promise<ApiResponse<any[]>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can export data', 403);
  }

  let query;
  let data;

  switch (entityType) {
    case 'users':
      query = supabase
        .from('profiles')
        .select('*');
      
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.isVerified !== undefined) {
        query = query.eq('is_verified', filters.isVerified);
      }
      
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data: usersData, error: usersError } = await query;
      if (usersError) throw handleSupabaseError(usersError);
      data = usersData;
      break;

    case 'campaigns':
      query = supabase
        .from('campaigns')
        .select(`
          *,
          charities:charity_id (
            organization_name
          )
        `);
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data: campaignData, error: campaignError } = await query;
      if (campaignError) throw handleSupabaseError(campaignError);
      data = campaignData;
      break;

    case 'donations':
      query = supabase
        .from('donations')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          campaigns:campaign_id (
            title
          )
        `);
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      const { data: donationData, error: donationError } = await query;
      if (donationError) throw handleSupabaseError(donationError);
      data = donationData;
      break;

    case 'audit_logs':
      query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `);
      
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
      
      const { data: auditData, error: auditError } = await query;
      if (auditError) throw handleSupabaseError(auditError);
      data = auditData;
      break;

    default:
      throw new ClearCauseError('INVALID_INPUT', 'Invalid entity type for export', 400);
  }

  // Log the export action
  await logAuditEvent(currentUserId, 'DATA_EXPORT', entityType, null, { 
    entityType, 
    filters, 
    recordCount: data.length 
  });

  return createSuccessResponse(data, `${data.length} records exported successfully`);
});

/**
 * Clean up old audit logs (system maintenance)
 */
export const cleanupAuditLogs = withErrorHandling(async (
  olderThanDays: number = 90,
  currentUserId: string
): Promise<ApiResponse<{ deletedCount: number }>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can perform system maintenance', 403);
  }

  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  // Get count of logs to be deleted
  const { count: deleteCount, error: countError } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoffDate);

  if (countError) {
    throw handleSupabaseError(countError);
  }

  // Delete old logs
  const { error: deleteError } = await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffDate);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Log the cleanup action
  await logAuditEvent(currentUserId, 'AUDIT_LOGS_CLEANUP', 'system', null, {
    olderThanDays,
    deletedCount: deleteCount || 0,
  });

  return createSuccessResponse(
    { deletedCount: deleteCount || 0 },
    `Cleaned up ${deleteCount || 0} old audit log entries`
  );
});

// =========================================
// CHARITY VERIFICATION MANAGEMENT
// =========================================

/**
 * Get pending charity verifications
 */
export const getPendingCharityVerifications = withErrorHandling(async (
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access charity verifications', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'submitted_at', sortOrder = 'asc' } = validatedParams;
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from('charity_verifications')
    .select(`
      *,
      charity:profiles!charity_id (
        id,
        email,
        full_name,
        created_at
      )
    `, { count: 'exact' })
    .eq('status', 'pending')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
    throw handleSupabaseError(error);
  }

  return createPaginatedResponse(data || [], count || 0, validatedParams);
});

/**
 * Get all charity verifications with filters
 */
export const getAllCharityVerifications = withErrorHandling(async (
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access charity verifications', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'submitted_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('charity_verifications')
    .select(`
      *,
      charity:profiles!charity_id (
        id,
        email,
        full_name,
        created_at
      ),
      admin:profiles!admin_id (
        id,
        email,
        full_name
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(`organization_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) {
    query = query.gte('submitted_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('submitted_at', filters.dateTo);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  return createPaginatedResponse(data || [], count || 0, validatedParams);
});

/**
 * Get charity verification by ID
 */
export const getCharityVerificationById = withErrorHandling(async (
  verificationId: string,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access charity verifications', 403);
  }

  const { data, error } = await supabase
    .from('charity_verifications')
    .select(`
      *,
      charity:profiles!charity_id (
        id,
        email,
        full_name,
        phone,
        created_at
      ),
      admin:profiles!admin_id (
        id,
        email,
        full_name
      ),
      documents:verification_documents (
        id,
        document_type,
        document_name,
        file_url,
        file_size,
        mime_type,
        uploaded_at,
        is_verified,
        admin_notes
      )
    `)
    .eq('id', verificationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ClearCauseError('NOT_FOUND', 'Charity verification not found', 404);
    }
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data, 'Charity verification retrieved successfully');
});

/**
 * Approve charity verification
 */
export const approveCharityVerification = withErrorHandling(async (
  verificationId: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can approve verifications', 403);
  }

  // Call the database function
  const { data, error } = await supabase.rpc('approve_charity_verification', {
    verification_id: verificationId,
    admin_id: currentUserId,
    admin_notes: adminNotes
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data, 'Charity verification approved successfully');
});

/**
 * Reject charity verification
 */
export const rejectCharityVerification = withErrorHandling(async (
  verificationId: string,
  rejectionReason: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can reject verifications', 403);
  }

  if (!rejectionReason || rejectionReason.trim().length === 0) {
    throw new ClearCauseError('INVALID_INPUT', 'Rejection reason is required', 400);
  }

  // Call the database function
  const { data, error } = await supabase.rpc('reject_charity_verification', {
    verification_id: verificationId,
    admin_id: currentUserId,
    rejection_reason: rejectionReason,
    admin_notes: adminNotes
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data, 'Charity verification rejected');
});

/**
 * Request charity verification resubmission
 */
export const requestVerificationResubmission = withErrorHandling(async (
  verificationId: string,
  resubmissionReason: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can request resubmission', 403);
  }

  if (!resubmissionReason || resubmissionReason.trim().length === 0) {
    throw new ClearCauseError('INVALID_INPUT', 'Resubmission reason is required', 400);
  }

  // Call the database function
  const { data, error } = await supabase.rpc('request_verification_resubmission', {
    verification_id: verificationId,
    admin_id: currentUserId,
    resubmission_reason: resubmissionReason,
    admin_notes: adminNotes
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data, 'Resubmission requested successfully');
});

/**
 * Get charity verification statistics
 */
export const getCharityVerificationStats = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{
  totalVerifications: number;
  pendingVerifications: number;
  approvedVerifications: number;
  rejectedVerifications: number;
  resubmissionRequired: number;
  avgProcessingTime: number;
}>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access verification statistics', 403);
  }

  // Get statistics in parallel
  const [
    totalResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    resubmissionResult,
    processingTimeResult
  ] = await Promise.allSettled([
    supabase.from('charity_verifications').select('id', { count: 'exact', head: true }),
    supabase.from('charity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('charity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('charity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('charity_verifications').select('id', { count: 'exact', head: true }).eq('status', 'resubmission_required'),
    supabase.from('charity_verifications').select('submitted_at, reviewed_at').not('reviewed_at', 'is', null)
  ]);

  // Process results
  const totalVerifications = totalResult.status === 'fulfilled' ? totalResult.value.count || 0 : 0;
  const pendingVerifications = pendingResult.status === 'fulfilled' ? pendingResult.value.count || 0 : 0;
  const approvedVerifications = approvedResult.status === 'fulfilled' ? approvedResult.value.count || 0 : 0;
  const rejectedVerifications = rejectedResult.status === 'fulfilled' ? rejectedResult.value.count || 0 : 0;
  const resubmissionRequired = resubmissionResult.status === 'fulfilled' ? resubmissionResult.value.count || 0 : 0;

  // Calculate average processing time
  let avgProcessingTime = 0;
  if (processingTimeResult.status === 'fulfilled' && processingTimeResult.value.data) {
    const processedVerifications = processingTimeResult.value.data.filter(v => v.submitted_at && v.reviewed_at);
    if (processedVerifications.length > 0) {
      const totalTime = processedVerifications.reduce((sum, v) => {
        const submitted = new Date(v.submitted_at).getTime();
        const reviewed = new Date(v.reviewed_at).getTime();
        return sum + (reviewed - submitted);
      }, 0);
      avgProcessingTime = Math.round(totalTime / processedVerifications.length / (1000 * 60 * 60 * 24)); // Days
    }
  }

  return createSuccessResponse({
    totalVerifications,
    pendingVerifications,
    approvedVerifications,
    rejectedVerifications,
    resubmissionRequired,
    avgProcessingTime
  });
});

/**
 * Approve milestone proof submission
 * @deprecated Moved to milestoneService.approveMilestoneProof
 */
export const approveMilestoneProof = milestoneService.approveMilestoneProof;

/**
 * Reject milestone proof submission
 * @deprecated Moved to milestoneService.rejectMilestoneProof
 */
export const rejectMilestoneProof = milestoneService.rejectMilestoneProof;

/**
 * Approve general submission (for verification detail page)
 */
export const approveSubmission = withErrorHandling(async (
  submissionId: string,
  submissionType: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can approve submissions', 403);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'approve_submission',
    submissionType,
    submissionId,
    { admin_notes: adminNotes }
  );

  return createSuccessResponse({ approved: true, submission_id: submissionId });
});

/**
 * Reject general submission (for verification detail page)
 */
export const rejectSubmission = withErrorHandling(async (
  submissionId: string,
  submissionType: string,
  rejectionReason: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can reject submissions', 403);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'reject_submission',
    submissionType,
    submissionId,
    { rejection_reason: rejectionReason, admin_notes: adminNotes }
  );

  return createSuccessResponse({ rejected: true, submission_id: submissionId, reason: rejectionReason });
});

/**
 * Get milestone proofs for verification
 * @deprecated Moved to milestoneService.getMilestoneProofsForVerification
 */
export const getMilestoneProofsForVerification = milestoneService.getMilestoneProofsForVerification;

/**
 * Get milestone proof statistics
 */
export const getMilestoneProofStats = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{
  totalProofs: number;
  pendingProofs: number;
  approvedProofs: number;
  rejectedProofs: number;
  totalAmount: number;
}>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access milestone statistics', 403);
  }

  // Get statistics in parallel
  const [
    totalResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    amountResult
  ] = await Promise.allSettled([
    supabase.from('milestone_proofs').select('id', { count: 'exact', head: true }),
    supabase.from('milestone_proofs').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('milestone_proofs').select('id', { count: 'exact', head: true }).eq('verification_status', 'approved'),
    supabase.from('milestone_proofs').select('id', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
    supabase
      .from('milestone_proofs')
      .select(`
        milestones:milestone_id (
          target_amount
        )
      `)
      .eq('verification_status', 'approved')
  ]);

  // Process results
  const totalProofs = totalResult.status === 'fulfilled' ? totalResult.value.count || 0 : 0;
  const pendingProofs = pendingResult.status === 'fulfilled' ? pendingResult.value.count || 0 : 0;
  const approvedProofs = approvedResult.status === 'fulfilled' ? approvedResult.value.count || 0 : 0;
  const rejectedProofs = rejectedResult.status === 'fulfilled' ? rejectedResult.value.count || 0 : 0;

  // Calculate total approved amount
  let totalAmount = 0;
  if (amountResult.status === 'fulfilled' && amountResult.value.data) {
    totalAmount = amountResult.value.data.reduce((sum, proof) => {
      return sum + (proof.milestones?.target_amount || 0);
    }, 0);
  }

  return createSuccessResponse({
    totalProofs,
    pendingProofs,
    approvedProofs,
    rejectedProofs,
    totalAmount
  });
});

/**
 * Get milestone proof by ID with detailed information
 */
export const getMilestoneProofById = withErrorHandling(async (
  proofId: string,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access milestone proofs', 403);
  }

  const { data, error } = await supabase
    .from('milestone_proofs')
    .select(`
      *,
      milestone:milestone_id (
        id,
        milestone_number,
        title,
        description,
        target_amount,
        campaign:campaign_id (
          id,
          title,
          description,
          charity:charity_id (
            id,
            organization_name,
            contact_email,
            user_id,
            profile:user_id (
              full_name,
              email
            )
          )
        )
      )
    `)
    .eq('id', proofId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new ClearCauseError('NOT_FOUND', 'Milestone proof not found', 404);
    }
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data, 'Milestone proof retrieved successfully');
});

/**
 * Get approved milestone proofs ready for fund release
 * NOTE: Disabled until fund_releases table is created
 */
export const getApprovedMilestonesForFundRelease = withErrorHandling(async (
  filters: {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access fund release data', 403);
  }

  const validatedParams = validateData(paginationSchema, params);

  // NOTE: Disabled until fund_releases table is created - return empty results
  return createPaginatedResponse([], 0, validatedParams);

  // Uncomment when fund_releases table exists:
  // const { page, limit, sortBy = 'verified_at', sortOrder = 'desc' } = validatedParams;
  // const offset = (page - 1) * limit;
  //
  // let query = supabase
  //   .from('milestone_proofs')
  //   .select(`
  //     *,
  //     milestones:milestone_id (
  //       id,
  //       title,
  //       description,
  //       target_amount,
  //       campaigns:campaign_id (
  //         id,
  //         title,
  //         charities:charity_id (
  //           id,
  //           organization_name,
  //           bank_account_name,
  //           bank_account_number,
  //           bank_name,
  //           bank_branch,
  //           user_id,
  //           profiles:user_id (
  //             full_name,
  //             email
  //           )
  //         )
  //       )
  //     ),
  //     fund_releases:proof_id (
  //       id,
  //       status,
  //       amount,
  //       released_at,
  //       processing_fee,
  //       transaction_reference
  //     )
  //   `, { count: 'exact' })
  //   .eq('verification_status', 'approved');
  //
  // query = query.or('fund_releases.status.is.null,fund_releases.status.neq.completed');
  //
  // if (filters.status) {
  //   if (filters.status === 'pending_release') {
  //     query = query.is('fund_releases.id', null);
  //   } else if (filters.status === 'processing') {
  //     query = query.eq('fund_releases.status', 'processing');
  //   } else if (filters.status === 'failed') {
  //     query = query.eq('fund_releases.status', 'failed');
  //   }
  // }
  //
  // if (filters.search) {
  //   query = query.or(`milestones.title.ilike.%${filters.search}%,milestones.campaigns.title.ilike.%${filters.search}%,milestones.campaigns.charities.organization_name.ilike.%${filters.search}%`);
  // }
  //
  // if (filters.dateFrom) {
  //   query = query.gte('verified_at', filters.dateFrom);
  // }
  //
  // if (filters.dateTo) {
  //   query = query.lte('verified_at', filters.dateTo);
  // }
  //
  // query = query
  //   .order(sortBy, { ascending: sortOrder === 'asc' })
  //   .range(offset, offset + limit - 1);
  //
  // const { data, count, error } = await query;
  //
  // if (error) {
  //   throw handleSupabaseError(error);
  // }
  //
  // const transformedData = (data || []).map(proof => ({
  //   id: proof.id,
  //   milestoneId: proof.milestone_id,
  //   proofUrl: proof.proof_url,
  //   description: proof.description,
  //   submittedAt: proof.submitted_at,
  //   verifiedAt: proof.verified_at,
  //   verificationNotes: proof.verification_notes,
  //   verifiedBy: proof.verified_by,
  //   milestone: {
  //     id: proof.milestones?.id,
  //     title: proof.milestones?.title,
  //     description: proof.milestones?.description,
  //     targetAmount: proof.milestones?.target_amount,
  //     campaign: {
  //       id: proof.milestones?.campaigns?.id,
  //       title: proof.milestones?.campaigns?.title,
  //       charity: {
  //         id: proof.milestones?.campaigns?.charities?.id,
  //         organizationName: proof.milestones?.campaigns?.charities?.organization_name,
  //         bankAccountName: proof.milestones?.campaigns?.charities?.bank_account_name,
  //         bankAccountNumber: proof.milestones?.campaigns?.charities?.bank_account_number,
  //         bankName: proof.milestones?.campaigns?.charities?.bank_name,
  //         bankBranch: proof.milestones?.campaigns?.charities?.bank_branch,
  //         userId: proof.milestones?.campaigns?.charities?.user_id,
  //         contactName: proof.milestones?.campaigns?.charities?.profiles?.full_name,
  //         contactEmail: proof.milestones?.campaigns?.charities?.profiles?.email,
  //       }
  //     }
  //   },
  //   fundRelease: proof.fund_releases?.[0] ? {
  //     id: proof.fund_releases[0].id,
  //     status: proof.fund_releases[0].status,
  //     amount: proof.fund_releases[0].amount,
  //     releasedAt: proof.fund_releases[0].released_at,
  //     processingFee: proof.fund_releases[0].processing_fee,
  //     transactionReference: proof.fund_releases[0].transaction_reference,
  //   } : null
  // }));
  //
  // return createPaginatedResponse(transformedData, count || 0, validatedParams);
});

/**
 * Initiate fund release for approved milestone
 */
export const initiateFundRelease = withErrorHandling(async (
  proofId: string,
  releaseAmount: number,
  processingFee: number,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can initiate fund releases', 403);
  }

  // Verify the proof is approved and doesn't have a completed release
  const { data: proof, error: proofError } = await supabase
    .from('milestone_proofs')
    .select(`
      *,
      milestones:milestone_id (
        id,
        target_amount,
        campaigns:campaign_id (
          id,
          charities:charity_id (
            id,
            organization_name,
            bank_account_name,
            bank_account_number,
            bank_name
          )
        )
      ),
      fund_releases:proof_id!inner (
        id,
        status
      )
    `)
    .eq('id', proofId)
    .eq('verification_status', 'approved')
    .single();

  if (proofError || !proof) {
    throw new ClearCauseError('NOT_FOUND', 'Approved milestone proof not found', 404);
  }

  // Check if there's already a completed release
  const { data: existingRelease } = await supabase
    .from('fund_releases')
    .select('id, status')
    .eq('proof_id', proofId)
    .eq('status', 'completed')
    .single();

  if (existingRelease) {
    throw new ClearCauseError('INVALID_OPERATION', 'Funds have already been released for this milestone', 400);
  }

  // Create fund release record
  const { data: fundRelease, error: releaseError } = await supabase
    .from('fund_releases')
    .insert({
      proof_id: proofId,
      milestone_id: proof.milestone_id,
      charity_id: proof.milestones?.campaigns?.charities?.id,
      amount: releaseAmount,
      processing_fee: processingFee,
      net_amount: releaseAmount - processingFee,
      status: 'processing',
      initiated_by: currentUserId,
      admin_notes: adminNotes,
      transaction_reference: `FR-${Date.now()}-${proofId.slice(-6)}`
    })
    .select()
    .single();

  if (releaseError) {
    throw handleSupabaseError(releaseError);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'initiate_fund_release',
    'fund_release',
    fundRelease.id,
    {
      proof_id: proofId,
      amount: releaseAmount,
      processing_fee: processingFee,
      charity_id: proof.milestones?.campaigns?.charities?.id,
      admin_notes: adminNotes
    }
  );

  return createSuccessResponse(fundRelease, 'Fund release initiated successfully');
});

/**
 * Update fund release status
 */
export const updateFundReleaseStatus = withErrorHandling(async (
  releaseId: string,
  status: 'processing' | 'completed' | 'failed',
  transactionReference?: string,
  failureReason?: string,
  adminNotes?: string,
  currentUserId?: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin (if provided)
  if (currentUserId) {
    const { data: currentUser, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single();

    if (userError || currentUser?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'Only administrators can update fund release status', 403);
    }
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (status === 'completed') {
    updateData.released_at = new Date().toISOString();
    if (transactionReference) updateData.transaction_reference = transactionReference;
  }

  if (status === 'failed' && failureReason) {
    updateData.failure_reason = failureReason;
  }

  if (adminNotes) {
    updateData.admin_notes = adminNotes;
  }

  const { data, error } = await supabase
    .from('fund_releases')
    .update(updateData)
    .eq('id', releaseId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event if user is provided
  if (currentUserId) {
    await logAuditEvent(
      currentUserId,
      'update_fund_release_status',
      'fund_release',
      releaseId,
      {
        new_status: status,
        transaction_reference: transactionReference,
        failure_reason: failureReason,
        admin_notes: adminNotes
      }
    );
  }

  return createSuccessResponse(data, `Fund release status updated to ${status}`);
});

/**
 * Get fund release statistics
 */
export const getFundReleaseStats = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{
  totalReleases: number;
  pendingReleases: number;
  processingReleases: number;
  completedReleases: number;
  failedReleases: number;
  totalAmountReleased: number;
  totalProcessingFees: number;
  totalNetAmount: number;
}>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access fund release statistics', 403);
  }

  // Note: fund_releases table may not exist yet in development
  // Return zeros if tables don't exist
  let pendingReleases = 0;
  let totalReleases = 0;
  let processingReleases = 0;
  let completedReleases = 0;
  let failedReleases = 0;
  let totalAmountReleased = 0;
  let totalProcessingFees = 0;
  let totalNetAmount = 0;

  // Note: fund_releases table doesn't exist yet, skip queries to avoid console errors
  // TODO: Enable when fund_releases table is created

  // Uncomment when fund_releases table exists:
  // try {
  //   const { data: pendingData, error: pendingError } = await supabase
  //     .from('milestone_proofs')
  //     .select(`
  //       id,
  //       milestones:milestone_id (
  //         target_amount
  //       )
  //     `)
  //     .eq('verification_status', 'approved');
  //
  //   if (!pendingError && pendingData) {
  //     pendingReleases = pendingData.length;
  //   }
  //
  //   const [
  //     totalResult,
  //     processingResult,
  //     completedResult,
  //     failedResult,
  //     amountResult
  //   ] = await Promise.allSettled([
  //     supabase.from('fund_releases').select('id', { count: 'exact', head: true }),
  //     supabase.from('fund_releases').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
  //     supabase.from('fund_releases').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
  //     supabase.from('fund_releases').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
  //     supabase.from('fund_releases').select('amount, processing_fee, net_amount').eq('status', 'completed')
  //   ]);
  //
  //   totalReleases = totalResult.status === 'fulfilled' && !totalResult.value.error ? totalResult.value.count || 0 : 0;
  //   processingReleases = processingResult.status === 'fulfilled' && !processingResult.value.error ? processingResult.value.count || 0 : 0;
  //   completedReleases = completedResult.status === 'fulfilled' && !completedResult.value.error ? completedResult.value.count || 0 : 0;
  //   failedReleases = failedResult.status === 'fulfilled' && !failedResult.value.error ? failedResult.value.count || 0 : 0;
  //
  //   if (amountResult.status === 'fulfilled' && amountResult.value.data) {
  //     const completedData = amountResult.value.data;
  //     totalAmountReleased = completedData.reduce((sum, release) => sum + (release.amount || 0), 0);
  //     totalProcessingFees = completedData.reduce((sum, release) => sum + (release.processing_fee || 0), 0);
  //     totalNetAmount = completedData.reduce((sum, release) => sum + (release.net_amount || 0), 0);
  //   }
  // } catch (error) {
  //   console.debug('Fund release statistics not available:', error);
  // }

  return createSuccessResponse({
    totalReleases,
    pendingReleases,
    processingReleases,
    completedReleases,
    failedReleases,
    totalAmountReleased,
    totalProcessingFees,
    totalNetAmount
  });
});

/**
 * Get fund release history
 */
export const getFundReleaseHistory = withErrorHandling(async (
  filters: {
    status?: string;
    charityId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access fund release history', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('fund_releases')
    .select(`
      *,
      milestone_proofs:proof_id (
        id,
        submitted_at,
        milestones:milestone_id (
          id,
          title,
          campaigns:campaign_id (
            id,
            title,
            charities:charity_id (
              id,
              organization_name,
              profiles:user_id (
                full_name,
                email
              )
            )
          )
        )
      ),
      profiles:initiated_by (
        full_name,
        email
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.charityId) {
    query = query.eq('charity_id', filters.charityId);
  }

  if (filters.search) {
    query = query.or(`milestone_proofs.milestones.title.ilike.%${filters.search}%,milestone_proofs.milestones.campaigns.title.ilike.%${filters.search}%,milestone_proofs.milestones.campaigns.charities.organization_name.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform data for easier consumption
  const transformedData = (data || []).map(release => ({
    id: release.id,
    proofId: release.proof_id,
    milestoneId: release.milestone_id,
    charityId: release.charity_id,
    amount: release.amount,
    processingFee: release.processing_fee,
    netAmount: release.net_amount,
    status: release.status,
    transactionReference: release.transaction_reference,
    failureReason: release.failure_reason,
    adminNotes: release.admin_notes,
    createdAt: release.created_at,
    releasedAt: release.released_at,
    initiatedBy: {
      id: release.initiated_by,
      name: release.profiles?.full_name,
      email: release.profiles?.email
    },
    milestone: {
      id: release.milestone_proofs?.milestones?.id,
      title: release.milestone_proofs?.milestones?.title,
      campaign: {
        id: release.milestone_proofs?.milestones?.campaigns?.id,
        title: release.milestone_proofs?.milestones?.campaigns?.title,
        charity: {
          id: release.milestone_proofs?.milestones?.campaigns?.charities?.id,
          organizationName: release.milestone_proofs?.milestones?.campaigns?.charities?.organization_name,
          contactName: release.milestone_proofs?.milestones?.campaigns?.charities?.profiles?.full_name,
          contactEmail: release.milestone_proofs?.milestones?.campaigns?.charities?.profiles?.email,
        }
      }
    }
  }));

  return createPaginatedResponse(transformedData, count || 0, validatedParams);
});

// =========================================
// PLATFORM SETTINGS MANAGEMENT
// =========================================

/**
 * Get all platform settings
 */
export const getPlatformSettings = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<PlatformSetting[]>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access platform settings', 403);
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('category', { ascending: true })
    .order('key', { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  const settings = data.map(setting => ({
    id: setting.id,
    key: setting.key,
    value: setting.value,
    description: setting.description,
    category: setting.category,
    updatedAt: setting.updated_at,
    updatedBy: setting.updated_by,
    createdAt: setting.created_at,
  }));

  return createSuccessResponse(settings);
});

/**
 * Update a platform setting
 */
export const updatePlatformSetting = withErrorHandling(async (
  key: string,
  value: any,
  currentUserId: string
): Promise<ApiResponse<PlatformSetting>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can update platform settings', 403);
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .update({
      value: value,
      updated_at: new Date().toISOString(),
      updated_by: currentUserId,
    })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'UPDATE_PLATFORM_SETTING', 'platform_setting', data.id, {
    key,
    new_value: value,
  });

  const setting = {
    id: data.id,
    key: data.key,
    value: data.value,
    description: data.description,
    category: data.category,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
    createdAt: data.created_at,
  };

  return createSuccessResponse(setting, 'Platform setting updated successfully');
});

// =========================================
// CAMPAIGN CATEGORIES MANAGEMENT
// =========================================

/**
 * Get all campaign categories
 */
export const getCampaignCategories = withErrorHandling(async (
  includeInactive: boolean = false
): Promise<ApiResponse<CampaignCategory[]>> => {
  let query = supabase
    .from('campaign_categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const categories = data.map(category => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    isActive: category.is_active,
    displayOrder: category.display_order,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }));

  return createSuccessResponse(categories);
});

/**
 * Create a new campaign category
 */
export const createCampaignCategory = withErrorHandling(async (
  categoryData: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
  },
  currentUserId: string
): Promise<ApiResponse<CampaignCategory>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError} = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can create campaign categories', 403);
  }

  const { data, error } = await supabase
    .from('campaign_categories')
    .insert({
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || null,
      icon: categoryData.icon || null,
      display_order: categoryData.displayOrder || 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'CREATE_CAMPAIGN_CATEGORY', 'campaign_category', data.id, categoryData);

  const category = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    icon: data.icon,
    isActive: data.is_active,
    displayOrder: data.display_order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return createSuccessResponse(category, 'Campaign category created successfully');
});

/**
 * Update a campaign category
 */
export const updateCampaignCategory = withErrorHandling(async (
  categoryId: string,
  categoryData: {
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    displayOrder?: number;
  },
  currentUserId: string
): Promise<ApiResponse<CampaignCategory>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can update campaign categories', 403);
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (categoryData.name !== undefined) updateData.name = categoryData.name;
  if (categoryData.slug !== undefined) updateData.slug = categoryData.slug;
  if (categoryData.description !== undefined) updateData.description = categoryData.description;
  if (categoryData.icon !== undefined) updateData.icon = categoryData.icon;
  if (categoryData.isActive !== undefined) updateData.is_active = categoryData.isActive;
  if (categoryData.displayOrder !== undefined) updateData.display_order = categoryData.displayOrder;

  const { data, error } = await supabase
    .from('campaign_categories')
    .update(updateData)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'UPDATE_CAMPAIGN_CATEGORY', 'campaign_category', categoryId, categoryData);

  const category = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    icon: data.icon,
    isActive: data.is_active,
    displayOrder: data.display_order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return createSuccessResponse(category, 'Campaign category updated successfully');
});

/**
 * Delete a campaign category (soft delete by setting is_active to false)
 */
export const deleteCampaignCategory = withErrorHandling(async (
  categoryId: string,
  currentUserId: string
): Promise<ApiResponse<void>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can delete campaign categories', 403);
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('campaign_categories')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', categoryId);

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'DELETE_CAMPAIGN_CATEGORY', 'campaign_category', categoryId);

  return createSuccessResponse(undefined, 'Campaign category deleted successfully');
});
