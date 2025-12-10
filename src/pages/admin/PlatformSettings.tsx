
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Tag,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as adminService from '@/services/adminService';
import { PlatformSetting, CampaignCategory } from '@/lib/types';

const PlatformSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Campaign Categories State
  const [categories, setCategories] = useState<CampaignCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    category?: CampaignCategory;
  }>({ open: false, mode: 'create' });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
  });

  // Load platform settings
  useEffect(() => {
    loadPlatformSettings();
  }, [user]);

  // Load campaign categories
  useEffect(() => {
    loadCategories();
  }, []);

  const loadPlatformSettings = async () => {
    if (!user?.id) return;

    try {
      setSettingsLoading(true);
      const result = await adminService.getPlatformSettings(user.id);

      if (result.success && result.data) {
        setPlatformSettings(result.data);

        // Build settings values object
        const values: Record<string, any> = {};
        result.data.forEach(setting => {
          values[setting.key] = setting.value;
        });
        setSettingsValues(values);
      }
    } catch (error) {
      console.error('Failed to load platform settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load platform settings',
        variant: 'destructive',
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const result = await adminService.getCampaignCategories(true);

      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign categories',
        variant: 'destructive',
      });
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettingsValues(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;

    try {
      // Update each changed setting
      for (const setting of platformSettings) {
        if (settingsValues[setting.key] !== setting.value) {
          await adminService.updatePlatformSetting(
            setting.key,
            settingsValues[setting.key],
            user.id
          );
        }
      }

      toast({
        title: 'Success',
        description: 'Platform settings updated successfully',
      });

      setHasChanges(false);
      loadPlatformSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save platform settings',
        variant: 'destructive',
      });
    }
  };

  const handleOpenCategoryDialog = (mode: 'create' | 'edit', category?: CampaignCategory) => {
    if (mode === 'edit' && category) {
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        icon: category.icon || '',
      });
    } else {
      setCategoryForm({
        name: '',
        slug: '',
        description: '',
        icon: '',
      });
    }
    setCategoryDialog({ open: true, mode, category });
  };

  const handleSaveCategory = async () => {
    if (!user?.id) return;

    try {
      if (categoryDialog.mode === 'create') {
        await adminService.createCampaignCategory(
          {
            name: categoryForm.name,
            slug: categoryForm.slug,
            description: categoryForm.description,
            icon: categoryForm.icon,
          },
          user.id
        );
        toast({
          title: 'Success',
          description: 'Campaign category created successfully',
        });
      } else if (categoryDialog.category) {
        await adminService.updateCampaignCategory(
          categoryDialog.category.id,
          {
            name: categoryForm.name,
            slug: categoryForm.slug,
            description: categoryForm.description,
            icon: categoryForm.icon,
          },
          user.id
        );
        toast({
          title: 'Success',
          description: 'Campaign category updated successfully',
        });
      }

      setCategoryDialog({ open: false, mode: 'create' });
      loadCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast({
        title: 'Error',
        description: 'Failed to save campaign category',
        variant: 'destructive',
      });
    }
  };

  const handleToggleCategoryStatus = async (category: CampaignCategory) => {
    if (!user?.id) return;

    try {
      await adminService.updateCampaignCategory(
        category.id,
        { isActive: !category.isActive },
        user.id
      );
      toast({
        title: 'Success',
        description: `Category ${!category.isActive ? 'activated' : 'deactivated'} successfully`,
      });
      loadCategories();
    } catch (error) {
      console.error('Failed to toggle category:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;

    try {
      await adminService.deleteCampaignCategory(categoryId, user.id);
      toast({
        title: 'Success',
        description: 'Campaign category deleted successfully',
      });
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign category',
        variant: 'destructive',
      });
    }
  };

  const renderSettingInput = (setting: PlatformSetting) => {
    const value = settingsValues[setting.key];
    const type = typeof value;

    if (type === 'boolean') {
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleSettingChange(setting.key, checked)}
          />
          <span className="text-sm text-muted-foreground">
            {value ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      );
    }

    if (type === 'number') {
      // Special handling for platform_fee_percentage
      if (setting.key === 'platform_fee_percentage') {
        return (
          <div className="space-y-2">
            <Input
              type="number"
              value={value}
              min={0}
              max={20}
              step={0.01}
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()}
              onBlur={(e) => {
                const newValue = parseFloat(e.target.value);
                if (newValue < 0 || newValue > 20) {
                  toast({
                    title: 'Invalid value',
                    description: 'Platform fee must be between 0% and 20%',
                    variant: 'destructive',
                  });
                  // Reset to previous valid value
                  const setting = platformSettings.find(s => s.key === 'platform_fee_percentage');
                  if (setting) {
                    handleSettingChange('platform_fee_percentage', setting.value);
                  }
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Current: {value}% • Valid range: 0% - 20%
            </p>
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ Changes apply to new donations only
            </div>
          </div>
        );
      }

      // Special handling for minimum_donation_amount
      if (setting.key === 'minimum_donation_amount') {
        return (
          <div className="space-y-2">
            <Input
              type="number"
              value={value}
              min={100}
              max={10000}
              onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value) || 0)}
              onWheel={(e) => e.currentTarget.blur()}
              onBlur={(e) => {
                const newValue = parseFloat(e.target.value);
                if (newValue < 100 || newValue > 10000) {
                  toast({
                    title: 'Invalid value',
                    description: 'Minimum donation must be between ₱100 and ₱10,000',
                    variant: 'destructive',
                  });
                  // Reset to previous valid value
                  const setting = platformSettings.find(s => s.key === 'minimum_donation_amount');
                  if (setting) {
                    handleSettingChange('minimum_donation_amount', setting.value);
                  }
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Current: ₱{value} • Valid range: ₱100 - ₱10,000
            </p>
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              ℹ️ Setting too high may discourage small donors. Recommended: ₱100-₱500
            </div>
          </div>
        );
      }

      // Default number input for other settings
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
        />
      );
    }

    return (
      <Input
        type="text"
        value={value}
        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
      />
    );
  };

  const groupedSettings = platformSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, PlatformSetting[]>);

  return (
    <AdminLayout title="Platform Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">Manage site configuration and content</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="categories">Campaign Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {Object.entries(groupedSettings).map(([category, settings]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="capitalize">{category} Settings</CardTitle>
                      <CardDescription>
                        Configure {category} related platform settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {settings.map(setting => (
                        <div key={setting.key} className="space-y-2">
                          <Label htmlFor={setting.key}>
                            {setting.key.split('_').map(word =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Label>
                          {setting.description && (
                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                          )}
                          {renderSettingInput(setting)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {hasChanges && (
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadPlatformSettings();
                        setHasChanges(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button onClick={handleSaveSettings}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Campaign Categories</CardTitle>
                    <CardDescription>Manage available campaign categories</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenCategoryDialog('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No categories found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Display Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded">{category.slug}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={category.isActive ? 'default' : 'secondary'}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{category.displayOrder}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCategoryStatus(category)}
                            >
                              {category.isActive ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCategoryDialog('edit', category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {categoryDialog.mode === 'create' ? 'Add' : 'Edit'} Campaign Category
              </DialogTitle>
              <DialogDescription>
                {categoryDialog.mode === 'create'
                  ? 'Create a new campaign category for charities to choose from.'
                  : 'Update the campaign category details.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Education"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="e.g., education"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description of the category"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Optional)</Label>
                <Input
                  id="icon"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="e.g., GraduationCap"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: 'create' })}>
                Cancel
              </Button>
              <Button onClick={handleSaveCategory}>
                {categoryDialog.mode === 'create' ? 'Create' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default PlatformSettings;
