
import React from 'react';
import { Check, Clock, AlertTriangle } from 'lucide-react';

type MilestoneStatus = 'pending' | 'verified' | 'released' | 'upcoming';

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  date?: string;
  amount: number;
  evidence?: string;
}

interface MilestoneTrackerProps {
  milestones: Milestone[];
}

const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({ milestones }) => {
  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case 'pending':
        return (
          <div className="pending-badge">
            <Clock size={14} />
            <span>Pending Verification</span>
          </div>
        );
      case 'verified':
        return (
          <div className="verified-badge">
            <Check size={14} />
            <span>Verified</span>
          </div>
        );
      case 'released':
        return (
          <span className="inline-flex items-center gap-1 text-sm bg-clearcause-dark-blue/10 text-clearcause-dark-blue py-1 px-2 rounded-full">
            <Check size={14} />
            <span>Funds Released</span>
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 text-sm bg-gray-100 text-gray-500 py-1 px-2 rounded-full">
            <Clock size={14} />
            <span>Upcoming</span>
          </span>
        );
    }
  };
  
  return (
    <div className="space-y-6 font-poppinsregular">
      <h2 className="text-2xl font-robotobold">Transparency Milestones</h2>
      <p className="text-gray-500">
        Funds are released incrementally after ClearCause verifies that each milestone has been achieved.
      </p>
      
      <div className="relative border-l-2 border-gray-200 pl-6 ml-6 space-y-10">
        {milestones.map((milestone, index) => {
          const isCompleted = milestone.status === 'verified' || milestone.status === 'released';
          const isActive = milestone.status === 'pending';
          
          return (
            <div key={milestone.id} className="relative">
              <div 
                className={`absolute -left-[30px] w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                  isCompleted 
                    ? 'bg-clearcause-success text-white border-clearcause-success' 
                    : isActive 
                      ? 'bg-clearcause-warning text-white border-clearcause-warning' 
                      : 'bg-white border-gray-300'
                }`}
              >
                {isCompleted ? <Check size={12} /> : null}
                {isActive ? <AlertTriangle size={12} /> : null}
              </div>
              
              <div className="bg-white rounded-lg border p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-robotobold">{milestone.title}</h3>
                    {milestone.date && (
                      <p className="text-sm text-gray-500">Target date: {milestone.date}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-robotobold">PHP {milestone.amount.toLocaleString()}</div>
                    <div className="mt-1">{getStatusBadge(milestone.status)}</div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="text-gray-600">{milestone.description}</p>
                </div>
                
                {milestone.evidence && milestone.status !== 'upcoming' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium mb-2">Verification Evidence:</p>
                    <p className="text-sm text-gray-600">{milestone.evidence}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneTracker;
