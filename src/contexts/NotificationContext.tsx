import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'bid' | 'offer' | 'shipment' | 'message' | 'system';
  read: boolean;
  created_at: string;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const user = auth?.user;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    const fetchNotifications = async (retryCount = 0) => {
      try {
        // Small delay to avoid immediate collision with App.tsx auth calls
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!isMounted) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          const errMsg = error.message || String(error);
          // Handle lock or network errors by retrying once
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 2) {
            setTimeout(() => fetchNotifications(retryCount + 1), 1000);
            return;
          }
          throw error;
        }

        if (data && isMounted) {
          setNotifications(data as Notification[]);
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        // Only log if it's not a lock or network error we've already handled or if we're out of retries
        if (!errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching notifications:', error);
        }
      }
    };

    fetchNotifications();

    const channel = supabase.channel(`notifications:${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, payload => {
        if (!isMounted) return;
        
        if (payload.eventType === 'INSERT') {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          if (!newNotif.read) {
            toast(newNotif.title, {
              description: newNotif.message,
              action: newNotif.link ? {
                label: 'View',
                onClick: () => window.location.href = newNotif.link!
              } : undefined,
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => {
            const updated = prev.map(n => n.id === payload.new.id ? payload.new as Notification : n);
            setUnreadCount(updated.filter(n => !n.read).length);
            return updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => {
            const updated = prev.filter(n => n.id !== payload.old.id);
            setUnreadCount(updated.filter(n => !n.read).length);
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0 || !user) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
