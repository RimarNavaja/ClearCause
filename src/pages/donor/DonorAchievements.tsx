import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDonorAchievementProgress } from '@/services/achievementService';
import { AchievementProgress } from '@/lib/types';
import { AchievementList } from '@/components/ui/achievements/AchievementList';
import { ShareAchievementDialog } from '@/components/ui/achievements/ShareAchievementDialog';
import DonorLayout from '@/components/layout/DonorLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Award } from 'lucide-react';

const DonorAchievements: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementProgress | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const result = await getDonorAchievementProgress(user.id);
        if (result.success && result.data) {
          setAchievements(result.data);
        } else {
          setError(result.error || 'Failed to load achievements');
        }
      } catch (err) {
        setError('An error occurred while loading achievements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [user]);

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;

  const handleShareClick = (achievement: AchievementProgress) => {
    setSelectedAchievement(achievement);
    setShareDialogOpen(true);
  };

  return (
    <DonorLayout title="Your Achievements">
      <div className="container mx-auto py-8 px-4 font-poppinsregular">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
             
              <div>
                <CardTitle className='font-robotobold'>Your Achievements</CardTitle>
                <CardDescription>
                  Track your progress and unlock badges by making donations and engaging with campaigns
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-blue-700">{earnedCount}</div>
              <div className="text-gray-600">
                / {totalCount} achievements earned ({totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%)
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-red-500">{error}</CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Achievements</TabsTrigger>
              <TabsTrigger value="earned">Earned ({earnedCount})</TabsTrigger>
              <TabsTrigger value="locked">Locked ({totalCount - earnedCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <AchievementList
                achievements={achievements}
                showProgress={true}
                showShareButton={true}
                onShareClick={handleShareClick}
              />
            </TabsContent>

            <TabsContent value="earned">
              <AchievementList
                achievements={achievements.filter(a => a.earned)}
                showProgress={false}
                showShareButton={true}
                onShareClick={handleShareClick}
              />
            </TabsContent>

            <TabsContent value="locked">
              <AchievementList
                achievements={achievements.filter(a => !a.earned)}
                showProgress={true}
                showShareButton={false}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Share Achievement Dialog */}
        {selectedAchievement && (
          <ShareAchievementDialog
            achievement={selectedAchievement.achievement}
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            donorName={user?.fullName}
            earnedAt={selectedAchievement.earned_at}
          />
        )}
      </div>
    </DonorLayout>
  );
};

export default DonorAchievements;
