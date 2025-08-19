/**
 * ChatManager - Real-time chat functionality
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'emoji' | 'file' | 'system';
}

export class ChatManager extends EventEmitter {
  private supabase: SupabaseClient;
  private roomId: string | null = null;
  private userId: string | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  async initialize(roomId: string, userId: string): Promise<void> {
    this.roomId = roomId;
    this.userId = userId;
    
    // Subscribe to real-time chat messages
    this.supabase
      .channel(`chat-${roomId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => this.handleNewMessage(payload.new as ChatMessage)
      )
      .subscribe();
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.roomId || !this.userId) return;

    await this.supabase
      .from('chat_messages')
      .insert({
        room_id: this.roomId,
        user_id: this.userId,
        message,
        type: 'text'
      });
  }

  private handleNewMessage(message: ChatMessage): void {
    this.emit('message-received', message);
  }

  cleanup(): void {
    this.removeAllListeners();
  }
}