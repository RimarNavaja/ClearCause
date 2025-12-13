import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ScorecardProps {
  scorecard: {
    transparency: number;
    efficiency: number;
    reportingFrequency: string;
    milestoneAchievement: string;
    averageVerificationTime: string;
  };
}

const CharityScorecard: React.FC<ScorecardProps> = ({ scorecard }) => {
  return (
    <Card className="bg-white rounded-xl shadow-[0px_2px_4px_-2px_rgba(0,0,0,0.10)] shadow-md overflow-hidden border-none">
      <CardContent className="p-6">
        {/* Title */}
        <h3 className="text-slate-950 text-base font-bold leading-7 mb-6 text-center font-robotobold">
          Transparency & Performance
        </h3>

        {/* Transparency Score */}
        <div className="mb-5 font-poppinsregular">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-950 text-sm font-medium font-sans leading-5">
              Transparency Score
            </span>
            <span className="text-slate-950 text-sm font-semibold font-sans leading-5">
              {scorecard.transparency}%
            </span>
          </div>
          <Progress 
            value={scorecard.transparency} 
            className="h-1.5 bg-blue-200 rounded-full" 
          />
        </div>

        {/* Efficiency Rating */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-slate-950 text-sm font-medium font-sans leading-5">
              Efficiency Rating
            </span>
            <span className="text-slate-950 text-sm font-semibold font-sans leading-5">
              {scorecard.efficiency}%
            </span>
          </div>
          <Progress 
            value={scorecard.efficiency} 
            className="h-1.5 bg-blue-200 rounded-full" 
          />
        </div>

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm font-normal font-sans leading-5">
              Reporting Frequency
            </span>
            <span className="text-slate-950 text-sm font-medium font-sans leading-5">
              {scorecard.reportingFrequency}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm font-normal font-sans leading-5">
              Milestone Achievement
            </span>
            <span className="text-slate-950 text-sm font-medium font-sans leading-5">
              {scorecard.milestoneAchievement}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm font-normal font-sans leading-5">
              Avg. Verification Time
            </span>
            <span className="text-slate-950 text-sm font-medium font-sans leading-5">
              {scorecard.averageVerificationTime}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CharityScorecard;
