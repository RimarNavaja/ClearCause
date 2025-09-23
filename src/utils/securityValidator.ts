/**
 * Security Validation and Hardening
 * Provides additional security checks and validations for authentication
 */

import { User } from '../lib/types';
import { supabase } from '../lib/supabase';
import { reportAuthError } from './authErrorHandler';

interface SecurityValidationResult {
  isValid: boolean;
  issues: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block' | 'logout';
}

interface SessionSecurityInfo {
  ipAddress?: string;
  userAgent: string;
  lastActivity: number;
  loginTime: number;
  deviceFingerprint?: string;
}

class SecurityValidator {
  private readonly MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 10;
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

  /**
   * Validate user authentication and session security
   */
  public async validateUserSecurity(user: User, sessionInfo?: SessionSecurityInfo): Promise<SecurityValidationResult> {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let action: 'allow' | 'warn' | 'block' | 'logout' = 'allow';

    try {
      // 1. Validate user profile integrity
      const profileValidation = await this.validateUserProfile(user);
      if (!profileValidation.isValid) {
        issues.push(...profileValidation.issues);
        severity = this.escalateSeverity(severity, profileValidation.severity);
      }

      // 2. Check email verification status
      if (!user.isVerified && !import.meta.env.VITE_ALLOW_UNVERIFIED_USERS) {
        issues.push('Email not verified');
        severity = this.escalateSeverity(severity, 'medium');
        action = 'block';
      }

      // 3. Validate session security if provided
      if (sessionInfo) {
        const sessionValidation = this.validateSessionSecurity(sessionInfo);
        if (!sessionValidation.isValid) {
          issues.push(...sessionValidation.issues);
          severity = this.escalateSeverity(severity, sessionValidation.severity);
        }
      }

      // 4. Check for suspicious patterns
      const suspiciousActivity = await this.checkSuspiciousActivity(user);
      if (suspiciousActivity.detected) {
        issues.push(...suspiciousActivity.issues);
        severity = this.escalateSeverity(severity, suspiciousActivity.severity);
        action = suspiciousActivity.action;
      }

      // 5. Rate limiting check
      const rateLimitCheck = await this.checkRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        issues.push('Rate limit exceeded');
        severity = this.escalateSeverity(severity, 'high');
        action = 'block';
      }

      // Determine final action based on severity
      if (severity === 'critical') {
        action = 'logout';
      } else if (severity === 'high' && action === 'allow') {
        action = 'warn';
      }

      return {
        isValid: issues.length === 0,
        issues,
        severity,
        action,
      };

    } catch (error) {
      reportAuthError(error, { context: 'security_validation', userId: user.id });

      // Fail secure - block on validation errors
      return {
        isValid: false,
        issues: ['Security validation failed'],
        severity: 'high',
        action: 'block',
      };
    }
  }

  /**
   * Validate user profile integrity
   */
  private async validateUserProfile(user: User): Promise<SecurityValidationResult> {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check required fields
    if (!user.email || !user.id) {
      issues.push('Missing required user fields');
      severity = 'critical';
    }

    // Validate email format
    if (user.email && !this.isValidEmail(user.email)) {
      issues.push('Invalid email format');
      severity = 'medium';
    }

    // Check for suspicious user data
    if (user.fullName && this.containsSuspiciousContent(user.fullName)) {
      issues.push('Suspicious content in user profile');
      severity = 'medium';
    }

    // Verify user exists in database
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, is_active')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        issues.push('User profile not found in database');
        severity = 'critical';
      } else if (!profile.is_active) {
        issues.push('User account is deactivated');
        severity = 'high';
      } else if (profile.email !== user.email) {
        issues.push('Email mismatch between session and profile');
        severity = 'high';
      }
    } catch (error) {
      issues.push('Failed to verify user profile');
      severity = 'high';
    }

    return {
      isValid: issues.length === 0,
      issues,
      severity,
      action: 'allow',
    };
  }

  /**
   * Validate session security
   */
  private validateSessionSecurity(sessionInfo: SessionSecurityInfo): SecurityValidationResult {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    const now = Date.now();

    // Check session duration
    const sessionDuration = now - sessionInfo.loginTime;
    if (sessionDuration > this.MAX_SESSION_DURATION) {
      issues.push('Session duration exceeded maximum allowed time');
      severity = 'medium';
    }

    // Check for recent activity
    const timeSinceActivity = now - sessionInfo.lastActivity;
    if (timeSinceActivity > 60 * 60 * 1000) { // 1 hour
      issues.push('Session inactive for extended period');
      severity = 'low';
    }

    // Validate user agent
    if (!sessionInfo.userAgent || sessionInfo.userAgent.length < 10) {
      issues.push('Suspicious or missing user agent');
      severity = 'medium';
    }

    // Check for suspicious user agent patterns
    if (this.isSuspiciousUserAgent(sessionInfo.userAgent)) {
      issues.push('Potentially automated or suspicious user agent');
      severity = 'medium';
    }

    return {
      isValid: issues.length === 0,
      issues,
      severity,
      action: 'allow',
    };
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(user: User): Promise<{
    detected: boolean;
    issues: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: 'allow' | 'warn' | 'block' | 'logout';
  }> {
    const issues: string[] = [];
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let action: 'allow' | 'warn' | 'block' | 'logout' = 'allow';

    try {
      // Check recent audit logs for suspicious patterns
      const { data: recentLogs, error } = await supabase
        .from('audit_logs')
        .select('action, created_at, details')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - this.RATE_LIMIT_WINDOW).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        // Don't fail on audit log errors, but log them
        reportAuthError(error, { context: 'audit_log_check', userId: user.id });
        return { detected: false, issues: [], severity: 'low', action: 'allow' };
      }

      if (recentLogs && recentLogs.length > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
        issues.push('Unusually high activity detected');
        severity = 'medium';
        action = 'warn';
      }

      // Check for failed login attempts
      const failedLogins = recentLogs?.filter(log =>
        log.action === 'USER_SIGNIN' &&
        log.details?.success === false
      ) || [];

      if (failedLogins.length > 5) {
        issues.push('Multiple failed login attempts detected');
        severity = 'high';
        action = 'block';
      }

      // Check for multiple concurrent sessions (if tracking is implemented)
      // This would require additional session tracking

    } catch (error) {
      reportAuthError(error, { context: 'suspicious_activity_check', userId: user.id });
    }

    return {
      detected: issues.length > 0,
      issues,
      severity,
      action,
    };
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      // Simple rate limiting based on audit logs
      const { data: recentLogs, error } = await supabase
        .from('audit_logs')
        .select('created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - this.RATE_LIMIT_WINDOW).toISOString());

      if (error) {
        // Fail open on rate limit check errors
        return { allowed: true, remaining: 100 };
      }

      const requestCount = recentLogs?.length || 0;
      const limit = 100; // 100 requests per 15 minutes

      return {
        allowed: requestCount < limit,
        remaining: Math.max(0, limit - requestCount),
      };
    } catch (error) {
      // Fail open on errors
      return { allowed: true, remaining: 100 };
    }
  }

  /**
   * Utility functions
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi, // Script tags
      /javascript:/gi,                      // Javascript protocol
      /on\w+\s*=/gi,                       // Event handlers
      /data:text\/html/gi,                 // Data URLs
      /vbscript:/gi,                       // VBScript
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /postman/i,
      /insomnia/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private escalateSeverity(
    current: 'low' | 'medium' | 'high' | 'critical',
    newLevel: 'low' | 'medium' | 'high' | 'critical'
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 1, medium: 2, high: 3, critical: 4 };
    const maxLevel = Math.max(levels[current], levels[newLevel]);

    return Object.keys(levels).find(
      key => levels[key as keyof typeof levels] === maxLevel
    ) as 'low' | 'medium' | 'high' | 'critical';
  }

  /**
   * Generate device fingerprint for session tracking
   */
  public generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      canvas.toDataURL(),
    ].join('|');

    return btoa(fingerprint).substring(0, 32);
  }

  /**
   * Log security event
   */
  public async logSecurityEvent(
    userId: string,
    event: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: `SECURITY_${event}`,
        entity_type: 'security',
        entity_id: userId,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
        },
      });
    } catch (error) {
      reportAuthError(error, { context: 'security_event_logging', userId, event });
    }
  }
}

// Export singleton instance
export const securityValidator = new SecurityValidator();

// Export types
export type { SecurityValidationResult, SessionSecurityInfo };