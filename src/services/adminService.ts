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
  ClearCauseError 
} from '../lib/types';
import { validateData, paginationSchema } from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';

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
    console.error('Failed to log audit event:', error);
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

  // Get all statistics in parallel
  const [
    usersResult,
    charitiesResult,
    campaignsResult,
    donationsResult,
    activeUsersResult,
    activeCampaignsResult,
    pendingVerificationsResult,
  ] = await Promise.allSettled([
    // Total users
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    
    // Total charities
    supabase.from('charities').select('id', { count: 'exact', head: true }),
    
    // Total campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    
    // Total donations and amount
    supabase.from('donations').select('amount, status'),
    
    // Active users (users with activity in last 30 days)
    supabase.from('audit_logs')
      .select('user_id')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    
    // Active campaigns
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    
    // Pending verifications
    supabase.from('charities').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
  ]);

  // Process results
  const totalUsers = usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0;
  const totalCharities = charitiesResult.status === 'fulfilled' ? charitiesResult.value.count || 0 : 0;
  const totalCampaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.count || 0 : 0;
  
  let totalDonations = 0;
  let totalAmountRaised = 0;
  if (donationsResult.status === 'fulfilled' && donationsResult.value.data) {
    totalDonations = donationsResult.value.data.length;
    totalAmountRaised = donationsResult.value.data
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + d.amount, 0);
  }

  let activeUsers = 0;
  if (activeUsersResult.status === 'fulfilled' && activeUsersResult.value.data) {
    const uniqueUsers = new Set(activeUsersResult.value.data.map(log => log.user_id));
    activeUsers = uniqueUsers.size;
  }

  const activeCampaigns = activeCampaignsResult.status === 'fulfilled' ? activeCampaignsResult.value.count || 0 : 0;
  const pendingVerifications = pendingVerificationsResult.status === 'fulfilled' ? pendingVerificationsResult.value.count || 0 : 0;

  return createSuccessResponse({
    totalUsers,
    totalCharities,
    totalCampaigns,
    totalDonations,
    totalAmountRaised,
    activeUsers,
    activeCampaigns,
    pendingVerifications,
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

  // Get recent audit logs
  const { data: auditLogs, error: auditError } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (auditError) {
    throw handleSupabaseError(auditError);
  }

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
          profiles:donor_id (
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
      ),
      history:admin_verification_history (
        id,
        action,
        previous_status,
        new_status,
        notes,
        created_at,
        admin:profiles!admin_id (
          full_name,
          email
        )
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
 */
export const approveMilestoneProof = withErrorHandling(async (
  proofId: string,
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
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can approve milestone proofs', 403);
  }

  // Update milestone proof status
  const { data, error } = await supabase
    .from('milestone_proofs')
    .update({
      verification_status: 'approved',
      verified_by: currentUserId,
      verification_notes: adminNotes,
    })
    .eq('id', proofId)
    .select('*, milestones(*)')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'approve_milestone_proof',
    'milestone_proof',
    proofId,
    { admin_notes: adminNotes }
  );

  return createSuccessResponse(data);
});

/**
 * Reject milestone proof submission
 */
export const rejectMilestoneProof = withErrorHandling(async (
  proofId: string,
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
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can reject milestone proofs', 403);
  }

  // Update milestone proof status
  const { data, error } = await supabase
    .from('milestone_proofs')
    .update({
      verification_status: 'rejected',
      verified_by: currentUserId,
      verification_notes: `REJECTED: ${rejectionReason}${adminNotes ? `\n\nAdmin Notes: ${adminNotes}` : ''}`,
    })
    .eq('id', proofId)
    .select('*, milestones(*)')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'reject_milestone_proof',
    'milestone_proof',
    proofId,
    { rejection_reason: rejectionReason, admin_notes: adminNotes }
  );

  return createSuccessResponse(data);
});

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
