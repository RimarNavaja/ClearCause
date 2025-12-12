import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, MailCheck, Save, AlertCircle } from 'lucide-react';
import CharityLayout from '@/components/layout/CharityLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { waitForAuthReady } from '@/utils/authHelper';
import * as userService from '@/services/userService';

interface NotificationSetting {
  id: string;
  category: string;
  name: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

interface EmailSummarySettings {
  weeklySummary: boolean;
  monthlyReport: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSetting[] = [
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
];

const DEFAULT_EMAIL_SETTINGS: EmailSummarySettings = {
  weeklySummary: true,
  monthlyReport: true
};

const CharitySettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(DEFAULT_NOTIFICATION_SETTINGS);
  const [emailSummarySettings, setEmailSummarySettings] = useState<EmailSummarySettings>(DEFAULT_EMAIL_SETTINGS);
  const [userEmail, setUserEmail] = useState<string>('');

  // Load settings data
  const loadSettingsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be ready
      console.log('[CharitySettings] Waiting for auth to be ready...');
      await waitForAuthReady(5000);

      // Get user profile for email
      console.log('[CharitySettings] Fetching user profile...');
      const userResult = await userService.getUserProfile(user.id);

      if (userResult.success && userResult.data) {
        setUserEmail(userResult.data.email);
      }

      // Load notification preferences from localStorage
      // TODO: Replace with backend API call when notification_preferences table is created
      const storedNotificationSettings = localStorage.getItem(`notification_settings_${user.id}`);
      if (storedNotificationSettings) {
        try {
          const parsed = JSON.parse(storedNotificationSettings);
          setNotificationSettings(parsed);
        } catch (err) {
          console.error('[CharitySettings] Error parsing stored notification settings:', err);
          // Use defaults if parsing fails
          setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        }
      } else {
        // Use defaults for first-time users
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
      }

      // Load email summary settings from localStorage
      // TODO: Replace with backend API call when notification_preferences table is created
      const storedEmailSettings = localStorage.getItem(`email_summary_settings_${user.id}`);
      if (storedEmailSettings) {
        try {
          const parsed = JSON.parse(storedEmailSettings);
          setEmailSummarySettings(parsed);
        } catch (err) {
          console.error('[CharitySettings] Error parsing stored email settings:', err);
          setEmailSummarySettings(DEFAULT_EMAIL_SETTINGS);
        }
      } else {
        setEmailSummarySettings(DEFAULT_EMAIL_SETTINGS);
      }

    } catch (err: any) {
      console.error('[CharitySettings] Error loading settings:', err);
      setError(err.message || 'Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadSettingsData();
    }
  }, [user?.id]);

  const handleToggleNotification = (id: string, type: 'email' | 'inApp') => {
    setNotificationSettings(prev =>
      prev.map(setting =>
        setting.id === id
          ? { ...setting, [type]: !setting[type] }
          : setting
      )
    );
  };

  const handleToggleEmailSummary = (type: 'weeklySummary' | 'monthlyReport') => {
    setEmailSummarySettings(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);

      // Save to localStorage
      // TODO: Replace with backend API call when notification_preferences table is created
      localStorage.setItem(`notification_settings_${user.id}`, JSON.stringify(notificationSettings));
      localStorage.setItem(`email_summary_settings_${user.id}`, JSON.stringify(emailSummarySettings));

      // Future backend implementation would look like:
      /*
      await notificationService.updateUserPreferences(user.id, {
        notificationSettings,
        emailSummarySettings
      }, user.id);
      */

      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully',
        variant: 'default',
      });

    } catch (err: any) {
      console.error('[CharitySettings] Error saving settings:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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

  // Loading state
  if (loading) {
    return (
      <CharityLayout title="Settings">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CharityLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <CharityLayout title="Settings">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading settings</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button onClick={loadSettingsData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Settings">
      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Email Address:</span>
                <span className="text-sm font-medium">{userEmail}</span>
              </div>
              <p className="text-xs text-gray-500">
                Notifications will be sent to this email address
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences Card */}
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
              {Object.entries(groupedSettings).map(([category, settings], categoryIndex) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-lg font-robotobold text-blue-700">{category}</h3>
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
                  {categoryIndex !== Object.keys(groupedSettings).length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Summary Settings Card */}
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
                <Switch
                  id="weekly-summary"
                  checked={emailSummarySettings.weeklySummary}
                  onCheckedChange={() => handleToggleEmailSummary('weeklySummary')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Monthly Financial Report</p>
                  <p className="text-sm text-gray-500">Monthly summary of donations and fund releases</p>
                </div>
                <Switch
                  id="monthly-report"
                  checked={emailSummarySettings.monthlyReport}
                  onCheckedChange={() => handleToggleEmailSummary('monthlyReport')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Note */}
        {/* <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Notification preferences are currently stored locally.
              These settings will be migrated to server-side storage in a future update.
            </p>
          </CardContent>
        </Card> */}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" className="min-w-[160px] bg-blue-700 hover:bg-blue-600" disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </CharityLayout>
  );
};

export default CharitySettings;
