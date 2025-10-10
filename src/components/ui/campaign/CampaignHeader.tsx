
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check } from 'lucide-react';

interface CampaignHeaderProps {
  category: string;
  verified: boolean;
  title: string;
  charityLogo: string;
  charity: string;
  charityId?: string;
  daysLeft: number;
}

const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  category,
  verified,
  title,
  charityLogo,
  charity,
  charityId,
  daysLeft
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center mb-4">
        <span className="bg-clearcause-muted text-clearcause-primary text-xs font-medium px-2.5 py-1 rounded-full mr-2">
          {category}
        </span>
        {verified && (
          <div className="verified-badge">
            <Check size={14} />
            <span>Verified Campaign</span>
          </div>
        )}
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{title}</h1>
      <div className="flex items-center space-x-3">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full overflow-hidden">
            <img src={charityLogo} alt={charity} className="h-full w-full object-cover" />
          </div>
          {charityId ? (
            <Link to={`/charities/${charityId}`} className="ml-2 text-sm font-medium text-gray-900 hover:text-clearcause-primary">
              {charity}
            </Link>
          ) : (
            <span className="ml-2 text-sm font-medium text-gray-900">
              {charity}
            </span>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Calendar size={16} className="mr-1" />
          <span>{daysLeft} days left</span>
        </div>
      </div>
    </div>
  );
};

export default CampaignHeader;
