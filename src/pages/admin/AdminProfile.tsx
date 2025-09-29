import React, { useState, useEffect } from 'react';
import { User, Save, Shield, Settings, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AdminLayout from '@/components/admin/AdminLayout';
import ProfileImageUpload from '@/components/ui/ProfileImageUpload';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as userService from '@/services/userService';
import { adminProfileSchema } from '@/utils/validation';

// Form schema
const formSchema = adminProfileSchema;
type FormData = z.infer<typeof formSchema>;

const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
    },
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const result = await userService.getUserProfile(user.id);

        if (result.success && result.data) {
          const profileData = result.data;
          setUserProfile(profileData);
          form.reset({
            fullName: profileData.fullName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            department: '', // These would need to be added to the profile schema
            position: '',
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, form, toast]);

  const handleSubmit = async (data: FormData) => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await userService.updateUserProfile(
        user.id,
        {
          fullName: data.fullName,
        },
        user.id
      );

      if (result.success) {
        setUserProfile(result.data);
        setIsEditing(false);
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await userService.uploadUserAvatar(user.id, file, user.id);

      if (result.success && result.data) {
        // Update local profile state
        setUserProfile((prev: any) => ({
          ...prev,
          avatarUrl: result.data?.avatarUrl,
        }));
        return { success: true, url: result.data.avatarUrl };
      } else {
        return { success: false, error: result.error || 'Upload failed' };
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      return { success: false, error: 'Upload failed' };
    }
  };

  if (loading && !userProfile) {
    return (
      <AdminLayout title="My Profile">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="My Profile">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Picture Section */}
        <div className="lg:col-span-1">
          <ProfileImageUpload
            currentImageUrl={userProfile?.avatarUrl}
            onImageUpload={handleAvatarUpload}
            fallbackText={userProfile?.fullName ? userProfile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'A'}
            imageType="avatar"
            size="lg"
          />

          {/* Admin Status Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-clearcause-primary" />
                Admin Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Role</span>
                  <Badge variant="outline" className="bg-clearcause-primary/10 text-clearcause-primary border-clearcause-primary">
                    Administrator
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Verified</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Verified
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Access Level</span>
                  <span className="text-sm font-medium">Full Access</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Information Section */}
        <div className="lg:col-span-2">
          <Card className="bg-white shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Manage your admin account information</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-gray-500 hover:text-clearcause-primary"
                disabled={loading}
              >
                <Settings className="h-4 w-4 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing || loading}
                            className={!isEditing ? "bg-gray-50" : ""}
                            placeholder="Enter your full name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            disabled={true} // Email should not be editable
                            className="bg-gray-50"
                            placeholder="your.email@clearcause.org"
                          />
                        </FormControl>
                        <FormDescription>
                          Email cannot be changed. Contact system administrator for email updates.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing || loading}
                            className={!isEditing ? "bg-gray-50" : ""}
                            placeholder="+1 (555) 123-4567"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing || loading}
                            className={!isEditing ? "bg-gray-50" : ""}
                            placeholder="e.g., Operations, Finance, Technology"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Position</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing || loading}
                            className={!isEditing ? "bg-gray-50" : ""}
                            placeholder="e.g., Platform Administrator, Financial Manager"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-clearcause-primary border-clearcause-primary"
                    >
                      Change Password
                    </Button>
                  </div>

                  {isEditing && (
                    <div className="pt-4 flex gap-2">
                      <Button
                        type="submit"
                        className="bg-clearcause-primary hover:bg-clearcause-secondary"
                        disabled={loading}
                      >
                        <Save className="h-4 w-4 mr-1.5" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          form.reset();
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools & Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="bg-white shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-clearcause-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>Administrative tools and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  User Management
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Platform Settings
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Recent Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Verified charity</span>
                  <span>2h ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Updated settings</span>
                  <span>1d ago</span>
                </div>
                <div className="flex justify-between">
                  <span>Reviewed campaign</span>
                  <span>3d ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;