import React from "react";
import { AchievementProgress } from "@/lib/types";
import { AchievementBadge } from "./AchievementBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AchievementListProps {
  achievements: AchievementProgress[];
  groupByCategory?: boolean;
  showProgress?: boolean;
  showShareButton?: boolean;
  onShareClick?: (achievement: AchievementProgress) => void;
  className?: string;
}

export const AchievementList: React.FC<AchievementListProps> = ({
  achievements,
  groupByCategory = true,
  showProgress = true,
  showShareButton = false,
  onShareClick,
  className,
}) => {
  if (!groupByCategory) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4",
          className
        )}
      >
        {achievements.map((ap) => (
          <div key={ap.achievement.id} className="flex flex-col items-center justify-start h-full">
            <div className="flex-shrink-0">
              <AchievementBadge
                achievement={ap.achievement}
                earned={ap.earned}
                earnedAt={ap.earned_at}
                showLabel={true}
                showShareButton={showShareButton}
                onShareClick={onShareClick ? () => onShareClick(ap) : undefined}
              />
            </div>
            {showProgress && !ap.earned && ap.progress && (
              <div className="mt-2 w-full">
                <Progress value={ap.progress.percentage} className="h-1" />
                <p className="text-xs text-center text-gray-500 mt-1">
                  {ap.progress.current} / {ap.progress.target}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Group by category
  const grouped = achievements.reduce((acc, ap) => {
    const category = ap.achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(ap);
    return acc;
  }, {} as Record<string, AchievementProgress[]>);

  const categoryLabels: Record<string, string> = {
    donation_milestones: "Donation Milestones",
    donation_frequency: "Donation Frequency",
    campaign_diversity: "Campaign & Diversity",
    platform_engagement: "Platform Engagement",
  };

  return (
    <div className={cn("space-y-8", className)}>
      {Object.entries(grouped).map(([category, categoryAchievements]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{categoryLabels[category] || category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categoryAchievements.map((ap) => (
                <div
                  key={ap.achievement.id}
                  className="flex flex-col items-center justify-start h-full"
                >
                  <div className="flex-shrink-0">
                    <AchievementBadge
                      achievement={ap.achievement}
                      earned={ap.earned}
                      earnedAt={ap.earned_at}
                      showLabel={true}
                      showShareButton={showShareButton}
                      onShareClick={onShareClick ? () => onShareClick(ap) : undefined}
                    />
                  </div>
                  {showProgress && !ap.earned && ap.progress && (
                    <div className="mt-2 w-full">
                      <Progress
                        value={ap.progress.percentage}
                        className="h-1 bg-blue-200"
                      />
                      <p className="text-xs text-center text-gray-500 mt-1">
                        {ap.progress.current} / {ap.progress.target}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
