/**
 * WaitingRoomManager - Professional Waiting Room Feature
 * Security and admission control like Zoom, Teams, Webex
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

interface WaitingRoomConfig {
  enabled: boolean;
  autoAdmit: boolean;
  requireApproval: boolean;
  maxWaitingParticipants: number;
  waitingMessage: string;
  hostNotifications: boolean;
}

interface WaitingParticipant {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  joinedAt: Date;
  deviceInfo: string;
  requestMessage?: string;
  profileImage?: string;
}

interface AdmissionRequest {
  participantId: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: Date;
  reason?: string;
}

export class WaitingRoomManager extends EventEmitter {
  private supabase: SupabaseClient;
  private roomId: string | null = null;
  private hostId: string | null = null;
  private config: WaitingRoomConfig = {
    enabled: true,
    autoAdmit: false,
    requireApproval: true,
    maxWaitingParticipants: 100,
    waitingMessage: 'Please wait while the host lets you in',
    hostNotifications: true
  };

  private waitingParticipants = new Map<string, WaitingParticipant>();
  private admissionRequests = new Map<string, AdmissionRequest>();
  private channel: any = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Initialize waiting room for a meeting
   */
  async initialize(roomId: string, hostId: string, config?: Partial<WaitingRoomConfig>): Promise<void> {
    try {
      this.roomId = roomId;
      this.hostId = hostId;
      
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Set up real-time channel for waiting room events
      this.channel = this.supabase.channel(`waiting-room-${roomId}`, {
        config: { broadcast: { self: true } }
      });

      // Listen for waiting room events
      this.channel
        .on('broadcast', { event: 'join-request' }, (payload: any) => {
          this.handleJoinRequest(payload.payload);
        })
        .on('broadcast', { event: 'admission-decision' }, (payload: any) => {
          this.handleAdmissionDecision(payload.payload);
        })
        .on('broadcast', { event: 'participant-left-waiting' }, (payload: any) => {
          this.handleParticipantLeftWaiting(payload.payload);
        });

      await this.channel.subscribe();

      // Create waiting room record in database
      await this.supabase
        .from('waiting_rooms')
        .upsert({
          room_id: roomId,
          host_id: hostId,
          config: this.config,
          is_active: true
        });

      console.log('⏳ Professional waiting room initialized');
      this.emit('initialized', { roomId, config: this.config });

    } catch (error) {
      console.error('❌ Waiting room initialization failed:', error);
      throw error;
    }
  }

  /**
   * Request to join meeting (participant side)
   */
  async requestToJoin(participantInfo: {
    userId: string;
    displayName: string;
    email?: string;
    requestMessage?: string;
    deviceInfo?: string;
  }): Promise<{ status: 'waiting' | 'admitted' | 'denied', message?: string }> {
    if (!this.roomId || !this.channel) {
      throw new Error('Waiting room not initialized');
    }

    try {
      // Check if waiting room is enabled
      if (!this.config.enabled) {
        return { status: 'admitted', message: 'Welcome to the meeting' };
      }

      // Check capacity
      if (this.waitingParticipants.size >= this.config.maxWaitingParticipants) {
        return { 
          status: 'denied', 
          message: 'Waiting room is full. Please try again later.' 
        };
      }

      const waitingParticipant: WaitingParticipant = {
        id: crypto.randomUUID(),
        userId: participantInfo.userId,
        displayName: participantInfo.displayName,
        email: participantInfo.email,
        joinedAt: new Date(),
        deviceInfo: participantInfo.deviceInfo || this.getDeviceInfo(),
        requestMessage: participantInfo.requestMessage
      };

      // Add to waiting list
      this.waitingParticipants.set(waitingParticipant.id, waitingParticipant);

      // Create admission request
      const admissionRequest: AdmissionRequest = {
        participantId: waitingParticipant.id,
        requestedAt: new Date(),
        status: 'pending'
      };
      this.admissionRequests.set(waitingParticipant.id, admissionRequest);

      // Store in database
      await this.supabase
        .from('waiting_room_participants')
        .insert({
          room_id: this.roomId,
          participant_id: waitingParticipant.id,
          user_id: participantInfo.userId,
          display_name: participantInfo.displayName,
          email: participantInfo.email,
          request_message: participantInfo.requestMessage,
          device_info: waitingParticipant.deviceInfo,
          status: 'waiting'
        });

      // Notify host about join request
      await this.channel.send({
        type: 'broadcast',
        event: 'join-request',
        payload: {
          participant: waitingParticipant,
          request: admissionRequest
        }
      });

      console.log(`⏳ ${participantInfo.displayName} added to waiting room`);
      this.emit('participant-waiting', { participant: waitingParticipant });

      // Auto-admit if configured
      if (this.config.autoAdmit) {
        setTimeout(() => this.admitParticipant(waitingParticipant.id), 1000);
      }

      return { 
        status: 'waiting', 
        message: this.config.waitingMessage 
      };

    } catch (error) {
      console.error('❌ Join request failed:', error);
      throw error;
    }
  }

  /**
   * Handle join request (host side)
   */
  private handleJoinRequest(payload: { participant: WaitingParticipant, request: AdmissionRequest }): void {
    const { participant, request } = payload;
    
    this.waitingParticipants.set(participant.id, participant);
    this.admissionRequests.set(participant.id, request);

    // Notify host about new participant waiting
    this.emit('join-request', { participant, request });

    if (this.config.hostNotifications) {
      this.emit('host-notification', {
        type: 'join-request',
        message: `${participant.displayName} is waiting to join`,
        participant
      });
    }
  }

  /**
   * Admit participant to meeting (host action)
   */
  async admitParticipant(participantId: string, reason?: string): Promise<void> {
    const participant = this.waitingParticipants.get(participantId);
    const request = this.admissionRequests.get(participantId);

    if (!participant || !request || !this.roomId || !this.channel) {
      throw new Error('Invalid admission request');
    }

    try {
      // Update admission request
      request.status = 'approved';
      request.reviewedBy = this.hostId!;
      request.reviewedAt = new Date();
      request.reason = reason;

      // Update database
      await this.supabase
        .from('waiting_room_participants')
        .update({
          status: 'admitted',
          admitted_at: new Date().toISOString(),
          admitted_by: this.hostId
        })
        .eq('participant_id', participantId);

      // Notify participant they're admitted
      await this.channel.send({
        type: 'broadcast',
        event: 'admission-decision',
        payload: {
          participantId,
          status: 'approved',
          message: 'You have been admitted to the meeting'
        }
      });

      // Remove from waiting list
      this.waitingParticipants.delete(participantId);
      this.admissionRequests.delete(participantId);

      console.log(`✅ ${participant.displayName} admitted to meeting`);
      this.emit('participant-admitted', { participant, reason });

    } catch (error) {
      console.error('❌ Failed to admit participant:', error);
      throw error;
    }
  }

  /**
   * Deny participant entry (host action)
   */
  async denyParticipant(participantId: string, reason?: string): Promise<void> {
    const participant = this.waitingParticipants.get(participantId);
    const request = this.admissionRequests.get(participantId);

    if (!participant || !request || !this.roomId || !this.channel) {
      throw new Error('Invalid denial request');
    }

    try {
      // Update admission request
      request.status = 'denied';
      request.reviewedBy = this.hostId!;
      request.reviewedAt = new Date();
      request.reason = reason;

      // Update database
      await this.supabase
        .from('waiting_room_participants')
        .update({
          status: 'denied',
          denied_at: new Date().toISOString(),
          denied_by: this.hostId,
          denial_reason: reason
        })
        .eq('participant_id', participantId);

      // Notify participant they're denied
      await this.channel.send({
        type: 'broadcast',
        event: 'admission-decision',
        payload: {
          participantId,
          status: 'denied',
          message: reason || 'Your request to join has been denied'
        }
      });

      // Remove from waiting list
      this.waitingParticipants.delete(participantId);
      this.admissionRequests.delete(participantId);

      console.log(`❌ ${participant.displayName} denied entry: ${reason}`);
      this.emit('participant-denied', { participant, reason });

    } catch (error) {
      console.error('❌ Failed to deny participant:', error);
      throw error;
    }
  }

  /**
   * Admit all waiting participants
   */
  async admitAll(): Promise<void> {
    const waitingIds = Array.from(this.waitingParticipants.keys());
    
    for (const participantId of waitingIds) {
      try {
        await this.admitParticipant(participantId, 'Admitted all participants');
      } catch (error) {
        console.error(`Failed to admit participant ${participantId}:`, error);
      }
    }

    this.emit('all-admitted', { count: waitingIds.length });
  }

  /**
   * Handle admission decision (participant side)
   */
  private handleAdmissionDecision(payload: { participantId: string, status: string, message: string }): void {
    this.emit('admission-decision', payload);
  }

  /**
   * Handle participant leaving waiting room
   */
  private handleParticipantLeftWaiting(payload: { participantId: string }): void {
    const participant = this.waitingParticipants.get(payload.participantId);
    
    if (participant) {
      this.waitingParticipants.delete(payload.participantId);
      this.admissionRequests.delete(payload.participantId);
      this.emit('participant-left-waiting', { participant });
    }
  }

  /**
   * Leave waiting room (participant action)
   */
  async leaveWaitingRoom(participantId: string): Promise<void> {
    if (!this.channel) return;

    try {
      // Notify about leaving
      await this.channel.send({
        type: 'broadcast',
        event: 'participant-left-waiting',
        payload: { participantId }
      });

      // Update database
      await this.supabase
        .from('waiting_room_participants')
        .update({
          status: 'left',
          left_at: new Date().toISOString()
        })
        .eq('participant_id', participantId);

      console.log('👋 Left waiting room');

    } catch (error) {
      console.error('❌ Failed to leave waiting room:', error);
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): string {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    return `${platform} - ${userAgent.substring(0, 100)}`;
  }

  /**
   * Get waiting participants list
   */
  getWaitingParticipants(): WaitingParticipant[] {
    return Array.from(this.waitingParticipants.values());
  }

  /**
   * Get pending admission requests
   */
  getPendingRequests(): AdmissionRequest[] {
    return Array.from(this.admissionRequests.values())
      .filter(request => request.status === 'pending');
  }

  /**
   * Update waiting room configuration
   */
  async updateConfig(newConfig: Partial<WaitingRoomConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    if (this.roomId) {
      await this.supabase
        .from('waiting_rooms')
        .update({ config: this.config })
        .eq('room_id', this.roomId);
    }

    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): WaitingRoomConfig {
    return { ...this.config };
  }

  /**
   * Check if waiting room is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get waiting room statistics
   */
  getStatistics(): any {
    return {
      totalWaiting: this.waitingParticipants.size,
      pendingRequests: this.getPendingRequests().length,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  /**
   * Calculate average waiting time
   */
  private calculateAverageWaitTime(): number {
    const waitingTimes = Array.from(this.waitingParticipants.values())
      .map(p => Date.now() - p.joinedAt.getTime());
    
    return waitingTimes.length > 0 
      ? waitingTimes.reduce((sum, time) => sum + time, 0) / waitingTimes.length
      : 0;
  }

  /**
   * Cleanup waiting room
   */
  async cleanup(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    if (this.roomId) {
      await this.supabase
        .from('waiting_rooms')
        .update({ is_active: false })
        .eq('room_id', this.roomId);
    }

    this.waitingParticipants.clear();
    this.admissionRequests.clear();
    this.removeAllListeners();

    console.log('🧹 Waiting room cleaned up');
  }
}