import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Clock, Heart, ThumbsUp, Smile } from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { supabase, getChatMessages, sendChatMessage, addChatReaction, getChatReactions } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  class_id: string;
  user_id: string;
  message: string;
  message_type: string;
  sent_at: string;
}

interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  display_name: string;
  emoji: string;
  created_at: string;
}

interface SupabaseLiveChatProps {
  classId: string;
  isActive?: boolean;
}

export default function SupabaseLiveChat({ 
  classId,
  isActive = false 
}: SupabaseLiveChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', classId],
    queryFn: async () => {
      const { data, error } = await getChatMessages(classId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!classId,
    refetchInterval: isActive ? 3000 : false // Real-time-like updates when active
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; message_type?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await sendChatMessage({
        class_id: classId,
        user_id: user.id,
        message: messageData.message,
        message_type: messageData.message_type || 'text'
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', classId] });
      setNewMessage('');
      toast({
        title: "বার্তা পাঠানো হয়েছে",
        description: "আপনার বার্তা সফলভাবে পাঠানো হয়েছে",
      });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast({
        title: "বার্তা পাঠাতে ত্রুটি",
        description: "বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        variant: "destructive"
      });
    }
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const displayName = profile?.first_name || user.email?.split('@')[0] || 'ব্যবহারকারী';
      const { data, error } = await addChatReaction(messageId, user.id, emoji, displayName);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', classId] });
      toast({
        title: "রিয়েকশন যোগ করা হয়েছে",
        description: "আপনার রিয়েকশন সফলভাবে যোগ করা হয়েছে",
      });
    }
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!classId || !isActive) return;

    const channel = supabase
      .channel(`chat-messages-${classId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `class_id=eq.${classId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', classId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_reactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', classId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, isActive, queryClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) {
      toast({
        title: "বার্তা পাঠাতে পারবেন না",
        description: "অনুগ্রহ করে লগইন করুন এবং বার্তা লিখুন",
        variant: "destructive"
      });
      return;
    }

    sendMessageMutation.mutate({ message: newMessage.trim() });
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (!user) {
      toast({
        title: "রিয়েকশন দিতে পারবেন না",
        description: "অনুগ্রহ করে লগইন করুন",
        variant: "destructive"
      });
      return;
    }

    addReactionMutation.mutate({ messageId, emoji });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: bn });
  };

  const getMessageTypeStyles = (message: ChatMessage) => {
    switch (message.message_type) {
      case 'system':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'homework':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return message.user_id === user?.id
          ? 'bg-islamic-green text-white ml-8'
          : 'bg-gray-100 dark:bg-gray-800 mr-8';
    }
  };

  const isOwnMessage = (message: ChatMessage) => {
    return message.user_id === user?.id && message.message_type === 'text';
  };

  // Popular reaction emojis
  const reactionEmojis = ['👍', '❤️', '😊', '🎉', '👏', '🤔'];

  if (isLoading) {
    return (
      <Card className="bento-card h-96 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="font-bengali">লাইভ চ্যাট লোড হচ্ছে...</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bento-card h-96 flex flex-col" data-testid="live-chat-container">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-bengali">লাইভ চ্যাট</CardTitle>
          {isActive && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              সক্রিয়
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" data-testid="chat-messages-area">
          <div className="space-y-3 pb-4">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${getMessageTypeStyles(message)}`}
                    data-testid={`message-${message.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.sent_at)}
                      </span>
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    </div>
                    
                    <p className="text-sm font-bengali break-words">
                      {message.message}
                    </p>

                    {/* Reaction buttons for other users' messages */}
                    {!isOwnMessage(message) && (
                      <div className="flex items-center mt-2 space-x-1">
                        {reactionEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleAddReaction(message.id, emoji)}
                            className="text-xs hover:bg-gray-200 dark:hover:bg-gray-700 rounded px-1 transition-colors"
                            data-testid={`reaction-${emoji}-${message.id}`}
                            disabled={addReactionMutation.isPending}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground font-bengali">
                  এখনো কোন বার্তা নেই। প্রথম বার্তা পাঠান!
                </p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Chat Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2" data-testid="chat-input-form">
            <Input
              ref={inputRef}
              type="text"
              placeholder="বার্তা লিখুন..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sendMessageMutation.isPending || !user}
              className="flex-1 font-bengali"
              data-testid="chat-input"
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={sendMessageMutation.isPending || !newMessage.trim() || !user}
              data-testid="send-message-button"
            >
              {sendMessageMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}