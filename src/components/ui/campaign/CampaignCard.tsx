
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Calendar, Check, AlertTriangle, Heart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { formatCurrency, getRelativeTime, calculateDaysLeft } from '@/utils/helpers';
import { Campaign, CampaignStatus, RealtimePayload } from '@/lib/types';

interface CampaignCardProps {
  campaign: Campaign;
  showRealTimeUpdates?: boolean;
  compact?: boolean;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  showRealTimeUpdates = true,
  compact = false,
}) => {
  const [realtimeData, setRealtimeData] = useState(campaign);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useAuth();

  // Subscribe to real-time updates for this campaign
  const { subscribe, unsubscribe } = useRealtime();

  useEffect(() => {
    if (!showRealTimeUpdates) return;

    const handleCampaignUpdate = (payload: RealtimePayload<Campaign>) => {
      if (payload.new?.id === campaign.id) {
        const prevRaised = realtimeData.currentAmount;
        const newRaised = payload.new.currentAmount;
        
        // Animate if there's a donation
        if (newRaised > prevRaised) {
          setIsAnimating(true);
          setTimeout(() => setIsAnimating(false), 2000);
        }

        setRealtimeData(prev => ({
          ...prev,
          currentAmount: newRaised,
          donorsCount: payload.new.donorsCount,
          updatedAt: payload.new.updatedAt,
        }));
      }
    };

    const unsubscribeFn = subscribe('campaigns', handleCampaignUpdate);
    return unsubscribeFn;
  }, [campaign.id, showRealTimeUpdates, subscribe, realtimeData.currentAmount]);

  const progressPercentage = Math.min((realtimeData.currentAmount / realtimeData.goalAmount) * 100, 100);
  const daysLeft = calculateDaysLeft(realtimeData.endDate);
  const isExpired = daysLeft <= 0;
  const isVerified = realtimeData.charity?.verificationStatus === 'approved';

  const getStatusBadge = () => {
    switch (realtimeData.status) {
      case 'active':
        return isExpired ? (
          <Badge variant="secondary" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            Ended
          </Badge>
        ) : null;
      case 'paused':
        return (
          <Badge variant="outline" className="text-xs text-orange-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="text-xs bg-green-600">
            <Check className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border overflow-hidden h-full flex flex-col ${
      isAnimating ? 'ring-2 ring-green-400 shadow-lg transform scale-[1.02]' : ''
    }`}>
      <Link to={`/campaigns/${realtimeData.id}`}>
        <div className={`relative ${compact ? 'h-32' : 'h-48'}`}>
          <img
            src={realtimeData.imageUrl || '/api/placeholder/400/300'}
            alt={realtimeData.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/api/placeholder/400/300';
            }}
          />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-white/90 backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full">
              {realtimeData.category}
            </span>
          </div>
          
          {/* Status and Verification Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {getStatusBadge()}
            {isVerified && (
              <div className="verified-badge">
                <Check size={14} /> 
                <span>Verified</span>
              </div>
            )}
          </div>

          {/* Real-time donation animation overlay */}
          {isAnimating && (
            <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
              <div className="bg-white/95 rounded-full px-4 py-2 shadow-lg animate-bounce">
                <div className="flex items-center text-green-600 font-semibold">
                  <Heart className="w-4 h-4 mr-2 fill-current" />
                  New Donation!
                </div>
              </div>
            </div>
          )}
        </div>
      </Link>
      
      <div className={`${compact ? 'p-3' : 'p-4'} flex flex-col flex-grow`}>
        <Link to={`/campaigns/${realtimeData.id}`} className="block">
          <h3 className={`font-semibold line-clamp-2 hover:text-clearcause-primary transition-colors mb-1 ${
            compact ? 'text-base' : 'text-lg'
          }`}>
            {realtimeData.title}
          </h3>
        </Link>
        
        <Link to={`/charities/${realtimeData.charity?.id}`} className="block">
          <p className="text-sm text-gray-600 mb-2 hover:text-gray-900 flex items-center">
            <span>by {realtimeData.charity?.organizationName}</span>
            {isVerified && <Check className="w-3 h-3 ml-1 text-green-600" />}
          </p>
        </Link>
        
        {!compact && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-grow">
            {realtimeData.description}
          </p>
        )}
        
        <div className="mt-auto space-y-3">
          {/* Progress Bar with Animation */}
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
                progressPercentage >= 100 ? 'bg-green-500' : 'bg-clearcause-primary'
              } ${isAnimating ? 'animate-pulse' : ''}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Amount and Goal */}
          <div className="flex justify-between text-sm">
            <span className={`font-semibold ${isAnimating ? 'text-green-600' : ''}`}>
              {formatCurrency(realtimeData.currentAmount)}
            </span>
            <span className="text-gray-500">
              of {formatCurrency(realtimeData.goalAmount)}
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex justify-between items-center border-t border-gray-100 pt-3">
            <div className="flex items-center text-sm text-gray-500">
              <Users size={14} className="mr-1" />
              <span>{realtimeData.donorsCount || 0} donors</span>
            </div>
            
            {!isExpired ? (
              <div className="flex items-center text-sm text-gray-500">
                <Clock size={14} className="mr-1" />
                <span>{daysLeft} days left</span>
              </div>
            ) : (
              <div className="flex items-center text-sm text-red-500">
                <Calendar size={14} className="mr-1" />
                <span>Ended</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button 
            className="w-full bg-clearcause-accent hover:bg-clearcause-accent/90 disabled:opacity-50"
            disabled={isExpired || realtimeData.status !== 'active'}
            asChild
          >
            <Link to={`/donate/${realtimeData.id}`}>
              {isExpired ? 'Campaign Ended' : progressPercentage >= 100 ? 'Goal Reached!' : 'Donate Now'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CampaignCard;
