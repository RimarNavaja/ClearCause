
import React, { useEffect, useState } from 'react';
import { Calendar, Eye, CheckCircle, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  details: any;
  created_at: string;
  user_email: string;
  user_role: string;
}

interface AuditTrailProps {
  campaignId: string;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ campaignId }) => {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const { data, error } = await supabase.rpc('get_campaign_audit_logs', {
          p_campaign_id: campaignId,
          p_limit: 50
        });

        if (error) {
          console.error('Error fetching audit logs:', error);
        } else {
          setAuditEvents(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchAuditLogs();
    }
  }, [campaignId]);

  const getEventIcon = (type: string, action: string) => {
    if (type === 'donation') return <DollarSign className="h-4 w-4 text-green-600" />;
    if (type === 'milestone') {
       if (action.includes('RELEASE')) return <Eye className="h-4 w-4 text-purple-600" />;
       return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
    if (type === 'campaign') return <AlertCircle className="h-4 w-4 text-orange-600" />;
    return <Clock className="h-4 w-4 text-gray-600" />;
  };

  const getEventColor = (type: string, action: string) => {
    if (type === 'donation') return 'bg-green-100 text-green-800';
    if (type === 'milestone') {
      if (action.includes('RELEASE')) return 'bg-purple-100 text-purple-800';
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventType = (type: string, action: string) => {
    if (type === 'donation') return 'Donation';
    if (type === 'milestone') {
       if (action.includes('RELEASE')) return 'Funds Released';
       return 'Milestone Verified';
    }
    if (action === 'CAMPAIGN_CREATED') return 'Campaign Created';
    if (action === 'CAMPAIGN_STATUS_UPDATED') return 'Status Update';
    return action.replace(/_/g, ' ');
  };

  const getDescription = (event: AuditEvent) => {
    if (event.action === 'DONATION_COMPLETED') {
      return `Donation received (${event.user_email || 'Donor'})`;
    }
    if (event.action === 'MILESTONE_VERIFIED') {
      return `Verified: ${event.details.milestone_title || 'Milestone'}`;
    }
    if (event.action.includes('RELEASE')) {
      return `Funds released for: ${event.details.milestone_title || 'Milestone'}`;
    }
    if (event.action === 'CAMPAIGN_CREATED') {
      return `Campaign created with goal ₱${event.details.goal_amount?.toLocaleString()}`;
    }
    if (event.action === 'CAMPAIGN_STATUS_UPDATED') {
      return `Campaign status changed from ${event.details.old_status} to ${event.details.new_status}`;
    }
    return JSON.stringify(event.details);
  };

  return (
    <Card className='font-poppinsregular'>
      <CardHeader>
        <CardTitle className="flex items-center font-robotobold">
          <Eye className="h-5 w-5 mr-2" />
          Transparent Audit Trail
        </CardTitle>
        <CardDescription className='font-poppinsregular'>
          Complete transparency: All donations, verifications, and fund releases are logged and timestamped
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
             ))}
          </div>
        ) : auditEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <p className="text-gray-500 mb-2">No audit trail data available yet</p>
              <p className="text-sm text-gray-400">
                All donations, milestone verifications, and fund releases will be logged here once the campaign is active.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {auditEvents.map((event) => (
            <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-gray-50/50">
              <div className="flex-shrink-0 mt-1">
                {getEventIcon(event.entity_type, event.action)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Badge className={getEventColor(event.entity_type, event.action)}>
                      {formatEventType(event.entity_type, event.action)}
                    </Badge>
                    {event.details?.amount && (
                      <span className="font-semibold text-clearcause-primary">
                        ₱{Number(event.details.amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(event.created_at)}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-1">{getDescription(event)}</p>
                
                {event.user_email && event.entity_type !== 'donation' && (
                  <p className="text-xs text-gray-500">By: {event.user_email}</p>
                )}
              </div>
            </div>
          ))}
          </div>
        )}

        {auditEvents.length > 0 && (
          <div className="mt-6 p-4 bg-clearcause-muted rounded-lg">
            <div className="flex items-center text-sm text-gray-600">
              <Eye className="h-4 w-4 mr-2" />
              <span>This audit trail is publicly accessible and shows all financial activities for this campaign. Donor identities are anonymized for privacy protection.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditTrail;
