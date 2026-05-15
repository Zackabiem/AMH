import React, { useEffect, useState, useRef } from 'react';
import { Send, User, MessageSquare, Search, ChevronLeft, Loader2, X, Package, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  text: string;
  sender_id: string;
  created_at: any;
}

interface Conversation {
  id: string;
  participants: string[];
  participant_names: { [key: string]: string };
  last_message: string;
  last_message_at: any;
  updated_at: any;
}

interface ChatProps {
  target?: { userId: string; userName: string; initialMessage?: string } | null;
  setTarget?: (target: { userId: string; userName: string; initialMessage?: string } | null) => void;
}

const Chat: React.FC<ChatProps> = ({ target, setTarget }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [productContext, setProductContext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileList, setShowMobileList] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth() || {};

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchConversations = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [user.id])
          .order('updated_at', { ascending: false });

        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchConversations(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (isMounted && data) {
          setConversations(data);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching conversations:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchConversations();

    const subscription = supabase.channel('conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations', filter: `participants=cs.{${user.id}}` }, () => {
        if (isMounted) fetchConversations();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  // Handle target prop (start/open conversation)
  useEffect(() => {
    if (!target || !user || !profile) return;

    let isMounted = true;

    const startConversation = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 600));
        if (!isMounted) return;

        // Check if conversation already exists
        const { data: existing, error: fetchError } = await supabase
          .from('conversations')
          .select('*')
          .contains('participants', [user.id, target.userId]);

        if (fetchError) {
          const errMsg = fetchError.message || String(fetchError);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => startConversation(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw fetchError;
        }

        if (existing && existing.length > 0) {
          if (isMounted) {
            setActiveConversation(existing[0] as Conversation);
            setShowMobileList(false);
            if (target.initialMessage) {
              setInput(target.initialMessage);
              setProductContext(target.initialMessage);
            }
          }
        } else {
          // Create new conversation
          const participants = [user.id, target.userId].sort();
          const conversationId = participants.join('_');
          const newConvData = {
            id: conversationId,
            participants,
            participant_names: {
              [user.id]: profile.username || 'User',
              [target.userId]: target.userName
            },
            last_message: '',
            last_message_at: null,
            updated_at: new Date().toISOString()
          };
          
          const { error: insertError } = await supabase
            .from('conversations')
            .insert(newConvData);
            
          if (insertError) {
            const errMsg = insertError.message || String(insertError);
            if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
              setTimeout(() => startConversation(retryCount + 1), 1000 * (retryCount + 1));
              return;
            }
            throw insertError;
          }

          if (isMounted) {
            setActiveConversation(newConvData as Conversation);
            setShowMobileList(false);
            if (target.initialMessage) {
              setInput(target.initialMessage);
              setProductContext(target.initialMessage);
            }
          }
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error starting conversation:', error);
        }
      } finally {
        // Clear target so it doesn't trigger again
        if (isMounted && setTarget) setTarget(null);
      }
    };

    startConversation();
    return () => { isMounted = false; };
  }, [target, user, profile]);

  // User Search
  useEffect(() => {
    if (!userSearchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    let isMounted = true;

    const searchUsers = async (retryCount = 0) => {
      if (isMounted) setSearching(true);
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('users')
          .select('id, name, display_name, username, active_role')
          .or(`name.ilike.%${userSearchQuery}%,display_name.ilike.%${userSearchQuery}%,username.ilike.%${userSearchQuery}%`)
          .limit(5);
          
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => searchUsers(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (isMounted && data) {
          setSearchResults(data.filter((u: any) => u.id !== user.id));
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Search error:', error);
        }
      } finally {
        if (isMounted) setSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [userSearchQuery, user]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    const fetchMessages = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('private_messages')
          .select('*')
          .eq('conversation_id', activeConversation.id)
          .order('created_at', { ascending: true })
          .limit(100);

        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchMessages(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (isMounted && data) {
          setMessages(data);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching messages:', error);
        }
      }
    };

    fetchMessages();

    const subscription = supabase.channel('messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages', filter: `conversation_id=eq.${activeConversation.id}` }, () => {
        if (isMounted) fetchMessages();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [activeConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !activeConversation) return;

    const text = input;
    setInput('');

    try {
      const messageData = {
        conversation_id: activeConversation.id,
        sender_id: user.id,
        text: text,
      };

      await supabase
        .from('private_messages')
        .insert(messageData);

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', activeConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConversation) return;

    setUploadingImage(true);
    try {
      const signResponse = await fetch('/api/cloudinary/sign', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'chat_attachments' })
      });
      const signData = await signResponse.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);
      formData.append('folder', 'chat_attachments');

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );
      
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadData.error?.message || 'Upload failed');

      const imageUrl = uploadData.secure_url;
      const text = `[[IMAGE:${imageUrl}]]`;

      const messageData = {
        conversation_id: activeConversation.id,
        sender_id: user.id,
        text: text,
      };

      await supabase.from('private_messages').insert(messageData);

      await supabase
        .from('conversations')
        .update({
          last_message: 'Image attachment',
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', activeConversation.id);

    } catch (error) {
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getOtherParticipantName = (conv: Conversation) => {
    const otherId = conv.participants.find(id => id !== user?.id);
    return otherId ? conv.participant_names[otherId] : 'User';
  };

  const handleStartNewChat = (targetUser: any) => {
    if (setTarget) {
      setTarget({ userId: targetUser.id, userName: targetUser.display_name || targetUser.username || targetUser.name || 'User' });
    }
    setIsSearchModalOpen(false);
    setUserSearchQuery('');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] md:h-screen flex bg-white overflow-hidden">
      {/* Sidebar: Conversation List */}
      <aside className={cn(
        "w-full md:w-80 lg:w-96 border-r border-black/5 flex flex-col bg-gray-50 transition-all duration-300",
        !showMobileList && "hidden md:flex"
      )}>
        <header className="p-6 bg-white border-b border-black/5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Messages</h2>
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
            >
              <MessageSquare size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="text-gray-300" size={32} />
              </div>
              <p className="text-sm text-gray-400 font-bold">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Message a seller or search for a user to start a chat!</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConversation(conv);
                  setShowMobileList(false);
                }}
                className={cn(
                  "w-full p-4 flex items-center gap-4 hover:bg-white transition-all border-b border-black/5",
                  activeConversation?.id === conv.id ? "bg-white border-l-4 border-l-emerald-600" : "bg-transparent"
                )}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                  <User size={24} />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-sm text-gray-900 truncate">{getOtherParticipantName(conv)}</h3>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.last_message?.startsWith('[[IMAGE:') && conv.last_message?.endsWith(']]') 
                      ? '📷 Image attachment' 
                      : (conv.last_message || 'Start a conversation')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main: Chat View */}
      <main className={cn(
        "flex-1 flex flex-col bg-white transition-all duration-300",
        showMobileList && "hidden md:flex"
      )}>
        {activeConversation ? (
          <>
            <header className="p-4 md:p-6 bg-white border-b border-black/5 flex items-center gap-4">
              <button 
                onClick={() => setShowMobileList(true)}
                className="md:hidden p-2 text-gray-400 hover:text-gray-900"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <User size={20} />
              </div>
              <div>
                <h2 className="font-black text-lg text-gray-900">{getOtherParticipantName(activeConversation)}</h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Online</p>
                </div>
              </div>
            </header>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50"
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex",
                    msg.sender_id === user?.id ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[80%] p-4 rounded-3xl shadow-sm",
                    msg.sender_id === user?.id 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-white text-gray-900 rounded-tl-none border border-black/5"
                  )}>
                    {msg.text.startsWith('[[IMAGE:') && msg.text.endsWith(']]') ? (
                      <img 
                        src={msg.text.slice(8, -2)} 
                        alt="Attachment" 
                        className="max-w-[200px] sm:max-w-xs rounded-xl shadow-sm object-cover bg-white/10" 
                      />
                    ) : msg.text.includes('interested in your product:') ? (
                      <div className="space-y-2">
                        <div className={cn(
                          "p-3 rounded-2xl text-xs font-bold flex items-center gap-2",
                          msg.sender_id === user?.id ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <Package size={14} />
                          Product Inquiry
                        </div>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    )}
                    <p className={cn(
                      "text-[8px] mt-2 font-bold text-right",
                      msg.sender_id === user?.id ? "text-white/50" : "text-gray-400"
                    )}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-white border-t border-black/5">
              <AnimatePresence>
                {productContext && input.includes(productContext) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Package size={16} />
                      <span className="text-xs font-black uppercase tracking-widest">Inquiring about product</span>
                    </div>
                    <button 
                      onClick={() => {
                        setProductContext(null);
                        setInput('');
                      }}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={sendMessage} className="p-4 md:p-6 flex gap-3 items-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="p-4 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all disabled:opacity-50"
                  title="Upload Image"
                >
                  {uploadingImage ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <button 
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-emerald-100"
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/30">
            <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mb-6 shadow-sm">
              <MessageSquare className="text-emerald-100" size={48} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Your Conversations</h3>
            <p className="text-gray-400 max-w-xs">Select a conversation from the list or message a seller to start chatting.</p>
          </div>
        )}
      </main>

      {/* User Search Modal */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
            >
              <header className="p-6 border-b border-black/5 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900">New Message</h3>
                <button onClick={() => setIsSearchModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                  <X size={24} />
                </button>
              </header>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search users by name..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-all"
                    autoFocus
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searching ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-emerald-600" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleStartNewChat(u)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-2xl transition-all text-left"
                      >
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{u.display_name || u.username || u.name || 'User'}</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{u.active_role}</p>
                        </div>
                      </button>
                    ))
                  ) : userSearchQuery.trim() ? (
                    <p className="text-center py-8 text-sm text-gray-400">No users found</p>
                  ) : (
                    <p className="text-center py-8 text-sm text-gray-400 italic">Type a name to search</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;

