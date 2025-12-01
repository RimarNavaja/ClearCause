import { toast } from 'sonner';
import { DonorAchievement } from '@/lib/types';
import { Award } from 'lucide-react';

export const showAchievementUnlock = (achievement: DonorAchievement) => {
  toast.success(
    <div className="flex items-center gap-3">
      <div className="bg-yellow-400 rounded-full p-2">
        <Award className="text-white" size={24} />
      </div>
      <div>
        <p className="font-semibold">Achievement Unlocked!</p>
        <p className="text-sm text-gray-600">{achievement.achievement?.name}</p>
      </div>
    </div>,
    {
      duration: 5000,
    }
  );
};
