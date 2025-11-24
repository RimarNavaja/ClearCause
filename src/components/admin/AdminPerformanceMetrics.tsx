import React from 'react';
import { DollarSign, CheckCircle, XCircle, BarChart3, FileText, Pause, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/helpers';
import { PlatformStatistics } from '@/lib/types';

interface AdminPerformanceMetricsProps {
  stats: PlatformStatistics | null;
}

const AdminPerformanceMetrics: React.FC<AdminPerformanceMetricsProps> = ({ stats }) => {
  if (!stats) return null;

  const performanceMetrics = [
    {
      title: "Average Donation",
      value: formatCurrency(stats.averageDonationAmount),
      description: "Per completed donation",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Completed Campaigns",
      value: stats.completedCampaigns,
      description: `${stats.totalCampaigns > 0 ? ((stats.completedCampaigns / stats.totalCampaigns) * 100).toFixed(1) : 0}% completion rate`,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Failed Donations",
      value: stats.failedDonations,
      description: `${stats.totalDonations > 0 ? ((stats.failedDonations / stats.totalDonations) * 100).toFixed(1) : 0}% failure rate`,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  const campaignBreakdown = [
    {
      title: "Active",
      value: stats.activeCampaigns,
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Draft",
      value: stats.draftCampaigns,
      icon: FileText,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
    {
      title: "Paused",
      value: stats.pausedCampaigns,
      icon: Pause,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Completed",
      value: stats.completedCampaignsList,
      icon: Archive,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {performanceMetrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Campaign Status Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Campaign Status Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {campaignBreakdown.map((item, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                    <p className="text-2xl font-bold mt-1">{item.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${item.bgColor}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${item.bgColor}`}
                      style={{
                        width: `${Math.min(100, (item.value / stats.totalCampaigns) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPerformanceMetrics;
