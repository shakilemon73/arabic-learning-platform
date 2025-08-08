/**
 * WhiteboardManager - Interactive whiteboard and collaboration tools
 * Drawing, shapes, annotations, and real-time collaboration
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';

export interface DrawingAction {
  id: string;
  type: 'pen' | 'line' | 'rectangle' | 'circle' | 'text' | 'eraser' | 'clear';
  userId: string;
  displayName: string;
  data: any;
  timestamp: number;
  color?: string;
  strokeWidth?: number;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
}

export interface WhiteboardSettings {
  maxCanvasSize: { width: number; height: number };
  allowedTools: string[];
  colors: string[];
  strokeWidths: number[];
  saveHistory: boolean;
  collaborationEnabled: boolean;
}

export class WhiteboardManager extends EventEmitter {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private settings: WhiteboardSettings;
  private drawingHistory: DrawingAction[] = [];
  private currentTool = 'pen';
  private currentColor = '#000000';
  private currentStrokeWidth = 2;
  private isDrawing = false;
  private lastPosition = { x: 0, y: 0 };

  constructor(supabase: SupabaseClient, settings?: Partial<WhiteboardSettings>) {
    super();
    this.supabase = supabase;
    
    this.settings = {
      maxCanvasSize: { width: 1920, height: 1080 },
      allowedTools: ['pen', 'line', 'rectangle', 'circle', 'text', 'eraser', 'clear'],
      colors: ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'],
      strokeWidths: [1, 2, 4, 8, 16],
      saveHistory: true,
      collaborationEnabled: true,
      ...settings
    };
  }

  /**
   * Initialize whiteboard for a room
   */
  async initialize(roomId: string, userId: string, canvas: HTMLCanvasElement): Promise<void> {
    try {
      this.roomId = roomId;
      this.userId = userId;
      this.canvas = canvas;
      this.context = canvas.getContext('2d');

      if (!this.context) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Setup canvas
      this.setupCanvas();

      // Setup collaboration if enabled
      if (this.settings.collaborationEnabled) {
        await this.setupCollaboration();
      }

      // Load whiteboard history if available
      if (this.settings.saveHistory) {
        await this.loadWhiteboardHistory();
      }

      this.emit('whiteboard-initialized', { roomId, userId });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup canvas event listeners
   */
  private setupCanvas(): void {
    if (!this.canvas) return;

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseout', this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Prevent default touch behavior
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault());
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
  }

  /**
   * Setup real-time collaboration
   */
  private async setupCollaboration(): Promise<void> {
    if (!this.roomId) return;

    this.channel = this.supabase.channel(`whiteboard:${this.roomId}`);

    this.channel
      .on('broadcast', { event: 'drawing-action' }, (payload) => {
        this.handleRemoteDrawingAction(payload.payload);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whiteboard_actions',
        filter: `room_id=eq.${this.roomId}`
      }, (payload) => {
        this.handleDatabaseDrawingAction(payload.new as any);
      });

    await this.channel.subscribe();
  }

  /**
   * Start drawing
   */
  private handleMouseDown(event: MouseEvent): void {
    this.isDrawing = true;
    const rect = this.canvas!.getBoundingClientRect();
    this.lastPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
      this.beginPath();
    }
  }

  /**
   * Continue drawing
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDrawing) return;

    const rect = this.canvas!.getBoundingClientRect();
    const currentPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    this.drawLine(this.lastPosition, currentPosition);
    this.lastPosition = currentPosition;
  }

  /**
   * Stop drawing
   */
  private handleMouseUp(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    
    if (this.context) {
      this.context.beginPath();
    }
  }

  /**
   * Handle touch events
   */
  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseDown(mouseEvent);
  }

  private handleTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseMove(mouseEvent);
  }

  private handleTouchEnd(): void {
    this.handleMouseUp();
  }

  /**
   * Begin drawing path
   */
  private beginPath(): void {
    if (!this.context) return;

    this.context.beginPath();
    this.context.moveTo(this.lastPosition.x, this.lastPosition.y);
    this.context.strokeStyle = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
    this.context.lineWidth = this.currentStrokeWidth;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';

    if (this.currentTool === 'eraser') {
      this.context.globalCompositeOperation = 'destination-out';
    } else {
      this.context.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Draw line
   */
  private drawLine(from: { x: number; y: number }, to: { x: number; y: number }): void {
    if (!this.context) return;

    this.context.lineTo(to.x, to.y);
    this.context.stroke();

    // Broadcast drawing action to other users
    this.broadcastDrawingAction({
      type: this.currentTool as any,
      data: { from, to },
      color: this.currentColor,
      strokeWidth: this.currentStrokeWidth
    });
  }

  /**
   * Set drawing tool
   */
  setTool(tool: string): void {
    if (this.settings.allowedTools.includes(tool)) {
      this.currentTool = tool;
      this.emit('tool-changed', { tool });
    }
  }

  /**
   * Set drawing color
   */
  setColor(color: string): void {
    this.currentColor = color;
    this.emit('color-changed', { color });
  }

  /**
   * Set stroke width
   */
  setStrokeWidth(width: number): void {
    if (this.settings.strokeWidths.includes(width)) {
      this.currentStrokeWidth = width;
      this.emit('stroke-width-changed', { width });
    }
  }

  /**
   * Draw rectangle
   */
  drawRectangle(startPos: { x: number; y: number }, endPos: { x: number; y: number }): void {
    if (!this.context) return;

    const width = endPos.x - startPos.x;
    const height = endPos.y - startPos.y;

    this.context.strokeStyle = this.currentColor;
    this.context.lineWidth = this.currentStrokeWidth;
    this.context.strokeRect(startPos.x, startPos.y, width, height);

    this.broadcastDrawingAction({
      type: 'rectangle',
      data: { startPos, endPos },
      color: this.currentColor,
      strokeWidth: this.currentStrokeWidth
    });
  }

  /**
   * Draw circle
   */
  drawCircle(center: { x: number; y: number }, radius: number): void {
    if (!this.context) return;

    this.context.beginPath();
    this.context.strokeStyle = this.currentColor;
    this.context.lineWidth = this.currentStrokeWidth;
    this.context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    this.context.stroke();

    this.broadcastDrawingAction({
      type: 'circle',
      data: { center, radius },
      color: this.currentColor,
      strokeWidth: this.currentStrokeWidth
    });
  }

  /**
   * Add text
   */
  addText(position: { x: number; y: number }, text: string, fontSize: number = 16): void {
    if (!this.context) return;

    this.context.fillStyle = this.currentColor;
    this.context.font = `${fontSize}px Arial`;
    this.context.fillText(text, position.x, position.y);

    this.broadcastDrawingAction({
      type: 'text',
      data: { position, text, fontSize },
      color: this.currentColor
    });
  }

  /**
   * Clear canvas
   */
  clearCanvas(): void {
    if (!this.context || !this.canvas) return;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawingHistory = [];

    this.broadcastDrawingAction({
      type: 'clear',
      data: {}
    });

    this.emit('canvas-cleared');
  }

  /**
   * Undo last action
   */
  undo(): void {
    if (this.drawingHistory.length === 0) return;

    this.drawingHistory.pop();
    this.redrawCanvas();
    this.emit('action-undone');
  }

  /**
   * Redraw entire canvas from history
   */
  private redrawCanvas(): void {
    if (!this.context || !this.canvas) return;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawingHistory.forEach(action => {
      this.executeDrawingAction(action, false);
    });
  }

  /**
   * Execute drawing action
   */
  private executeDrawingAction(action: DrawingAction, addToHistory: boolean = true): void {
    if (!this.context) return;

    switch (action.type) {
      case 'pen':
        this.context.strokeStyle = action.color || '#000000';
        this.context.lineWidth = action.strokeWidth || 2;
        this.context.globalCompositeOperation = 'source-over';
        this.context.lineTo(action.data.to.x, action.data.to.y);
        this.context.stroke();
        break;

      case 'eraser':
        this.context.globalCompositeOperation = 'destination-out';
        this.context.lineWidth = action.strokeWidth || 10;
        this.context.lineTo(action.data.to.x, action.data.to.y);
        this.context.stroke();
        break;

      case 'rectangle':
        this.context.strokeStyle = action.color || '#000000';
        this.context.lineWidth = action.strokeWidth || 2;
        const { startPos, endPos } = action.data;
        const width = endPos.x - startPos.x;
        const height = endPos.y - startPos.y;
        this.context.strokeRect(startPos.x, startPos.y, width, height);
        break;

      case 'circle':
        this.context.beginPath();
        this.context.strokeStyle = action.color || '#000000';
        this.context.lineWidth = action.strokeWidth || 2;
        const { center, radius } = action.data;
        this.context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        this.context.stroke();
        break;

      case 'text':
        this.context.fillStyle = action.color || '#000000';
        this.context.font = `${action.data.fontSize || 16}px Arial`;
        this.context.fillText(action.data.text, action.data.position.x, action.data.position.y);
        break;

      case 'clear':
        this.context.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
        break;
    }

    if (addToHistory && this.settings.saveHistory) {
      this.drawingHistory.push(action);
    }
  }

  /**
   * Broadcast drawing action to other users
   */
  private async broadcastDrawingAction(actionData: Partial<DrawingAction>): Promise<void> {
    if (!this.channel || !this.userId || !this.settings.collaborationEnabled) return;

    const action: DrawingAction = {
      id: `${Date.now()}-${Math.random()}`,
      userId: this.userId,
      displayName: 'User', // This should come from user profile
      timestamp: Date.now(),
      ...actionData
    } as DrawingAction;

    // Broadcast to other users
    await this.channel.send({
      type: 'broadcast',
      event: 'drawing-action',
      payload: action
    });

    // Save to database if history is enabled
    if (this.settings.saveHistory) {
      await this.supabase
        .from('whiteboard_actions')
        .insert({
          room_id: this.roomId,
          user_id: this.userId,
          action_type: action.type,
          action_data: action.data,
          color: action.color,
          stroke_width: action.strokeWidth,
          timestamp: new Date(action.timestamp).toISOString()
        });
    }
  }

  /**
   * Handle remote drawing action
   */
  private handleRemoteDrawingAction(action: DrawingAction): void {
    if (action.userId === this.userId) return;

    this.executeDrawingAction(action);
    this.emit('remote-action', action);
  }

  /**
   * Handle database drawing action
   */
  private handleDatabaseDrawingAction(dbAction: any): void {
    const action: DrawingAction = {
      id: dbAction.id,
      type: dbAction.action_type,
      userId: dbAction.user_id,
      displayName: dbAction.display_name || 'User',
      data: dbAction.action_data,
      color: dbAction.color,
      strokeWidth: dbAction.stroke_width,
      timestamp: new Date(dbAction.timestamp).getTime()
    };

    this.handleRemoteDrawingAction(action);
  }

  /**
   * Load whiteboard history from database
   */
  private async loadWhiteboardHistory(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('whiteboard_actions')
        .select('*')
        .eq('room_id', this.roomId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      if (data) {
        data.forEach(dbAction => {
          const action: DrawingAction = {
            id: dbAction.id,
            type: dbAction.action_type,
            userId: dbAction.user_id,
            displayName: dbAction.display_name || 'User',
            data: dbAction.action_data,
            color: dbAction.color,
            strokeWidth: dbAction.stroke_width,
            timestamp: new Date(dbAction.timestamp).getTime()
          };

          this.executeDrawingAction(action);
        });
      }

      this.emit('history-loaded', { actionsCount: data?.length || 0 });

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Export canvas as image
   */
  exportAsImage(format: 'png' | 'jpeg' = 'png'): string | null {
    if (!this.canvas) return null;
    return this.canvas.toDataURL(`image/${format}`);
  }

  /**
   * Import image to canvas
   */
  async importImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.context) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        this.context!.drawImage(img, 0, 0);
        this.emit('image-imported', { imageUrl });
        resolve();
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  }

  /**
   * Get whiteboard settings
   */
  getSettings(): WhiteboardSettings {
    return { ...this.settings };
  }

  /**
   * Update whiteboard settings
   */
  updateSettings(newSettings: Partial<WhiteboardSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settings-updated', { settings: this.settings });
  }

  /**
   * Disconnect from whiteboard
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
  }

  /**
   * Destroy whiteboard manager
   */
  destroy(): void {
    this.disconnect();
    
    // Remove canvas event listeners
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleMouseDown);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseup', this.handleMouseUp);
      this.canvas.removeEventListener('mouseout', this.handleMouseUp);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }

    this.removeAllListeners();
  }
}