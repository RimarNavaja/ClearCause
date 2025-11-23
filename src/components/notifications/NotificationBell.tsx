import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import * as notificationService from "@/services/notificationService";
import NotificationCenter from "./NotificationCenter";

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Load initial unread count with delay to let auth stabilize
  useEffect(() => {
    if (!user?.id) return;

    const loadUnreadCount = async () => {
      try {
        const result = await notificationService.getUnreadCount(user.id);
        if (result.success && typeof result.data === "number") {
          setUnreadCount(result.data);
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    // Delay initial load by 2 seconds to let auth stabilize
    // This prevents race conditions with database connections during login
    console.log(
      "[NotificationBell] Delaying notification load by 2s for auth stabilization"
    );
    let intervalId: NodeJS.Timeout;

    const delayTimer = setTimeout(() => {
      console.log(
        "[NotificationBell] Loading unread count after auth stabilization"
      );
      loadUnreadCount();

      // Start polling after initial load
      intervalId = setInterval(loadUnreadCount, 30000);
    }, 2000);

    return () => {
      clearTimeout(delayTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id]);

  if (!user) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-blue-600/90"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      <NotificationCenter
        open={open}
        onOpenChange={setOpen}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
};

export default NotificationBell;
