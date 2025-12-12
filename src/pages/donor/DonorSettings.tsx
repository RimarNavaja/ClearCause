import React, { useState, useEffect } from "react";
import { Bell, MailCheck, Save, AlertCircle, Mail } from "lucide-react";
import DonorLayout from "@/components/layout/DonorLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { waitForAuthReady } from "@/utils/authHelper";
import * as userService from "@/services/userService";
import * as notificationService from "@/services/notificationService";

interface NotificationSetting {
  id: string;
  category: string;
  name: string;
  description: string;
  email: boolean;
  inApp: boolean;
  apiFieldBase: string; // Base name for API fields (e.g., 'DonationConfirmed')
}

interface EmailSummarySettings {
  weeklySummary: boolean;
  monthlyReport: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    id: "donation-confirmation",
    category: "Donations",
    name: "Donation Confirmations",
    description: "Receive confirmations when your donations are processed",
    email: true,
    inApp: true,
    apiFieldBase: "DonationConfirmed"
  },
  {
    id: "milestone-updates",
    category: "Campaign Updates",
    name: "Milestone Updates",
    description: "Get updates when campaigns you've supported reach milestones",
    email: true,
    inApp: true,
    apiFieldBase: "MilestoneCompleted" // Mapping to MilestoneCompleted or Verified? Usually Completed for donors.
  },
  {
    id: "impact-updates",
    category: "Campaign Updates",
    name: "Impact Updates",
    description:
      "Receive updates about the impact of campaigns you've supported",
    email: true,
    inApp: true,
    apiFieldBase: "CampaignUpdate"
  },
];

const DEFAULT_EMAIL_SETTINGS: EmailSummarySettings = {
  weeklySummary: true,
  monthlyReport: true,
};

const DonorSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState<
    NotificationSetting[]
  >(DEFAULT_NOTIFICATION_SETTINGS);
  const [emailSummarySettings, setEmailSummarySettings] =
    useState<EmailSummarySettings>(DEFAULT_EMAIL_SETTINGS);
  const [userEmail, setUserEmail] = useState<string>("");

  // Load settings data
  const loadSettingsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be ready
      await waitForAuthReady(5000);

      // Get user profile for email
      const userResult = await userService.getUserProfile(user.id);

      if (userResult.success && userResult.data) {
        setUserEmail(userResult.data.email);
      }

      // Load notification preferences from API
      const prefsResult = await notificationService.getNotificationPreferences(user.id);
      
      if (prefsResult.success && prefsResult.data) {
        const apiPrefs = prefsResult.data;
        
        // Map API prefs to UI settings
        setNotificationSettings(prev => prev.map(setting => {
          const emailKey = `email${setting.apiFieldBase}` as keyof typeof apiPrefs;
          const inAppKey = `inapp${setting.apiFieldBase}` as keyof typeof apiPrefs;
          
          return {
            ...setting,
            email: Boolean(apiPrefs[emailKey]),
            inApp: Boolean(apiPrefs[inAppKey])
          };
        }));
      }

      // Load email summary settings (Mock for now as schema support might be pending/separate)
      // If we had columns in DB, we'd map them. For now, keep local or default.
      const storedEmailSettings = localStorage.getItem(
        `donor_email_summary_settings_${user.id}`
      );
      if (storedEmailSettings) {
        try {
          const parsed = JSON.parse(storedEmailSettings);
          setEmailSummarySettings(parsed);
        } catch (err) {
          setEmailSummarySettings(DEFAULT_EMAIL_SETTINGS);
        }
      }

    } catch (err: any) {
      console.error("[DonorSettings] Error loading settings:", err);
      setError(err.message || "Failed to load settings data");
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

  const handleToggleNotification = (id: string, type: "email" | "inApp") => {
    setNotificationSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, [type]: !setting[type] } : setting
      )
    );
  };

  const handleToggleEmailSummary = (
    type: "weeklySummary" | "monthlyReport"
  ) => {
    setEmailSummarySettings((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);

      // Construct API payload
      const preferencesToUpdate: any = {};
      
      notificationSettings.forEach(setting => {
        preferencesToUpdate[`email${setting.apiFieldBase}`] = setting.email;
        preferencesToUpdate[`inapp${setting.apiFieldBase}`] = setting.inApp;
      });

      // Update via API
      await notificationService.updateNotificationPreferences(user.id, preferencesToUpdate);

      // Save email summary to local storage (until DB support)
      localStorage.setItem(
        `donor_email_summary_settings_${user.id}`,
        JSON.stringify(emailSummarySettings)
      );

      toast({
        title: "Success",
        description: "Notification preferences saved successfully",
        variant: "default",
      });
    } catch (err: any) {
      console.error("[DonorSettings] Error saving settings:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group settings by category
  const groupedSettings = notificationSettings.reduce<
    Record<string, NotificationSetting[]>
  >((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {});

  // Loading state
  if (loading) {
    return (
      <DonorLayout title="Settings">
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
      </DonorLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DonorLayout title="Settings">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Error loading settings
            </h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button onClick={loadSettingsData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="Settings">
      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Email Address:
                </span>
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
              Choose how you want to be notified about activity related to your
              donations and supported campaigns.
            </p>

            <div className="space-y-6">
              {Object.entries(groupedSettings).map(
                ([category, settings], categoryIndex) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-robotobold text-blue-700">
                      {category}
                    </h3>
                    <div className="space-y-4">
                      {settings.map((setting) => (
                        <div
                          key={setting.id}
                          className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-2"
                        >
                          <div>
                            <p className="font-medium">{setting.name}</p>
                            <p className="text-sm text-gray-500">
                              {setting.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${setting.id}-email`}
                              checked={setting.email}
                              onCheckedChange={() =>
                                handleToggleNotification(setting.id, "email")
                              }
                            />
                            <Label
                              htmlFor={`${setting.id}-email`}
                              className="flex items-center gap-1 cursor-pointer"
                            >
                              <Mail className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only">
                                Email
                              </span>
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${setting.id}-inapp`}
                              checked={setting.inApp}
                              onCheckedChange={() =>
                                handleToggleNotification(setting.id, "inApp")
                              }
                            />
                            <Label
                              htmlFor={`${setting.id}-inapp`}
                              className="flex items-center gap-1 cursor-pointer"
                            >
                              <Bell className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only">
                                In-App
                              </span>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {categoryIndex !==
                      Object.keys(groupedSettings).length - 1 && <Separator />}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Not implemented, this is for future implementations */}
        {/* Email Summary Settings Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5" />
              Email Summary Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose how often you'd like to receive summary emails about your
              supported campaigns.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Campaign Summary</p>
                  <p className="text-sm text-gray-500">
                    Weekly digest of campaign performance and updates
                  </p>
                </div>
                <Switch
                  id="weekly-summary"
                  checked={emailSummarySettings.weeklySummary}
                  onCheckedChange={() =>
                    handleToggleEmailSummary("weeklySummary")
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Monthly Impact Report</p>
                  <p className="text-sm text-gray-500">
                    Monthly summary of your donations and their impact
                  </p>
                </div>
                <Switch
                  id="monthly-report"
                  checked={emailSummarySettings.monthlyReport}
                  onCheckedChange={() =>
                    handleToggleEmailSummary("monthlyReport")
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" className="min-w-[160px] bg-blue-700 hover:bg-blue-600" disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </DonorLayout>
  );
};

export default DonorSettings;
