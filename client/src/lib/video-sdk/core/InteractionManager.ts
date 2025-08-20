/**
 * InteractionManager - Professional Meeting Interactions
 * Hand raising, reactions, polls, Q&A like Zoom, Teams, Webex
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

interface HandRaise {
  participantId: string;
  displayName: string;
  raisedAt: Date;
  reason?: string;
  priority: 'normal' | 'urgent';
  status: 'raised' | 'acknowledged' | 'lowered';
}

interface Reaction {
  id: string;
  participantId: string;
  displayName: string;
  emoji: string;
  timestamp: Date;
  duration: number; // ms
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  type: 'single' | 'multiple' | 'text';
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  allowAnonymous: boolean;
  results: PollResult[];
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PollResult {
  participantId: string;
  selectedOptions: string[];
  textResponse?: string;
  votedAt: Date;
}

interface QAQuestion {
  id: string;
  question: string;
  askedBy: string;
  displayName: string;
  askedAt: Date;
  upvotes: number;
  isAnswered: boolean;
  answer?: string;
  answeredBy?: string;
  answeredAt?: Date;
  isPublic: boolean;
  category?: string;
}

interface InteractionConfig {
  handRaiseEnabled: boolean;
  reactionsEnabled: boolean;
  pollsEnabled: boolean;
  qaEnabled: boolean;
  anonymousQuestionsAllowed: boolean;
  participantPollsAllowed: boolean;
  reactionDuration: number; // seconds
}

export class InteractionManager extends EventEmitter {
  private supabase: SupabaseClient;
  private roomId: string | null = null;
  private userId: string | null = null;
  private config: InteractionConfig = {
    handRaiseEnabled: true,
    reactionsEnabled: true,
    pollsEnabled: true,
    qaEnabled: true,
    anonymousQuestionsAllowed: true,
    participantPollsAllowed: false,
    reactionDuration: 3
  };

  private handRaises = new Map<string, HandRaise>();
  private activeReactions = new Map<string, Reaction>();
  private polls = new Map<string, Poll>();
  private qaQuestions = new Map<string, QAQuestion>();
  private channel: any = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Initialize interaction system for meeting
   */
  async initialize(roomId: string, userId: string, config?: Partial<InteractionConfig>): Promise<void> {
    try {
      this.roomId = roomId;
      this.userId = userId;
      
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Set up real-time channel for interactions
      this.channel = this.supabase.channel(`interactions-${roomId}`, {
        config: { broadcast: { self: true } }
      });

      // Listen for interaction events
      this.channel
        .on('broadcast', { event: 'hand-raised' }, (payload: any) => {
          this.handleHandRaised(payload.payload);
        })
        .on('broadcast', { event: 'hand-lowered' }, (payload: any) => {
          this.handleHandLowered(payload.payload);
        })
        .on('broadcast', { event: 'reaction' }, (payload: any) => {
          this.handleReaction(payload.payload);
        })
        .on('broadcast', { event: 'poll-created' }, (payload: any) => {
          this.handlePollCreated(payload.payload);
        })
        .on('broadcast', { event: 'poll-vote' }, (payload: any) => {
          this.handlePollVote(payload.payload);
        })
        .on('broadcast', { event: 'question-asked' }, (payload: any) => {
          this.handleQuestionAsked(payload.payload);
        })
        .on('broadcast', { event: 'question-answered' }, (payload: any) => {
          this.handleQuestionAnswered(payload.payload);
        })
        .on('broadcast', { event: 'question-upvoted' }, (payload: any) => {
          this.handleQuestionUpvoted(payload.payload);
        });

      await this.channel.subscribe();

      console.log('🙋 Professional interaction system initialized');
      this.emit('initialized', { roomId, config: this.config });

    } catch (error) {
      console.error('❌ Interaction system initialization failed:', error);
      throw error;
    }
  }

  /**
   * Raise hand with optional reason
   * Professional hand raising like Zoom/Teams
   */
  async raiseHand(reason?: string, priority: 'normal' | 'urgent' = 'normal'): Promise<void> {
    if (!this.config.handRaiseEnabled || !this.roomId || !this.userId) {
      throw new Error('Hand raising not available');
    }

    try {
      const handRaise: HandRaise = {
        participantId: this.userId,
        displayName: await this.getDisplayName(this.userId),
        raisedAt: new Date(),
        reason,
        priority,
        status: 'raised'
      };

      this.handRaises.set(this.userId, handRaise);

      // Store in database
      await this.supabase
        .from('meeting_hand_raises')
        .upsert({
          room_id: this.roomId,
          participant_id: this.userId,
          reason,
          priority,
          status: 'raised'
        });

      // Notify all participants
      await this.channel.send({
        type: 'broadcast',
        event: 'hand-raised',
        payload: handRaise
      });

      console.log(`🙋 Hand raised${reason ? ` with reason: ${reason}` : ''}`);
      this.emit('hand-raised', handRaise);

    } catch (error) {
      console.error('❌ Failed to raise hand:', error);
      throw error;
    }
  }

  /**
   * Lower hand
   */
  async lowerHand(): Promise<void> {
    if (!this.userId || !this.handRaises.has(this.userId)) return;

    try {
      const handRaise = this.handRaises.get(this.userId)!;
      handRaise.status = 'lowered';
      
      this.handRaises.delete(this.userId);

      // Update database
      await this.supabase
        .from('meeting_hand_raises')
        .update({ status: 'lowered' })
        .eq('room_id', this.roomId)
        .eq('participant_id', this.userId);

      // Notify all participants
      await this.channel.send({
        type: 'broadcast',
        event: 'hand-lowered',
        payload: { participantId: this.userId }
      });

      console.log('🙋‍♂️ Hand lowered');
      this.emit('hand-lowered', { participantId: this.userId });

    } catch (error) {
      console.error('❌ Failed to lower hand:', error);
    }
  }

  /**
   * Send emoji reaction like Zoom/Teams
   */
  async sendReaction(emoji: string): Promise<void> {
    if (!this.config.reactionsEnabled || !this.roomId || !this.userId) {
      throw new Error('Reactions not available');
    }

    try {
      const reaction: Reaction = {
        id: crypto.randomUUID(),
        participantId: this.userId,
        displayName: await this.getDisplayName(this.userId),
        emoji,
        timestamp: new Date(),
        duration: this.config.reactionDuration * 1000
      };

      this.activeReactions.set(reaction.id, reaction);

      // Store in database
      await this.supabase
        .from('meeting_reactions')
        .insert({
          id: reaction.id,
          room_id: this.roomId,
          participant_id: this.userId,
          emoji,
          duration: this.config.reactionDuration
        });

      // Notify all participants
      await this.channel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: reaction
      });

      // Auto-remove reaction after duration
      setTimeout(() => {
        this.activeReactions.delete(reaction.id);
        this.emit('reaction-expired', { reactionId: reaction.id });
      }, reaction.duration);

      console.log(`😊 Reaction sent: ${emoji}`);
      this.emit('reaction-sent', reaction);

    } catch (error) {
      console.error('❌ Failed to send reaction:', error);
      throw error;
    }
  }

  /**
   * Create poll like professional platforms
   */
  async createPoll(pollData: {
    question: string;
    options: string[];
    type: 'single' | 'multiple' | 'text';
    duration?: number; // minutes
    allowAnonymous?: boolean;
  }): Promise<Poll> {
    if (!this.config.pollsEnabled || !this.roomId || !this.userId) {
      throw new Error('Polls not available');
    }

    try {
      const poll: Poll = {
        id: crypto.randomUUID(),
        question: pollData.question,
        options: pollData.options.map((text, index) => ({
          id: index.toString(),
          text,
          votes: 0
        })),
        type: pollData.type,
        createdBy: this.userId,
        createdAt: new Date(),
        expiresAt: pollData.duration 
          ? new Date(Date.now() + pollData.duration * 60 * 1000) 
          : undefined,
        isActive: true,
        allowAnonymous: pollData.allowAnonymous || false,
        results: []
      };

      this.polls.set(poll.id, poll);

      // Store in database
      await this.supabase
        .from('meeting_polls')
        .insert({
          id: poll.id,
          room_id: this.roomId,
          question: poll.question,
          options: poll.options,
          type: poll.type,
          created_by: this.userId,
          expires_at: poll.expiresAt?.toISOString(),
          allow_anonymous: poll.allowAnonymous
        });

      // Notify all participants
      await this.channel.send({
        type: 'broadcast',
        event: 'poll-created',
        payload: poll
      });

      // Auto-close poll if duration set
      if (pollData.duration) {
        setTimeout(() => {
          this.closePoll(poll.id);
        }, pollData.duration * 60 * 1000);
      }

      console.log(`📊 Poll created: ${poll.question}`);
      this.emit('poll-created', poll);

      return poll;

    } catch (error) {
      console.error('❌ Failed to create poll:', error);
      throw error;
    }
  }

  /**
   * Vote in poll
   */
  async voteInPoll(pollId: string, selectedOptions: string[], textResponse?: string): Promise<void> {
    const poll = this.polls.get(pollId);
    
    if (!poll || !poll.isActive || !this.userId) {
      throw new Error('Invalid poll or voting not allowed');
    }

    try {
      // Check if already voted (if not anonymous)
      if (!poll.allowAnonymous) {
        const existingVote = poll.results.find(r => r.participantId === this.userId);
        if (existingVote) {
          throw new Error('You have already voted in this poll');
        }
      }

      const result: PollResult = {
        participantId: this.userId,
        selectedOptions,
        textResponse,
        votedAt: new Date()
      };

      poll.results.push(result);

      // Update option vote counts
      selectedOptions.forEach(optionId => {
        const option = poll.options.find(opt => opt.id === optionId);
        if (option) {
          option.votes++;
        }
      });

      // Store in database
      await this.supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          participant_id: poll.allowAnonymous ? null : this.userId,
          selected_options: selectedOptions,
          text_response: textResponse
        });

      // Notify all participants of vote (anonymized if needed)
      await this.channel.send({
        type: 'broadcast',
        event: 'poll-vote',
        payload: {
          pollId,
          voterId: poll.allowAnonymous ? 'anonymous' : this.userId,
          selectedOptions,
          updatedOptions: poll.options
        }
      });

      console.log(`📊 Voted in poll: ${poll.question}`);
      this.emit('poll-voted', { poll, result });

    } catch (error) {
      console.error('❌ Failed to vote in poll:', error);
      throw error;
    }
  }

  /**
   * Close poll and show final results
   */
  async closePoll(pollId: string): Promise<void> {
    const poll = this.polls.get(pollId);
    
    if (!poll) return;

    try {
      poll.isActive = false;

      // Update database
      await this.supabase
        .from('meeting_polls')
        .update({ is_active: false })
        .eq('id', pollId);

      // Show results to all participants
      this.emit('poll-closed', { 
        poll, 
        results: this.getPollResults(pollId) 
      });

      console.log(`📊 Poll closed: ${poll.question}`);

    } catch (error) {
      console.error('❌ Failed to close poll:', error);
    }
  }

  /**
   * Ask question in Q&A
   */
  async askQuestion(question: string, isPublic: boolean = true, category?: string): Promise<QAQuestion> {
    if (!this.config.qaEnabled || !this.roomId || !this.userId) {
      throw new Error('Q&A not available');
    }

    try {
      const qaQuestion: QAQuestion = {
        id: crypto.randomUUID(),
        question,
        askedBy: this.userId,
        displayName: await this.getDisplayName(this.userId),
        askedAt: new Date(),
        upvotes: 0,
        isAnswered: false,
        isPublic,
        category
      };

      this.qaQuestions.set(qaQuestion.id, qaQuestion);

      // Store in database
      await this.supabase
        .from('meeting_questions')
        .insert({
          id: qaQuestion.id,
          room_id: this.roomId,
          question,
          asked_by: this.userId,
          is_public: isPublic,
          category
        });

      // Notify (publicly if allowed)
      if (isPublic) {
        await this.channel.send({
          type: 'broadcast',
          event: 'question-asked',
          payload: qaQuestion
        });
      }

      console.log(`❓ Question asked: ${question.substring(0, 50)}...`);
      this.emit('question-asked', qaQuestion);

      return qaQuestion;

    } catch (error) {
      console.error('❌ Failed to ask question:', error);
      throw error;
    }
  }

  /**
   * Answer question (host/presenter)
   */
  async answerQuestion(questionId: string, answer: string): Promise<void> {
    const question = this.qaQuestions.get(questionId);
    
    if (!question || !this.userId) {
      throw new Error('Invalid question');
    }

    try {
      question.answer = answer;
      question.answeredBy = this.userId;
      question.answeredAt = new Date();
      question.isAnswered = true;

      // Update database
      await this.supabase
        .from('meeting_questions')
        .update({
          answer,
          answered_by: this.userId,
          answered_at: new Date().toISOString(),
          is_answered: true
        })
        .eq('id', questionId);

      // Notify all participants
      await this.channel.send({
        type: 'broadcast',
        event: 'question-answered',
        payload: { questionId, answer, answeredBy: this.userId }
      });

      console.log(`❓ Question answered: ${questionId}`);
      this.emit('question-answered', question);

    } catch (error) {
      console.error('❌ Failed to answer question:', error);
      throw error;
    }
  }

  /**
   * Upvote question
   */
  async upvoteQuestion(questionId: string): Promise<void> {
    const question = this.qaQuestions.get(questionId);
    
    if (!question) return;

    try {
      question.upvotes++;

      // Update database
      await this.supabase.rpc('increment_question_upvotes', {
        question_id: questionId
      });

      // Notify participants
      await this.channel.send({
        type: 'broadcast',
        event: 'question-upvoted',
        payload: { questionId, newUpvotes: question.upvotes }
      });

      this.emit('question-upvoted', { questionId, upvotes: question.upvotes });

    } catch (error) {
      console.error('❌ Failed to upvote question:', error);
    }
  }

  // Event handlers
  private handleHandRaised(payload: HandRaise): void {
    this.handRaises.set(payload.participantId, payload);
    this.emit('hand-raised-notification', payload);
  }

  private handleHandLowered(payload: { participantId: string }): void {
    this.handRaises.delete(payload.participantId);
    this.emit('hand-lowered-notification', payload);
  }

  private handleReaction(payload: Reaction): void {
    this.activeReactions.set(payload.id, payload);
    this.emit('reaction-received', payload);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.activeReactions.delete(payload.id);
    }, payload.duration);
  }

  private handlePollCreated(payload: Poll): void {
    this.polls.set(payload.id, payload);
    this.emit('poll-created-notification', payload);
  }

  private handlePollVote(payload: any): void {
    const poll = this.polls.get(payload.pollId);
    if (poll) {
      poll.options = payload.updatedOptions;
      this.emit('poll-vote-notification', payload);
    }
  }

  private handleQuestionAsked(payload: QAQuestion): void {
    this.qaQuestions.set(payload.id, payload);
    this.emit('question-asked-notification', payload);
  }

  private handleQuestionAnswered(payload: any): void {
    const question = this.qaQuestions.get(payload.questionId);
    if (question) {
      question.answer = payload.answer;
      question.answeredBy = payload.answeredBy;
      question.isAnswered = true;
      this.emit('question-answered-notification', payload);
    }
  }

  private handleQuestionUpvoted(payload: any): void {
    const question = this.qaQuestions.get(payload.questionId);
    if (question) {
      question.upvotes = payload.newUpvotes;
      this.emit('question-upvoted-notification', payload);
    }
  }

  /**
   * Get display name for user
   */
  private async getDisplayName(userId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();
      
      return data 
        ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email
        : 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  /**
   * Get poll results
   */
  getPollResults(pollId: string): any {
    const poll = this.polls.get(pollId);
    if (!poll) return null;

    return {
      question: poll.question,
      totalVotes: poll.results.length,
      options: poll.options.map(option => ({
        ...option,
        percentage: poll.results.length > 0 
          ? Math.round((option.votes / poll.results.length) * 100) 
          : 0
      })),
      textResponses: poll.results
        .filter(r => r.textResponse)
        .map(r => r.textResponse)
    };
  }

  /**
   * Get current hand raises
   */
  getHandRaises(): HandRaise[] {
    return Array.from(this.handRaises.values())
      .sort((a, b) => a.raisedAt.getTime() - b.raisedAt.getTime());
  }

  /**
   * Get active reactions
   */
  getActiveReactions(): Reaction[] {
    return Array.from(this.activeReactions.values());
  }

  /**
   * Get all polls
   */
  getPolls(): Poll[] {
    return Array.from(this.polls.values());
  }

  /**
   * Get Q&A questions
   */
  getQuestions(): QAQuestion[] {
    return Array.from(this.qaQuestions.values())
      .sort((a, b) => b.upvotes - a.upvotes || b.askedAt.getTime() - a.askedAt.getTime());
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): InteractionConfig {
    return { ...this.config };
  }

  /**
   * Cleanup interaction manager
   */
  async cleanup(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.handRaises.clear();
    this.activeReactions.clear();
    this.polls.clear();
    this.qaQuestions.clear();
    this.removeAllListeners();

    console.log('🧹 Interaction manager cleaned up');
  }
}