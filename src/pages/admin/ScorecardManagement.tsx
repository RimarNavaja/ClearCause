
import React, { useState } from 'react';
import { Trophy, TrendingUp, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import ScorecardMetrics from '@/components/admin/ScorecardMetrics';
import ScorecardList from '@/components/admin/ScorecardList';

const ScorecardManagement = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateAllScores = async () => {
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Scorecards Updated",
        description: "All charity scorecards have been recalculated successfully.",
      });
    }, 2000);
  };

  return (
    <AdminLayout title="Scorecard Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scorecard Management</h1>
            <p className="text-muted-foreground">
              Monitor and update charity performance scorecards
            </p>
          </div>
        <Button 
          onClick={handleUpdateAllScores}
          disabled={isUpdating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
          {isUpdating ? 'Updating...' : 'Update All Scores'}
        </Button>
      </div>

      {/* Scorecard Metrics Overview */}
      <ScorecardMetrics />

      {/* Scorecard List */}
      <ScorecardList />
      </div>
    </AdminLayout>
  );
};

export default ScorecardManagement;
