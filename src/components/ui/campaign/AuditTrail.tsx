
import React from 'react';
import { Calendar, Eye, CheckCircle, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AuditEvent {
  id: string;
  type: 'donation' | 'milestone_verified' | 'funds_released';
  timestamp: string;
  amount?: number;
  description: string;
  donorName?: string; // "Anonymous" or "Donor #123"
  milestoneTitle?: string;
  verifiedBy?: string;
}

interface AuditTrailProps {
  campaignId: string;
}

const SAMPLE_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "1",
    type: "funds_released",
    timestamp: "2024-03-15T14:30:00Z",
    amount: 300000,
    description: "Funds released for Milestone 2: Initial Construction - First 3 Wells",
    milestoneTitle: "Initial Construction - First 3 Wells",
    verifiedBy: "ClearCause Verifier #002"
  },
  {
    id: "2",
    type: "milestone_verified",
    timestamp: "2024-03-15T10:15:00Z",
    description: "Milestone 2 verified: Construction photos and engineering certification approved",
    milestoneTitle: "Initial Construction - First 3 Wells",
    verifiedBy: "ClearCause Verifier #002"
  },
  {
    id: "3",
    type: "donation",
    timestamp: "2024-03-14T16:45:00Z",
    amount: 5000,
    description: "Donation received",
    donorName: "Donor #127"
  },
  {
    id: "4",
    type: "donation",
    timestamp: "2024-03-14T09:20:00Z",
    amount: 2500,
    description: "Donation received",
    donorName: "Anonymous"
  },
  {
    id: "5",
    type: "funds_released",
    timestamp: "2024-02-20T11:00:00Z",
    amount: 200000,
    description: "Funds released for Milestone 1: Site Selection and Community Engagement",
    milestoneTitle: "Site Selection and Community Engagement",
    verifiedBy: "ClearCause Verifier #001"
  },
  {
    id: "6",
    type: "milestone_verified",
    timestamp: "2024-02-19T15:30:00Z",
    description: "Milestone 1 verified: Community meeting logs and signed MOUs approved",
    milestoneTitle: "Site Selection and Community Engagement",
    verifiedBy: "ClearCause Verifier #001"
  },
  {
    id: "7",
    type: "donation",
    timestamp: "2024-02-18T13:15:00Z",
    amount: 10000,
    description: "Donation received",
    donorName: "Donor #089"
  },
  {
    id: "8",
    type: "donation",
    timestamp: "2024-02-15T08:30:00Z",
    amount: 1000,
    description: "Donation received",
    donorName: "Anonymous"
  }
];

const AuditTrail: React.FC<AuditTrailProps> = ({ campaignId }) => {
  // For now, we don't have real audit data, so show empty state
  const auditEvents: AuditEvent[] = [];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'donation':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'milestone_verified':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'funds_released':
        return <Eye className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'donation':
        return 'bg-green-100 text-green-800';
      case 'milestone_verified':
        return 'bg-blue-100 text-blue-800';
      case 'funds_released':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  const formatEventType = (type: string) => {
    switch (type) {
      case 'donation':
        return 'Donation';
      case 'milestone_verified':
        return 'Milestone Verified';
      case 'funds_released':
        return 'Funds Released';
      default:
        return 'Activity';
    }
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
        {auditEvents.length === 0 ? (
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
                {getEventIcon(event.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Badge className={getEventColor(event.type)}>
                      {formatEventType(event.type)}
                    </Badge>
                    {event.amount && (
                      <span className="font-semibold text-clearcause-primary">
                        ₱{event.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(event.timestamp)}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-1">{event.description}</p>
                
                {event.donorName && (
                  <p className="text-xs text-gray-500">From: {event.donorName}</p>
                )}
                
                {event.verifiedBy && (
                  <p className="text-xs text-gray-500">Verified by: {event.verifiedBy}</p>
                )}
                
                {event.milestoneTitle && event.type !== 'milestone_verified' && (
                  <p className="text-xs text-gray-500">Milestone: {event.milestoneTitle}</p>
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
