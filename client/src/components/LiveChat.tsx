import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Clock } from 'lucide-react';
import { type Socket } from 'socket.io-client';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'homework';
}

interface LiveChatProps {
  messages: ChatMessage[];
  sessionId: string;
  userId: string;
  socket: Socket | null;
}

export default function LiveChat({ 
  messages, 
  sessionId, 
  userId, 
  socket 
}: LiveChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      sessionId,
      userId,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: 'message',
    };

    socket.emit('send-message', messageData);
    setNewMessage('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Handle typing indicator
    if (!isTyping && socket) {
      setIsTyping(true);
      socket.emit('typing-start', { sessionId, userId });
      
      setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing-stop', { sessionId, userId });
      }, 3000);
    }
  };

  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm', { locale: bn });
  };

  const getMessageTypeStyles = (message: ChatMessage) => {
    switch (message.type) {
      case 'system':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'homework':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return message.userId === userId
          ? 'bg-islamic-green text-white ml-8'
          : 'bg-gray-100 dark:bg-gray-800 mr-8';
    }
  };

  const isOwnMessage = (message: ChatMessage) => {
    return message.userId === userId && message.type === 'message';
  };

  return (
    <Card className="bento-card h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="font-bengali">লাইভ চ্যাট</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
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
                    {!isOwnMessage(message) && message.type === 'message' && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground font-bengali">
                          {message.userName}
                        </span>
                        <Clock className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    
                    <p className="text-sm font-bengali break-words">
                      {message.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                      
                      {message.type === 'homework' && (
                        <Badge variant="secondary" className="text-xs">
                          হোমওয়ার্ক
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="font-bengali">এখনও কোনো বার্তা নেই</p>
                <p className="text-sm font-bengali">প্রথম বার্তা পাঠান!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              placeholder="বার্তা লিখুন..."
              className="flex-1 font-bengali"
              disabled={!socket}
              data-testid="chat-input"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || !socket}
              size="sm"
              className="btn-kinetic"
              data-testid="send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          
          {isTyping && (
            <p className="text-xs text-muted-foreground mt-2 font-bengali">
              টাইপ করছেন...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}