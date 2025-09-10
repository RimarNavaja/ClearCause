
import React, { useState } from 'react';
import { Bell, BellOff, Mail, MailCheck, Save } from 'lucide-react';
import CharityLayout from '@/components/layout/CharityLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface NotificationSetting {
  id: string;
  category: string;
  name: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

const CharitySettings: React.FC = () => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    {
      id: 'new-donation',
      category: 'Donations & Funds',
      name: 'New Donation Received',
      description: 'Receive notifications when someone donates to your campaigns',
      email: true,
      inApp: true
    },
    {
      id: 'funds-released',
      category: 'Donations & Funds',
      name: 'Milestone Funds Released',
      description: 'Receive notifications when funds are released to your account',
      email: true,
      inApp: true
    },
    {
      id: 'milestone-approved',
      category: 'Campaign & Milestone Verification',
      name: 'Milestone Proof Approved',
      description: 'Receive notifications when your milestone proof is approved',
      email: true,
      inApp: true
    },
    {
      id: 'milestone-rejected',
      category: 'Campaign & Milestone Verification',
      name: 'Milestone Proof Rejected',
      description: 'Receive notifications when your milestone proof is rejected and needs action',
      email: true,
      inApp: true
    },
    {
      id: 'campaign-funded',
      category: 'Campaign & Milestone Verification',
      name: 'Campaign Fully Funded',
      description: 'Receive notifications when your campaign reaches its funding goal',
      email: true,
      inApp: true
    },
    {
      id: 'platform-updates',
      category: 'Platform Updates',
      name: 'ClearCause Platform Announcements',
      description: 'Receive updates about new features, system maintenance, and other important announcements',
      email: false,
      inApp: true
    }
  ]);
  
  const handleToggleNotification = (id: string, type: 'email' | 'inApp') => {
    setNotificationSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, [type]: !setting[type] }
          : setting
      )
    );
  };
  
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would submit the changes to the backend
    // TODO: Implement API call to save notification settings
    // Show success message
    alert('Notification settings saved successfully');
  };
  
  // Group settings by category
  const groupedSettings = notificationSettings.reduce<Record<string, NotificationSetting[]>>(
    (acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, 
    {}
  );
  
  return (
    <CharityLayout title="Settings">
      <form onSubmit={handleSaveSettings} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-600">
              Choose how you want to be notified about activity related to your campaigns and account.
            </p>
            
            <div className="space-y-6">
              {Object.entries(groupedSettings).map(([category, settings]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-medium">{category}</h3>
                  <div className="space-y-4">
                    {settings.map(setting => (
                      <div key={setting.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-2">
                        <div>
                          <p className="font-medium">{setting.name}</p>
                          <p className="text-sm text-gray-500">{setting.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch 
                            id={`${setting.id}-email`}
                            checked={setting.email}
                            onCheckedChange={() => handleToggleNotification(setting.id, 'email')}
                          />
                          <Label htmlFor={`${setting.id}-email`} className="flex items-center gap-1 cursor-pointer">
                            <Mail className="h-4 w-4" />
                            <span className="sr-only md:not-sr-only">Email</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch 
                            id={`${setting.id}-inapp`}
                            checked={setting.inApp}
                            onCheckedChange={() => handleToggleNotification(setting.id, 'inApp')}
                          />
                          <Label htmlFor={`${setting.id}-inapp`} className="flex items-center gap-1 cursor-pointer">
                            <Bell className="h-4 w-4" />
                            <span className="sr-only md:not-sr-only">In-App</span>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {category !== Object.keys(groupedSettings).pop() && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Email Summary Settings Card (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5" />
              Email Summary Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose how often you'd like to receive summary emails about your campaigns.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Campaign Summary</p>
                  <p className="text-sm text-gray-500">Weekly digest of campaign performance and milestones</p>
                </div>
                <Switch id="weekly-summary" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Monthly Financial Report</p>
                  <p className="text-sm text-gray-500">Monthly summary of donations and fund releases</p>
                </div>
                <Switch id="monthly-report" defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" className="min-w-[160px]">
            <Save className="h-4 w-4 mr-1" />
            Save Preferences
          </Button>
        </div>
      </form>
    </CharityLayout>
  );
};

export default CharitySettings;
