
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ShareMenu from './ShareMenu';

interface Campaign {
  id?: string;
  raised: number;
  goal: number;
  donors: number;
  charity: string;
  charityLogo: string;
  transparency: number;
  efficiency: number;
  title: string;
  status?: string;
  charityId?: string;
}

interface DonationCardProps {
  campaign: Campaign;
  isOwner?: boolean;
  userRole?: string | null;
}

const DonationCard: React.FC<DonationCardProps> = ({ campaign, isOwner = false, userRole = null }) => {
  const [donationAmount, setDonationAmount] = useState(1000);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const progressPercentage = Math.min((campaign.raised / campaign.goal) * 100, 100);

  // Check if user is a charity (any charity, not just the owner)
  const isCharityUser = userRole === 'charity';

  return (
    <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-2xl font-bold">PHP {campaign.raised.toLocaleString()}</span>
          <span className="text-gray-500">of PHP {campaign.goal.toLocaleString()}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-clearcause-primary h-2.5 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span>{progressPercentage.toFixed(0)}% Funded</span>
          <div className="flex items-center">
            <Users size={14} className="mr-1" />
            <span>{campaign.donors} donors</span>
          </div>
        </div>
      </div>

      {isOwner ? (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800 text-center">
            This is your campaign. You cannot donate to your own campaign.
          </p>
        </div>
      ) : isCharityUser ? (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <p className="text-sm text-purple-800 text-center">
            Charity accounts cannot make donations. Only donors can contribute to campaigns.
          </p>
        </div>
      ) : campaign.status === 'draft' ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800 text-center">
            This campaign is pending review and not yet accepting donations.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label htmlFor="donation-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Select Donation Amount
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[500, 1000, 2500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setDonationAmount(amount)}
                  className={`rounded-md py-2 text-sm font-medium transition-colors ${
                    donationAmount === amount
                      ? 'bg-clearcause-primary text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  ₱{amount.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">₱</span>
              </div>
              <input
                type="number"
                name="donation-amount"
                id="donation-amount"
                value={donationAmount}
                onChange={(e) => setDonationAmount(Number(e.target.value))}
                className="block w-full rounded-md border-gray-300 pl-8 pr-12 focus:border-clearcause-primary focus:ring-clearcause-primary sm:text-sm"
                placeholder="0.00"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 sm:text-sm">PHP</span>
              </div>
            </div>
          </div>

          <Link to={`/donate/${campaign.id}`} className="block">
            <Button className="w-full bg-clearcause-accent hover:bg-clearcause-accent/90 mb-4">
              <Heart className="h-4 w-4 mr-2" />
              Donate ₱{donationAmount.toLocaleString()}
            </Button>
          </Link>
        </>
      )}

      <div className="flex justify-center space-x-4">
        <ShareMenu 
          isOpen={shareMenuOpen}
          onToggle={() => setShareMenuOpen(!shareMenuOpen)}
          campaignTitle={campaign.title}
        />
        
        <button className="flex items-center text-sm text-gray-500 hover:text-clearcause-primary p-1">
          <Heart size={16} className="mr-1" />
          <span>Save</span>
        </button>
      </div>
      
      {/* Charity Card */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-start mb-4">
          <div className="mr-4">
            <div className="h-12 w-12 rounded-full overflow-hidden">
              <img src={campaign.charityLogo} alt={campaign.charity} className="h-full w-full object-cover" />
            </div>
          </div>
          <div>
            <h3 className="font-medium">{campaign.charity}</h3>
            {campaign.charityId && (
              <Link to={`/charities/${campaign.charityId}`} className="text-sm text-clearcause-primary">
                View Profile
              </Link>
            )}
          </div>
        </div>
        {campaign.status !== 'draft' && campaign.transparency > 0 && campaign.efficiency > 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Transparency Score:</span>
              <span className="font-medium">{campaign.transparency}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Efficiency Rating:</span>
              <span className="font-medium">{campaign.efficiency}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationCard;
