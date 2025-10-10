
import React, { useState, useEffect, useRef } from 'react';
import { Badge, Award, Save, Edit2, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DonorLayout from '@/components/layout/DonorLayout';
import ProfileImageUpload from '@/components/ui/ProfileImageUpload';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as userService from '@/services/userService';
import { donorProfileSchema } from '@/utils/validation';

// Form schema
const formSchema = donorProfileSchema.extend({
  phone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Sample badges - in a real app, this would come from an API
const sampleBadges = [
  { id: "b1", name: "First Donation", icon: "🎖️", description: "Made your first donation" },
  { id: "b2", name: "Regular Giver", icon: "⭐", description: "Donated consistently for 3 months" },
  { id: "b3", name: "Water Advocate", icon: "💧", description: "Supported 3 water-related campaigns" }
];

const DonorProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [badges] = useState(sampleBadges);
  const loadingRef = useRef(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      isAnonymous: false,
    },
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id || !user.email || typeof user.id !== 'string') {
        console.log('[DonorProfile] User not fully available yet, skipping profile load');
        return;
      }

      if (loading || loadingRef.current) {
        console.log('[DonorProfile] Already loading, skipping duplicate request');
        return;
      }

      // Skip if we've already loaded this user's profile
      if (loadedUserIdRef.current === user.id && userProfile) {
        console.log('[DonorProfile] Profile already loaded for this user, skipping');
        return;
      }

      // Clear previous user's data if user changed
      if (loadedUserIdRef.current && loadedUserIdRef.current !== user.id) {
        console.log('[DonorProfile] User changed, clearing previous profile data');
        setUserProfile(null);
        loadedUserIdRef.current = null;
      }

      try {
        setLoading(true);
        loadingRef.current = true;

        const result = await userService.getUserProfile(user.id);

        if (result.success && result.data) {
          const profileData = result.data;
          setUserProfile(profileData);
          loadedUserIdRef.current = user.id; // Mark this user as loaded
          form.reset({
            fullName: profileData.fullName || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            isAnonymous: false, // This would come from user preferences
          });
        } else {
          console.warn('[DonorProfile] No profile data returned:', result);
          // Use user data as fallback
          const fallbackProfile = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          };
          setUserProfile(fallbackProfile);
          loadedUserIdRef.current = user.id; // Mark this user as loaded
          form.reset({
            fullName: user.fullName || '',
            email: user.email || '',
            phone: user.phone || '',
            isAnonymous: false,
          });
        }
      } catch (error) {
        console.error('[DonorProfile] Failed to load profile:', error);

        // Use user data as fallback on error - always set userProfile to prevent infinite loading
        const fallbackProfile = {
          id: user.id,
          fullName: user.fullName || '',
          email: user.email || '',
          avatarUrl: user.avatarUrl,
          phone: user.phone || '',
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt || '',
          updatedAt: user.updatedAt || '',
        };
        setUserProfile(fallbackProfile);
        loadedUserIdRef.current = user.id; // Mark this user as loaded
        form.reset({
          fullName: user.fullName || '',
          email: user.email || '',
          phone: user.phone || '',
          isAnonymous: false,
        });

        // Only show error toast if we don't have basic user data
        if (!user.email) {
          toast({
            title: "Error",
            description: "Failed to load profile data. Please refresh the page.",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    // Add a small delay to allow auth to settle and session to sync
    const timeoutId = setTimeout(loadProfile, 300);
    return () => {
      clearTimeout(timeoutId);
      // Clean up loading states on unmount
      loadingRef.current = false;
    };
  }, [user?.id, form, toast]);

  const handleSubmit = async (data: FormData) => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await userService.updateUserProfile(
        user.id,
        {
          fullName: data.fullName,
          phone: data.phone,
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
  
  // Show loading state if we don't have user data yet or are loading profile
  if (!user || loading || (!userProfile && user)) {
    return (
      <DonorLayout title="My Profile">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto mb-4"></div>
            <p className="text-gray-500">
              {!user ? 'Authenticating...' : 'Loading profile...'}
            </p>
          </div>
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="My Profile">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile Picture Section */}
        <div className="lg:col-span-1">
          <ProfileImageUpload
            currentImageUrl={userProfile?.avatarUrl}
            onImageUpload={handleAvatarUpload}
            fallbackText={userProfile?.fullName ? userProfile.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
            imageType="avatar"
            size="lg"
          />
        </div>

        {/* Account Information Section */}
        <div className="lg:col-span-2">
          <Card className="bg-white shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Details
                </CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-gray-500 hover:text-clearcause-primary"
                disabled={loading}
              >
                <Edit2 className="h-4 w-4 mr-1" />
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
                            placeholder="your.email@example.com"
                          />
                        </FormControl>
                        <FormDescription>
                          Email cannot be changed. Contact support if you need to update your email.
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
                  <div className="pt-4 border-t">
                    <FormField
                      control={form.control}
                      name="isAnonymous"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Anonymous Donations</FormLabel>
                            <FormDescription>
                              When enabled, your name will not be shown on public donation lists
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Badges Section */}
        <div className="lg:col-span-1">
          <Card className="bg-white shadow h-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Badge className="h-5 w-5 text-clearcause-primary" />
                <CardTitle>Achievements</CardTitle>
              </div>
              <CardDescription>Badges earned through your giving journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center bg-gray-50 p-3 rounded-md">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-clearcause-primary/10 text-clearcause-primary mr-3">
                      <span className="text-xl">{badge.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{badge.name}</h4>
                      <p className="text-xs text-gray-500">{badge.description}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-center bg-gray-50 p-4 rounded-md border-2 border-dashed border-gray-200 mt-4">
                  <div className="text-center">
                    <Award className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Continue donating to earn more badges!</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DonorLayout>
  );
};

export default DonorProfile;
