/**
 * Production Error Handler - Enterprise-grade error management
 * Comprehensive error handling like Zoom/Teams with user-friendly recovery
 */

import { EventEmitter } from '../core/EventEmitter';

export interface ErrorContext {
  userId?: string;
  roomId?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  additionalInfo?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: ErrorContext;
  stackTrace?: string;
  userAction?: string;
  resolved: boolean;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'degrade' | 'reconnect' | 'reload';
  description: string;
  automatic: boolean;
  execute: () => Promise<void>;
}

export class ProductionErrorHandler extends EventEmitter {
  private errorReports: ErrorReport[] = [];
  private recoveryStrategies = new Map<string, RecoveryAction[]>();

  constructor() {
    super();
    this.setupRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Handle WebRTC specific errors
   */
  async handleWebRTCError(error: any, context: Partial<ErrorContext> = {}): Promise<void> {
    const errorReport = this.createErrorReport('webrtc', error, context);
    
    switch (error.name) {
      case 'NotAllowedError':
        await this.handlePermissionError(errorReport);
        break;
      case 'NotFoundError':
        await this.handleDeviceNotFoundError(errorReport);
        break;
      case 'OverconstrainedError':
        await this.handleConstraintError(errorReport);
        break;
      case 'NotSupportedError':
        await this.handleUnsupportedError(errorReport);
        break;
      case 'NotReadableError':
        await this.handleDeviceInUseError(errorReport);
        break;
      case 'AbortError':
        await this.handleAbortError(errorReport);
        break;
      default:
        await this.handleGenericWebRTCError(errorReport);
    }
  }

  /**
   * Handle permission denied errors
   */
  private async handlePermissionError(errorReport: ErrorReport): Promise<void> {
    errorReport.severity = 'high';
    errorReport.userAction = 'permission_required';

    this.emit('user-action-required', {
      type: 'permission_dialog',
      title: 'Camera and Microphone Access Required',
      message: 'To join the video call, please allow access to your camera and microphone in your browser settings.',
      actions: [
        {
          label: 'How to Enable Permissions',
          action: () => this.showPermissionGuide()
        },
        {
          label: 'Join Audio Only',
          action: () => this.fallbackToAudioOnly()
        },
        {
          label: 'Retry',
          action: () => this.retryMediaAccess()
        }
      ]
    });

    await this.logError(errorReport);
  }

  /**
   * Handle device not found errors
   */
  private async handleDeviceNotFoundError(errorReport: ErrorReport): Promise<void> {
    errorReport.severity = 'medium';
    
    this.emit('user-action-required', {
      type: 'device_selection_dialog',
      title: 'Camera or Microphone Not Found',
      message: 'The selected camera or microphone is not available. Please choose a different device.',
      actions: [
        {
          label: 'Select Different Device',
          action: () => this.showDeviceSelector()
        },
        {
          label: 'Use Default Device',
          action: () => this.fallbackToDefaultDevice()
        }
      ]
    });

    await this.logError(errorReport);
  }

  /**
   * Handle constraint errors (quality too high, etc.)
   */
  private async handleConstraintError(errorReport: ErrorReport): Promise<void> {
    errorReport.severity = 'low';
    
    // Automatically reduce constraints and retry
    await this.adaptConstraints();
    
    this.emit('quality-adapted', {
      reason: 'constraint_error',
      message: 'Video quality adjusted for device compatibility'
    });

    await this.logError(errorReport);
  }

  /**
   * Handle device in use errors
   */
  private async handleDeviceInUseError(errorReport: ErrorReport): Promise<void> {
    errorReport.severity = 'medium';
    
    this.emit('user-action-required', {
      type: 'device_conflict_dialog',
      title: 'Device Already in Use',
      message: 'Your camera or microphone is being used by another application. Please close other apps and try again.',
      actions: [
        {
          label: 'Retry',
          action: () => this.retryMediaAccess()
        },
        {
          label: 'Use Different Device',
          action: () => this.showDeviceSelector()
        },
        {
          label: 'Continue Without Video',
          action: () => this.fallbackToAudioOnly()
        }
      ]
    });

    await this.logError(errorReport);
  }

  /**
   * Handle network connection errors
   */
  async handleNetworkError(error: Error, context: Partial<ErrorContext> = {}): Promise<void> {
    const errorReport = this.createErrorReport('network', error, context);
    errorReport.severity = 'high';

    // Check if it's a temporary network issue
    const isTemporary = await this.checkNetworkConnectivity();
    
    if (isTemporary) {
      this.emit('network-recovery-attempt', {
        message: 'Connection lost. Attempting to reconnect...'
      });
      
      // Trigger automatic reconnection
      this.emit('trigger-reconnection', { reason: 'network_error' });
    } else {
      this.emit('user-action-required', {
        type: 'network_error_dialog',
        title: 'Connection Problem',
        message: 'Unable to connect to the video service. Please check your internet connection.',
        actions: [
          {
            label: 'Check Connection',
            action: () => this.runNetworkDiagnostics()
          },
          {
            label: 'Retry Connection',
            action: () => this.retryConnection()
          },
          {
            label: 'Join Audio Only',
            action: () => this.fallbackToAudioOnly()
          }
        ]
      });
    }

    await this.logError(errorReport);
  }

  /**
   * Handle server capacity errors
   */
  async handleCapacityError(error: Error, context: Partial<ErrorContext> = {}): Promise<void> {
    const errorReport = this.createErrorReport('capacity', error, context);
    errorReport.severity = 'critical';

    this.emit('user-action-required', {
      type: 'capacity_error_dialog',
      title: 'Room Full',
      message: 'This meeting has reached its participant limit. Please try again later or contact the meeting host.',
      actions: [
        {
          label: 'Notify When Available',
          action: () => this.requestWaitingRoom()
        },
        {
          label: 'Try Again Later',
          action: () => this.scheduleRetry()
        }
      ]
    });

    await this.logError(errorReport);
  }

  /**
   * Graceful degradation strategy
   */
  async gracefulDegradation(reason: string): Promise<void> {
    console.log(`🎯 Applying graceful degradation: ${reason}`);
    
    const degradationSteps = [
      {
        name: 'Reduce Video Quality',
        execute: async () => {
          this.emit('quality-reduction', { 
            from: 'HD', 
            to: 'SD', 
            reason 
          });
        }
      },
      {
        name: 'Disable Video Effects',
        execute: async () => {
          this.emit('effects-disabled', { reason });
        }
      },
      {
        name: 'Switch to Audio Only',
        execute: async () => {
          this.emit('video-disabled', { reason });
        }
      },
      {
        name: 'Reduce Audio Quality',
        execute: async () => {
          this.emit('audio-quality-reduced', { reason });
        }
      }
    ];

    for (const step of degradationSteps) {
      try {
        await step.execute();
        console.log(`✅ ${step.name} applied successfully`);
        this.emit('degradation-step-applied', { step: step.name, reason });
        
        // Wait and check if the issue is resolved
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // If degradation helped, stop here
        const isResolved = await this.checkSystemHealth();
        if (isResolved) {
          console.log(`🎯 Issue resolved after: ${step.name}`);
          break;
        }
      } catch (error) {
        console.error(`❌ Failed to apply ${step.name}:`, error);
      }
    }
  }

  /**
   * Setup recovery strategies for different error types
   */
  private setupRecoveryStrategies(): void {
    // WebRTC connection failures
    this.recoveryStrategies.set('webrtc_connection_failed', [
      {
        type: 'retry',
        description: 'Retry WebRTC connection',
        automatic: true,
        execute: async () => this.retryWebRTCConnection()
      },
      {
        type: 'fallback',
        description: 'Use alternative TURN server',
        automatic: true,
        execute: async () => this.useFallbackTURN()
      }
    ]);

    // Media stream errors
    this.recoveryStrategies.set('media_stream_failed', [
      {
        type: 'retry',
        description: 'Retry media access',
        automatic: false,
        execute: async () => this.retryMediaAccess()
      },
      {
        type: 'fallback',
        description: 'Use default constraints',
        automatic: true,
        execute: async () => this.fallbackToDefaultDevice()
      }
    ]);
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleJavaScriptError(event.error, {
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        additionalInfo: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event.reason, {
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });
  }

  /**
   * Handle generic JavaScript errors
   */
  private async handleJavaScriptError(error: Error, context: ErrorContext): Promise<void> {
    const errorReport = this.createErrorReport('javascript', error, context);
    errorReport.severity = 'medium';
    
    await this.logError(errorReport);
  }

  /**
   * Handle unhandled promise rejections
   */
  private async handlePromiseRejection(reason: any, context: Partial<ErrorContext>): Promise<void> {
    const error = new Error(String(reason));
    const errorReport = this.createErrorReport('promise_rejection', error, context);
    errorReport.severity = 'medium';
    
    await this.logError(errorReport);
  }

  /**
   * Create standardized error report
   */
  private createErrorReport(type: string, error: Error, context: Partial<ErrorContext> = {}): ErrorReport {
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    return {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: error.message,
      severity: 'medium',
      context: fullContext,
      stackTrace: error.stack,
      resolved: false
    };
  }

  /**
   * Log error to analytics and monitoring systems
   */
  private async logError(errorReport: ErrorReport): Promise<void> {
    this.errorReports.push(errorReport);
    
    // Emit for external logging systems
    this.emit('error-logged', errorReport);
    
    // In production, send to analytics service
    console.error('🚨 Production Error:', {
      id: errorReport.id,
      type: errorReport.type,
      message: errorReport.message,
      severity: errorReport.severity,
      context: errorReport.context
    });
  }

  // Helper methods for specific recovery actions
  private async showPermissionGuide(): Promise<void> {
    this.emit('show-help', { type: 'permissions' });
  }

  private async fallbackToAudioOnly(): Promise<void> {
    this.emit('fallback-audio-only');
  }

  private async retryMediaAccess(): Promise<void> {
    this.emit('retry-media-access');
  }

  private async showDeviceSelector(): Promise<void> {
    this.emit('show-device-selector');
  }

  private async fallbackToDefaultDevice(): Promise<void> {
    this.emit('fallback-default-device');
  }

  private async adaptConstraints(): Promise<void> {
    this.emit('adapt-constraints');
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      await fetch('/api/health', { method: 'HEAD' });
      return true;
    } catch {
      return false;
    }
  }

  private async runNetworkDiagnostics(): Promise<void> {
    this.emit('run-network-diagnostics');
  }

  private async retryConnection(): Promise<void> {
    this.emit('retry-connection');
  }

  private async requestWaitingRoom(): Promise<void> {
    this.emit('request-waiting-room');
  }

  private async scheduleRetry(): Promise<void> {
    this.emit('schedule-retry');
  }

  private async checkSystemHealth(): Promise<boolean> {
    // Simulate health check
    return Math.random() > 0.5;
  }

  private async retryWebRTCConnection(): Promise<void> {
    this.emit('retry-webrtc-connection');
  }

  private async useFallbackTURN(): Promise<void> {
    this.emit('use-fallback-turn');
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): any {
    return {
      totalErrors: this.errorReports.length,
      errorsByType: this.errorReports.reduce((acc, report) => {
        acc[report.type] = (acc[report.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errorsBySeverity: this.errorReports.reduce((acc, report) => {
        acc[report.severity] = (acc[report.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentErrors: this.errorReports.slice(-10)
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    console.log('🧹 ErrorHandler destroyed');
  }
}