import React, { useState, useEffect } from "react";
import {
  Bell,
  Check,
  Trash2,
  Archive,
  X,
  RefreshCw,
  Filter,
  MailOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import * as notificationService from "@/services/notificationService";
import {
  Notification,
  NotificationStatus,
} from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  open,
  onOpenChange,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const status: NotificationStatus | undefined =
        activeTab === "unread" ? "unread" : undefined;

      const result = await notificationService.getUserNotifications(
        user.id,
        { page: 1, limit: 50 },
        status
      );

      if (result.success && result.data) {
        setNotifications(result.data);

        // Update unread count
        const unreadCount = result.data.filter(
          (n) => n.status === "unread"
        ).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user?.id) {
      loadNotifications();
    }
  }, [open, user?.id, activeTab]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const result = await notificationService.markAsRead(
        notificationId,
        user.id
      );

      if (result.success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, status: "read" as const } : n
          )
        );

        // Update unread count
        const unreadCount = notifications.filter(
          (n) => n.status === "unread" && n.id !== notificationId
        ).length;
        if (onUnreadCountChange) {
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const result = await notificationService.markAllAsRead(user.id);

      if (result.success) {
        toast({
          title: "All Marked as Read",
          description: result.message,
        });

        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: "read" as const }))
        );

        if (onUnreadCountChange) {
          onUnreadCountChange(0);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const result = await notificationService.deleteNotification(
        notificationId,
        user.id
      );

      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // Update unread count if deleted notification was unread
        const deletedNotification = notifications.find(
          (n) => n.id === notificationId
        );
        if (deletedNotification?.status === "unread" && onUnreadCountChange) {
          const unreadCount = notifications.filter(
            (n) => n.status === "unread" && n.id !== notificationId
          ).length;
          onUnreadCountChange(unreadCount);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (notification.status === "unread") {
      handleMarkAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onOpenChange(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    // You can customize icons based on notification type
    return <Bell className="w-4 h-4" />;
  };

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md font-poppinsregular">
        <SheetHeader>
          <SheetTitle className="font-robotobold">Notifications</SheetTitle>
          <SheetDescription>
            Stay updated on your campaigns, donations, and milestones
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "all" | "unread")}
          >
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="unread" className="relative">
                  Unread
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-2 px-1.5 py-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadNotifications}
                  disabled={loading}
                  className="hover:bg-blue-700 hover:text-white "
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="hover:bg-blue-700"
                  >
                    <MailOpen className="w-4 h-4 mr-1" />
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="h-[calc(100vh-12rem)] mt-4">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-lg mb-1">
                    No Notifications
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "unread"
                      ? "You're all caught up!"
                      : "You have no notifications yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                        notification.status === "unread"
                          ? "bg-primary/5 border-primary/20"
                          : "bg-background"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1 p-2 rounded-full ${
                            notification.status === "unread"
                              ? "bg-primary/10"
                              : "bg-muted"
                          }`}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-robotobold text-sm text-blue-700">
                              {notification.title}
                            </h4>
                            {notification.status === "unread" && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </span>

                            <div className="flex gap-1">
                              {notification.status === "unread" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(notification.id);
                                  }}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-blue-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notification.id);
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
