import React from 'react';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/helpers';
import { PlatformStatistics } from '@/lib/types';

interface AdminGrowthMetricsProps {
  stats: PlatformStatistics | null;
}

const AdminGrowthMetrics: React.FC<AdminGrowthMetricsProps> = ({ stats }) => {
  if (!stats) return null;

  const growthMetrics = [
    {
      title: "New Users This Month",
      value: stats.newUsersThisMonth,
      total: stats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "New Campaigns This Month",
      value: stats.newCampaignsThisMonth,
      total: stats.totalCampaigns,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Donations This Month",
      value: stats.donationsThisMonth,
      total: stats.totalDonations,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Amount Raised This Month",
      value: stats.amountRaisedThisMonth,
      total: stats.totalAmountRaised,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      isCurrency: true,
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Growth This Month</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {growthMetrics.map((metric, index) => {
          const percentage = metric.total > 0 ? ((metric.value / metric.total) * 100).toFixed(1) : 0;

          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.isCurrency ? formatCurrency(metric.value) : metric.value.toString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage}% of total ({metric.isCurrency ? formatCurrency(metric.total) : metric.total})
                </p>
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${metric.bgColor}`}
                      style={{ width: `${Math.min(100, Number(percentage))}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminGrowthMetrics;
