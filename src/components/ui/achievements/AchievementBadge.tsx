import React from "react";
import { Achievement } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GlowEffect } from "@/components/ui/motion-primitives/glow-effect";
import { Award, Lock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AchievementBadgeProps {
  achievement: Achievement;
  earned?: boolean;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showShareButton?: boolean;
  onShareClick?: () => void;
  className?: string;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  earned = false,
  earnedAt,
  size = "md",
  showLabel = false,
  showShareButton = false,
  onShareClick,
  className,
}) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  const isDiamond =
    achievement.slug === "diamond-guardian" ||
    achievement.name === "Diamond Guardian";

  const isSapphire =
    achievement.slug === "sapphire-visionary" ||
    achievement.name === "Sapphire Visionary";

  const isLegend =
    achievement.slug === "eternal-legend" ||
    achievement.name === "Eternal Legend";

  const badgeContent = (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center transition-all",
        sizeClasses[size],
        earned
          ? isDiamond
            ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg"
            : isSapphire
            ? "bg-gradient-to-br from-blue-600 to-indigo-800 shadow-lg"
            : isLegend
            ? "bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg"
            : "bg-white border border-gray-100 shadow-md"
          : "bg-gray-200 opacity-50",
        !earned && "grayscale",
        className
      )}
    >
      {achievement.icon_url ? (
        <img
          src={achievement.icon_url}
          alt={achievement.name}
          className="w-full h-full rounded-full object-cover p-0.5"
        />
      ) : earned ? (
        <Award size={iconSizes[size]} className="text-blue-700" />
      ) : (
        <Lock size={iconSizes[size]} className="text-gray-400" />
      )}

      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full">
          <Lock size={iconSizes[size] / 2} className="text-white" />
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center w-full">
            {/* Badge Icon - Fixed height */}
            <div className="flex-shrink-0 mb-2 relative">
              {isDiamond && earned && (
                <GlowEffect
                  colors={["#E1F5FE", "#B3E5FC", "#81D4FA", "#4FC3F7"]}
                  mode="static"
                  blur="soft"
                  scale={1.2}
                  duration={5}
                  className="rounded-full opacity-50"
                />
              )}
              {isSapphire && earned && (
                <GlowEffect
                  colors={["#E3F2FD", "#90CAF9", "#42A5F5", "#1E88E5"]}
                  mode="flowHorizontal"
                  blur="soft"
                  scale={1.2}
                  duration={1}
                  className="rounded-full opacity-50"
                />
              )}
              {isLegend && earned && (
                <GlowEffect
                  colors={["#FFFDE7", "#FFF176", "#FFD54F", "#FFB74D"]}
                  mode="rotate"
                  blur="soft"
                  scale={1.3}
                  duration={5}
                  className="rounded-full opacity-50"
                />
              )}
              {badgeContent}
            </div>

            {/* Badge Name - Fixed height */}
            {showLabel && (
              <div className="h-10 flex items-center justify-center mb-1">
                <span
                  className={cn(
                    "text-sm font-medium text-center line-clamp-2",
                    earned ? "text-gray-900" : "text-gray-500"
                  )}
                >
                  {achievement.name}
                </span>
              </div>
            )}

            {/* Share Button - Fixed height */}
            <div className="h-8 flex items-center justify-center mt-1">
              {showShareButton && earned && onShareClick && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 hover:bg-blue-50 hover:text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareClick();
                  }}
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{achievement.name}</p>
            <p className="text-sm text-gray-600">{achievement.description}</p>
            {earned && earnedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Earned on {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
            {!earned && (
              <p className="text-xs text-gray-500 mt-2 italic">
                Not yet earned
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
