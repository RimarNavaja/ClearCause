import React, { useState, useEffect } from "react";
import { Award, Edit2, Save, User, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import DonorLayout from "@/components/layout/DonorLayout";
import ProfileImageUpload from "@/components/ui/ProfileImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as userService from "@/services/userService";
import { donorProfileSchema, donorCategorySchema, organizationTypeSchema, emailSchema, phoneSchema } from "@/utils/validation";
import { getDonorAchievements } from "@/services/achievementService";
import { DonorAchievement } from "@/lib/types";
import { AchievementBadge } from "@/components/ui/achievements/AchievementBadge";
import { DonorCategoryBadge, formatDonorName } from "@/components/ui/DonorCategoryBadge";

// Form schema for the profile page
const formSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long').regex(/^[a-zA-Z\s\-\.\']+$/, "Full name contains invalid characters"),
  email: emailSchema,
  phone: phoneSchema,
  isAnonymous: z.boolean().optional(),
});
type FormData = z.infer<typeof formSchema>;

const DonorProfile: React.FC = () => {
  const { user, refreshUser, updateEmail } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState<
    DonorAchievement[]
  >([]);

  // Fetch user profile data using React Query
  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError,
  } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const result = await userService.getUserProfile(user.id);
      if (result.success) {
        return result.data;
      }
      throw new Error(result.error || "Failed to fetch profile");
    },
    enabled: !!user?.id, // Only run query if user.id exists
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for updating user profile
  const updateProfileMutation = useMutation({
    mutationFn: (data: {
      fullName?: string;
      phone?: string;
      isAnonymous?: boolean;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      return userService.updateUserProfile(user.id, data, user.id);
    },
    onSuccess: async (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
        await refreshUser();
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        });
        setIsEditing(false);
      } else {
        throw new Error(result.error || "Update failed");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for uploading avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => {
      if (!user?.id) throw new Error("User not authenticated");
      return userService.uploadUserAvatar(user.id, file, user.id);
    },
    onSuccess: async (result) => {
      if (result.success) {
        // Invalidate the query cache
        queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });

        // Refresh the user context to update the navbar avatar
        await refreshUser();

        toast({
          title: "Success",
          description: "Avatar updated successfully.",
        });
        return { success: true, url: result.data?.avatarUrl };
      }
      throw new Error(result.error || "Upload failed");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      isAnonymous: false,
    },
  });

  // Populate form with profile data once it's loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        fullName: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        isAnonymous: profile.isAnonymous || false,
      });
    }
  }, [profile, form]);

  // Fetch recent achievements
  useEffect(() => {
    const fetchRecentAchievements = async () => {
      if (!user) return;
      const result = await getDonorAchievements(user.id);
      if (result.success && result.data) {
        // Show most recent 6
        setRecentAchievements(result.data.slice(0, 6));
      }
    };
    fetchRecentAchievements();
  }, [user]);

  const handleSubmit = async (data: FormData) => {
    // Handle email update if changed and not Google provider
    if (data.email && data.email !== profile?.email) {
      if (user?.provider === 'google') {
        toast({
          title: "Cannot Change Email",
          description: "Email cannot be changed since you signed up with Google.",
          variant: "destructive"
        });
        return;
      }

      const result = await updateEmail(data.email);
      if (result.success) {
        toast({
          title: "Verification Required",
          description: result.message || "Please check your new email to confirm the change.",
        });
      } else {
        toast({
          title: "Email Update Failed",
          description: result.error,
          variant: "destructive"
        });
        return; // Stop if email update failed
      }
    }

    updateProfileMutation.mutate({
      fullName: data.fullName,
      phone: data.phone,
      isAnonymous: data.isAnonymous,
    });
  };

  const handleAvatarUpload = async (file: File) => {
    return await uploadAvatarMutation.mutateAsync(file);
  };

  const isMutating = 
    updateProfileMutation.isPending || uploadAvatarMutation.isPending;

  // Loading skeleton
  if (isLoadingProfile) {
    return (
      <DonorLayout title="My Profile">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col items-center">
            <Skeleton className="h-40 w-40 rounded-full" />
            <Skeleton className="h-8 w-32 mt-4" />
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DonorLayout>
    );
  }

  if (isError) {
    return (
      <DonorLayout title="My Profile">
        <div className="text-center py-10">
          <p className="text-red-500">
            Failed to load profile data. Please try again later.
          </p>
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="My Profile" >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-poppinsregular">
        {/* Profile Picture Section */}
        <div className="lg:col-span-1">
          <Card className="bg-white shadow-sm">
            <CardHeader className="items-center">
              <ProfileImageUpload
                currentImageUrl={profile?.avatarUrl}
                onImageUpload={handleAvatarUpload}
                fallbackText={
                  profile?.fullName
                    ? profile.fullName.charAt(0).toUpperCase()
                    : "D"
                }
                imageType="avatar"
                size="lg"
              />
            </CardHeader>
            <CardContent className="text-center">
              <h3 className="text-xl font-bold">{formatDonorName(profile)}</h3>
              <p className="text-sm text-gray-500">{profile?.email}</p>
              {profile?.donorCategory && (
                <div className="mt-2">
                  <DonorCategoryBadge user={profile} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Information Section */}
        <div className="lg:col-span-2">
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Personal Details
                </CardTitle>
                <CardDescription>
                  Manage your account information
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-600/80"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isMutating}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={!isEditing || isMutating}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => {
                      const isGoogle = user?.provider === 'google';
                      return (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            disabled={!isEditing || isMutating || isGoogle}
                          />
                        </FormControl>
                        <FormDescription>
                          {isGoogle
                            ? "Email cannot be changed since you signed up with Google."
                            : "Changing your email will require verification."} 
                        </FormDescription>
                      </FormItem>
                    )}}
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
                            type="tel"
                            disabled={!isEditing || isMutating}
                            placeholder="Add a phone number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {profile?.role === 'donor' && profile?.donorCategory && (
                    <div className="space-y-4 pt-2 pb-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Donor Type</label>
                        <Input
                          value={profile.donorCategory === 'individual' ? 'Individual' : 'Organization'}
                          disabled={true}
                          className="bg-gray-50"
                        />
                      </div>
                      {profile.donorCategory === 'organization' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Organization Name</label>
                            <Input
                              value={profile.donorOrganizationName || ''}
                              disabled={true}
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Organization Type</label>
                            <Input
                              value={profile.donorOrganizationType ? 
                                       profile.donorOrganizationType.charAt(0).toUpperCase() + profile.donorOrganizationType.slice(1).replace(/_/g, ' ') : ''}
                              disabled={true}
                              className="bg-gray-50"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="isAnonymous"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Anonymous Donations</FormLabel>
                          <FormDescription>
                            Hide your name on public donation lists.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isMutating}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="submit"
                        disabled={isMutating}
                        className="bg-blue-600 hover:bg-blue-600/80"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateProfileMutation.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={isMutating}
                        className="hover:bg-blue-600/90"
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

        {/* Achievements Section */}
        <div className="lg:col-span-3">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Recent Achievements
                  </CardTitle>
                  <CardDescription>
                    Badges earned through your giving journey
                  </CardDescription>
                </div>
                <Button
                  variant="link"
                  onClick={() => navigate("/donor/achievements")}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentAchievements.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {recentAchievements.map((da) => (
                    <AchievementBadge
                      key={da.id}
                      achievement={da.achievement!}
                      earned={true}
                      earnedAt={da.earned_at}
                      size="md"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No achievements yet. Make your first donation to get started!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DonorLayout>
  );
};

export default DonorProfile;