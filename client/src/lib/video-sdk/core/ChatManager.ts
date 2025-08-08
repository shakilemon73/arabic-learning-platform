/**
 * ChatManager - Handles real-time chat functionality
 * Messages, emojis, file sharing, moderation, and chat history
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';

export interface ChatMessage {
  id?: string;
  roomId: string;
  userId: string;
  displayName: string;
  avatar?: string;
  message: string;
  type: 'text' | 'emoji' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: Date;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: string;
  reactions?: ChatReaction[];
}

export interface ChatReaction {
  emoji: string;
  userId: string;
  displayName: string;
  timestamp: Date;
}

export interface SendMessageData {
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  type: 'text' | 'emoji' | 'file';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: string;
}

export interface ChatSettings {
  maxMessageLength: number;
  allowEmojis: boolean;
  allowFiles: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  moderationEnabled: boolean;
  retainHistory: boolean;
}

export class ChatManager extends EventEmitter {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private settings: ChatSettings;
  private messageCache: Map<string, ChatMessage> = new Map();

  constructor(supabase: SupabaseClient, settings?: Partial<ChatSettings>) {
    super();
    this.supabase = supabase;
    
    this.settings = {
      maxMessageLength: 1000,
      allowEmojis: true,
      allowFiles: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt'],
      moderationEnabled: true,
      retainHistory: true,
      ...settings
    };
  }

  /**
   * Initialize chat for a room
   */
  async initialize(roomId: string, userId: string): Promise<void> {
    try {
      this.roomId = roomId;
      this.userId = userId;

      // Create chat channel
      this.channel = this.supabase.channel(`chat:${roomId}`);

      // Subscribe to new messages
      this.channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'video_chat_messages',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          this.handleNewMessage(payload.new as any);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_chat_messages',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          this.handleMessageUpdate(payload.new as any);
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'video_chat_messages',
          filter: `room_id=eq.${roomId}`
        }, (payload) => {
          this.handleMessageDelete(payload.old as any);
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          this.handleTypingIndicator(payload.payload);
        })
        .on('broadcast', { event: 'reaction' }, (payload) => {
          this.handleReaction(payload.payload);
        });

      await this.channel.subscribe();

      // Load chat history if enabled
      if (this.settings.retainHistory) {
        await this.loadChatHistory();
      }

      this.emit('chat-initialized', { roomId, userId });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(data: SendMessageData): Promise<void> {
    try {
      // Validate message
      if (!this.validateMessage(data)) {
        return;
      }

      // Apply moderation if enabled
      if (this.settings.moderationEnabled) {
        data.message = await this.moderateMessage(data.message);
      }

      // Insert message into database
      const { error } = await this.supabase
        .from('video_chat_messages')
        .insert({
          room_id: data.roomId,
          user_id: data.userId,
          display_name: data.displayName,
          message: data.message,
          message_type: data.type,
          file_url: data.fileUrl,
          file_name: data.fileName,
          file_size: data.fileSize,
          reply_to: data.replyTo,
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newMessage: string): Promise<void> {
    try {
      if (!this.validateMessageContent(newMessage)) {
        return;
      }

      // Apply moderation if enabled
      if (this.settings.moderationEnabled) {
        newMessage = await this.moderateMessage(newMessage);
      }

      const { error } = await this.supabase
        .from('video_chat_messages')
        .update({
          message: newMessage,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', this.userId); // Only allow users to edit their own messages

      if (error) {
        throw error;
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('video_chat_messages')
        .update({
          is_deleted: true,
          message: '[Message deleted]',
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', this.userId); // Only allow users to delete their own messages

      if (error) {
        throw error;
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
    }
  }

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    try {
      if (!this.channel) return;

      // Check if user already reacted with this emoji
      const existingReaction = await this.supabase
        .from('chat_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', this.userId)
        .eq('emoji', emoji)
        .single();

      if (existingReaction.data) {
        // Remove existing reaction
        await this.supabase
          .from('chat_reactions')
          .delete()
          .eq('id', existingReaction.data.id);
      } else {
        // Add new reaction
        await this.supabase
          .from('chat_reactions')
          .insert({
            message_id: messageId,
            user_id: this.userId!,
            emoji,
            created_at: new Date().toISOString()
          });
      }

      // Broadcast reaction update
      await this.channel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          messageId,
          emoji,
          userId: this.userId,
          action: existingReaction.data ? 'remove' : 'add'
        }
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(isTyping: boolean): Promise<void> {
    try {
      if (!this.channel) return;

      await this.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: this.userId,
          roomId: this.roomId,
          isTyping,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
    }
  }

  /**
   * Upload file for sharing
   */
  async uploadFile(file: File): Promise<string | null> {
    try {
      // Validate file
      if (!this.validateFile(file)) {
        return null;
      }

      // Create unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const filePath = `chat/${this.roomId}/${fileName}`;

      // Upload to Supabase Storage
      const { error } = await this.supabase.storage
        .from('chat-files')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data } = this.supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      return data.publicUrl;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
      return null;
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(limit: number = 50, before?: Date): Promise<ChatMessage[]> {
    try {
      let query = this.supabase
        .from('video_chat_messages')
        .select(`
          *,
          reactions:chat_reactions(*)
        `)
        .eq('room_id', this.roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.transformDatabaseMessage).reverse();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
      return [];
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, limit: number = 20): Promise<ChatMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('video_chat_messages')
        .select('*')
        .eq('room_id', this.roomId)
        .eq('is_deleted', false)
        .textSearch('message', query)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data || []).map(this.transformDatabaseMessage);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
      return [];
    }
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('video_chat_messages')
        .delete()
        .eq('room_id', this.roomId);

      if (error) {
        throw error;
      }

      this.messageCache.clear();
      this.emit('chat-cleared');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { error: errorMsg });
    }
  }

  // Private methods
  private async loadChatHistory(): Promise<void> {
    const messages = await this.getChatHistory();
    messages.forEach(message => {
      if (message.id) {
        this.messageCache.set(message.id, message);
      }
    });

    this.emit('chat-history-loaded', { messages });
  }

  private validateMessage(data: SendMessageData): boolean {
    if (!data.message || data.message.trim().length === 0) {
      this.emit('error', { error: 'Message cannot be empty' });
      return false;
    }

    return this.validateMessageContent(data.message);
  }

  private validateMessageContent(message: string): boolean {
    if (message.length > this.settings.maxMessageLength) {
      this.emit('error', { 
        error: `Message too long. Maximum ${this.settings.maxMessageLength} characters allowed.` 
      });
      return false;
    }

    return true;
  }

  private validateFile(file: File): boolean {
    if (!this.settings.allowFiles) {
      this.emit('error', { error: 'File sharing is disabled' });
      return false;
    }

    if (file.size > this.settings.maxFileSize) {
      this.emit('error', { 
        error: `File too large. Maximum ${this.settings.maxFileSize / 1024 / 1024}MB allowed.` 
      });
      return false;
    }

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.settings.allowedFileTypes.includes(fileExtension)) {
      this.emit('error', { 
        error: `File type not allowed. Allowed types: ${this.settings.allowedFileTypes.join(', ')}` 
      });
      return false;
    }

    return true;
  }

  private async moderateMessage(message: string): Promise<string> {
    // Basic profanity filter (in production, use a proper moderation service)
    const profanityWords = ['spam', 'abuse']; // Add more words
    let moderatedMessage = message;

    profanityWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      moderatedMessage = moderatedMessage.replace(regex, '*'.repeat(word.length));
    });

    return moderatedMessage;
  }

  private transformDatabaseMessage(dbMessage: any): ChatMessage {
    return {
      id: dbMessage.id,
      roomId: dbMessage.room_id,
      userId: dbMessage.user_id,
      displayName: dbMessage.display_name,
      avatar: dbMessage.avatar_url,
      message: dbMessage.message,
      type: dbMessage.message_type,
      fileUrl: dbMessage.file_url,
      fileName: dbMessage.file_name,
      fileSize: dbMessage.file_size,
      timestamp: new Date(dbMessage.created_at),
      isEdited: dbMessage.is_edited,
      isDeleted: dbMessage.is_deleted,
      replyTo: dbMessage.reply_to,
      reactions: (dbMessage.reactions || []).map((reaction: any) => ({
        emoji: reaction.emoji,
        userId: reaction.user_id,
        displayName: reaction.display_name,
        timestamp: new Date(reaction.created_at)
      }))
    };
  }

  private handleNewMessage(dbMessage: any): void {
    const message = this.transformDatabaseMessage(dbMessage);
    
    if (message.id) {
      this.messageCache.set(message.id, message);
    }

    this.emit('message-received', message);
  }

  private handleMessageUpdate(dbMessage: any): void {
    const message = this.transformDatabaseMessage(dbMessage);
    
    if (message.id) {
      this.messageCache.set(message.id, message);
    }

    this.emit('message-updated', message);
  }

  private handleMessageDelete(dbMessage: any): void {
    const messageId = dbMessage.id;
    this.messageCache.delete(messageId);
    this.emit('message-deleted', { messageId });
  }

  private handleTypingIndicator(payload: any): void {
    if (payload.userId === this.userId) return;
    this.emit('typing-indicator', payload);
  }

  private handleReaction(payload: any): void {
    this.emit('reaction-updated', payload);
  }

  /**
   * Disconnect from chat
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    
    this.messageCache.clear();
    this.roomId = null;
    this.userId = null;
  }

  /**
   * Destroy chat manager
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}