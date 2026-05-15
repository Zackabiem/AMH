import { supabase } from './supabase';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string
) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link
    });
    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (err) {
    console.error('Exception creating notification:', err);
  }
};
