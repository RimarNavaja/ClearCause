
import React from 'react';

interface ImpactMetric {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
}

interface Activity {
  id: string;
  title: string;
  timestamp: string;
  description: string;
}

interface ImpactDashboardProps {
  metrics: ImpactMetric[];
  recentActivities: Activity[];
}

const ImpactDashboard: React.FC<ImpactDashboardProps> = ({ metrics, recentActivities }) => {
  const hasData = metrics.length > 0 || recentActivities.length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <p className="text-gray-500 mb-2">No impact data available yet</p>
          <p className="text-sm text-gray-400">
            Impact metrics and activities will appear here once the campaign is active and receiving donations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {metrics.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Real-Time Impact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <div key={metric.id} className="impact-metric">
                <div className="p-2 rounded-full bg-clearcause-muted mb-3">
                  {metric.icon}
                </div>
                <h3 className="text-2xl font-semibold">{metric.value}</h3>
                <p className="text-sm text-gray-500">{metric.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentActivities.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between mb-1">
                  <h3 className="font-medium">{activity.title}</h3>
                  <span className="text-sm text-gray-500">{activity.timestamp}</span>
                </div>
                <p className="text-gray-600 text-sm">{activity.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactDashboard;
