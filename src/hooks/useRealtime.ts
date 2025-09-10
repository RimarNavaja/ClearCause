/**
 * Real-time Subscriptions Hook
 * Provides real-time data subscriptions for React components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { RealtimePayload, SubscriptionOptions } from '../lib/types';

interface UseRealtimeOptions extends SubscriptionOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

interface UseRealtimeReturn<T> {
  data: T | null;
  isConnected: boolean;
  error: string | null;
  subscribe: () => void;
  unsubscribe: () => void;
}

/**
 * Hook for real-time database subscriptions
 */
export const useRealtime = <T = any>(
  table: string,
  callback: (payload: RealtimePayload<T>) => void,
  options: UseRealtimeOptions = {}
): UseRealtimeReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const {
    enabled = true,
    event = '*',
    schema = 'public',
    filter,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      return; // Already subscribed
    }

    try {
      const channelName = `realtime:${schema}:${table}:${filter || 'all'}`;
      const channel = supabase.channel(channelName);

      // Configure postgres changes subscription
      let subscription = channel.on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          filter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const formattedPayload: RealtimePayload<T> = {
            schema: payload.schema,
            table: payload.table,
            commit_timestamp: payload.commit_timestamp,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          };

          callbackRef.current(formattedPayload);
          
          // Update local data based on event type
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setData(payload.new);
          } else if (payload.eventType === 'DELETE') {
            setData(null);
          }
        }
      );

      // Handle connection status
      channel.on('system' as any, {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
          onConnect?.();
        } else if (payload.status === 'CLOSED') {
          setIsConnected(false);
          onDisconnect?.();
        }
      });

      // Subscribe to channel
      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(error?.message || 'Subscription error');
          onError?.(error);
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setError('Subscription timed out');
          onError?.(new Error('Subscription timed out'));
        }
      });

      channelRef.current = channel;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err);
    }
  }, [table, event, schema, filter, onConnect, onDisconnect, onError]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
      setData(null);
      setError(null);
    }
  }, []);

  // Auto-subscribe when enabled
  useEffect(() => {
    if (enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  return {
    data,
    isConnected,
    error,
    subscribe,
    unsubscribe,
  };
};

/**
 * Hook for campaign real-time updates
 */
export const useCampaignRealtime = (
  campaignId: string,
  onUpdate?: (campaign: any) => void,
  enabled: boolean = true
) => {
  return useRealtime(
    'campaigns',
    (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        onUpdate?.(payload.new);
      }
    },
    {
      enabled,
      filter: `id=eq.${campaignId}`,
      event: 'UPDATE',
    }
  );
};

/**
 * Hook for donation real-time updates
 */
export const useDonationRealtime = (
  campaignId?: string,
  onNewDonation?: (donation: any) => void,
  enabled: boolean = true
) => {
  return useRealtime(
    'donations',
    (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        onNewDonation?.(payload.new);
      }
    },
    {
      enabled,
      filter: campaignId ? `campaign_id=eq.${campaignId}` : undefined,
      event: 'INSERT',
    }
  );
};

/**
 * Hook for milestone real-time updates
 */
export const useMilestoneRealtime = (
  campaignId: string,
  onMilestoneUpdate?: (milestone: any) => void,
  enabled: boolean = true
) => {
  return useRealtime(
    'milestones',
    (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        onMilestoneUpdate?.(payload.new);
      }
    },
    {
      enabled,
      filter: `campaign_id=eq.${campaignId}`,
      event: 'UPDATE',
    }
  );
};

/**
 * Hook for charity verification real-time updates
 */
export const useCharityVerificationRealtime = (
  charityId: string,
  onVerificationUpdate?: (charity: any) => void,
  enabled: boolean = true
) => {
  return useRealtime(
    'charity_organizations',
    (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        onVerificationUpdate?.(payload.new);
      }
    },
    {
      enabled,
      filter: `id=eq.${charityId}`,
      event: 'UPDATE',
    }
  );
};

/**
 * Hook for multiple table subscriptions
 */
export const useMultipleRealtime = (
  subscriptions: Array<{
    table: string;
    callback: (payload: RealtimePayload) => void;
    options?: UseRealtimeOptions;
  }>,
  enabled: boolean = true
) => {
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const results = subscriptions.map(({ table, callback, options = {} }) =>
    useRealtime(table, callback, { ...options, enabled })
  );

  useEffect(() => {
    const newConnections: Record<string, boolean> = {};
    const newErrors: Record<string, string | null> = {};

    results.forEach((result, index) => {
      const table = subscriptions[index].table;
      newConnections[table] = result.isConnected;
      newErrors[table] = result.error;
    });

    setConnections(newConnections);
    setErrors(newErrors);
  }, [results, subscriptions]);

  return {
    connections,
    errors,
    allConnected: Object.values(connections).every(Boolean),
    hasErrors: Object.values(errors).some(Boolean),
  };
};

/**
 * Hook for presence (who's online) functionality
 */
export const usePresence = (
  channelName: string,
  userInfo: { id: string; name: string; avatar?: string },
  enabled: boolean = true
) => {
  const [onlineUsers, setOnlineUsers] = useState<Array<any>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userInfo.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const users = Object.keys(presenceState).map((key) => {
          return presenceState[key][0];
        });
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((current) => [...current, ...newPresences]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((current) =>
          current.filter(
            (user) => !leftPresences.find((left: any) => left.id === user.id)
          )
        );
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await channel.track(userInfo);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        setIsConnected(false);
        setOnlineUsers([]);
      }
    };
  }, [channelName, userInfo, enabled]);

  return {
    onlineUsers,
    isConnected,
    userCount: onlineUsers.length,
  };
};

/**
 * Hook for real-time notifications
 */
export const useNotifications = (
  userId: string,
  onNotification?: (notification: any) => void,
  enabled: boolean = true
) => {
  const [notifications, setNotifications] = useState<Array<any>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected } = useRealtime(
    'notifications',
    (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const notification = payload.new;
        setNotifications((prev) => [notification, ...prev]);
        
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }
        
        onNotification?.(notification);
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedNotification = payload.new;
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === updatedNotification.id ? updatedNotification : n
          )
        );
        
        // Update unread count
        if (payload.old && !payload.old.read && updatedNotification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    },
    {
      enabled,
      filter: `user_id=eq.${userId}`,
    }
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  };
};
