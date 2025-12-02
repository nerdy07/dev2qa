'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCollection } from '@/hooks/use-collection';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { query, collection, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  
  const notificationsQuery = React.useMemo(() => {
    if (!user?.id || !db) return null;
    try {
      return query(
        collection(db, 'notifications'),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
    } catch (error) {
      // If query fails due to permissions, return null to prevent error
      console.warn('Notifications query not available:', error);
      return null;
    }
  }, [user?.id]);

  const { data: notifications, loading, error } = useCollection<Notification>('notifications', notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  // Handle permission errors gracefully - don't show notifications if user doesn't have permission
  const hasPermissionError = error?.message?.includes('permission') || error?.message?.includes('Permission');

  const markAsRead = async (notificationId: string) => {
    if (!db || !user?.id) return;
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!db || !user?.id || !notifications) return;
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => {
          const notificationRef = doc(db, 'notifications', n.id);
          return updateDoc(notificationRef, { read: true });
        })
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {!hasPermissionError && unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : hasPermissionError ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Notifications unavailable</p>
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    !notification.read && "bg-blue-50/50 dark:bg-blue-950/10"
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    // Navigate to leave request if data contains leaveRequestId
                    if (notification.data?.leaveRequestId) {
                      router.push(`/dashboard/admin/leave/${notification.data.leaveRequestId}`);
                    }
                  }}
                  aria-pressed={!notification.read}
                >
                  <div className="flex-1">
                    <p className={cn("font-medium text-sm", !notification.read && "font-semibold")}>
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    {notification.createdAt && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  {!notification.read && (
                    <span
                      className="mt-2 h-2 w-2 rounded-full bg-info"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

