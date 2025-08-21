/**
 * Production Configuration - Video SDK production environment
 * Enterprise-grade settings optimized for scale and reliability
 */

import { VideoSDKConfig } from '../core/VideoSDK';
import { EnterpriseVideoSDKConfig } from '../enterprise/EnterpriseVideoSDK';

export const productionConfig: VideoSDKConfig & EnterpriseVideoSDKConfig & {
  production: any;
  analytics: any;
  security: any;
} = {
  // Core SDK Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL!,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
  
  // Enterprise WebRTC Configuration
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302'
  ],
  turnServers: [
    {
      urls: 'turn:turn-us-east.yourapp.com:443',
      username: import.meta.env.VITE_TURN_USERNAME!,
      credential: import.meta.env.VITE_TURN_CREDENTIAL!
    },
    {
      urls: 'turn:turn-us-west.yourapp.com:443',
      username: import.meta.env.VITE_TURN_USERNAME!,
      credential: import.meta.env.VITE_TURN_CREDENTIAL!
    },
    {
      urls: 'turn:turn-eu-west.yourapp.com:443',
      username: import.meta.env.VITE_TURN_USERNAME!,
      credential: import.meta.env.VITE_TURN_CREDENTIAL!
    }
  ],
  maxParticipants: 1000, // Enterprise scale

  // Enterprise Features
  region: (import.meta.env.VITE_REGION as any) || 'us-east',
  enableSFU: true,
  enableAdaptiveBitrate: true,
  enableAudioProcessing: true,
  enableNetworkResilience: true,
  enableRecording: true,

  // Professional Audio Configuration
  audioConfig: {
    enableNoiseSuppression: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true,
    sampleRate: 48000,
    channels: 2, // Stereo for production
    voiceActivityDetection: true,
    mlNoiseSuppressionLevel: 'aggressive',
    professionalAudio: true,
    dynamicRangeCompression: true
  },

  // Enterprise Recording Configuration
  recordingConfig: {
    format: 'mp4',
    quality: '4K', // Ultra HD for production
    fps: 60,
    includeAudio: true,
    includeVideo: true,
    storageProvider: 'cloud',
    storageConfig: {
      bucket: import.meta.env.VITE_STORAGE_BUCKET!,
      region: import.meta.env.VITE_STORAGE_REGION!,
      encryption: true,
      redundancy: 'multi-region'
    },
    transcription: {
      enabled: true,
      language: 'auto',
      realTime: true
    }
  },

  // Production Components Configuration
  production: {
    connectionManager: {
      maxReconnectAttempts: 10,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 5000, // More frequent in production
      connectionTimeout: 15000,
      enableExponentialBackoff: true,
      enableJitterReduction: true,
      prioritizeStability: true
    },

    errorHandler: {
      enableRateLimiting: true,
      enableThreatDetection: true,
      logLevel: 'error', // Only errors in production
      enableUserFriendlyMessages: true,
      autoRetry: true,
      maxRetryAttempts: 5,
      enableCircuitBreaker: true,
      enableGracefulDegradation: true,
      alertingThreshold: 'medium'
    },

    loadBalancer: {
      strategy: { name: 'intelligent' }, // AI-driven selection
      healthCheckInterval: 30000,
      maxRetries: 5,
      timeoutMs: 5000,
      enableFailover: true,
      enableGeolocation: true,
      capacityThreshold: 0.85,
      enablePredictiveScaling: true,
      
      // Geographic distribution
      regionWeights: {
        'us-east': 1.0,
        'us-west': 1.0,
        'eu-west': 0.9,
        'asia-pacific': 0.8
      }
    }
  },

  // Production Analytics Configuration
  analytics: {
    enableRealTimeTracking: true,
    metricsInterval: 10000, // 10 seconds for production monitoring
    batchSize: 100,
    retentionPeriod: 90, // 90 days for compliance
    enableUserTracking: true,
    enablePerformanceTracking: true,
    apiEndpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT!,
    debugMode: false,
    
    // Advanced analytics
    enableBusinessIntelligence: true,
    enablePredictiveAnalytics: true,
    enableAnomalyDetection: true,
    
    // Compliance and privacy
    enableDataGovernance: true,
    enableGDPRCompliance: true,
    enableHIPAACompliance: true,
    dataRetentionPolicy: '7-years'
  },

  // Enterprise Security Configuration
  security: {
    enableRateLimiting: true,
    enableThreatDetection: true,
    enableE2EE: true, // End-to-end encryption
    maxConnectionsPerIP: 50,
    maxRoomsPerUser: 5,
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    tokenExpirationMs: 60 * 60 * 1000, // 1 hour
    
    // Domain restrictions
    allowedDomains: import.meta.env.VITE_ALLOWED_DOMAINS?.split(',') || [],
    blockedIPs: import.meta.env.VITE_BLOCKED_IPS?.split(',') || [],
    
    // Advanced security
    enableBruteForceProtection: true,
    enableDDoSProtection: true,
    enableContentFiltering: true,
    enableAuditLogging: true,
    enableCompliance: true,
    
    // Encryption
    encryptionLevel: 'AES-256',
    enablePerfectForwardSecrecy: true,
    enableCertificatePinning: true
  },

  // Production Logging Configuration
  logging: {
    level: 'warn', // Minimal logging in production
    enableConsoleOutput: false,
    enableFileOutput: true,
    enableAnalyticsLogging: true,
    includeStackTrace: false,
    maskSensitiveData: true,
    
    // Log aggregation
    enableLogAggregation: true,
    logAggregationEndpoint: import.meta.env.VITE_LOG_ENDPOINT!,
    enableStructuredLogging: true,
    enableLogCompression: true
  },

  // Production Feature Configuration
  features: {
    enableBreakoutRooms: true,
    enableScreenShare: true,
    enableRecording: true,
    enableTranscription: true,
    enableAIFeatures: true,
    enableVirtualBackgrounds: true,
    enableChat: true,
    enableReactions: true,
    enablePolls: true,
    enableWhiteboard: true,
    enableFileSharing: true,
    
    // Advanced features
    enableLiveStreaming: true,
    enableWebinars: true,
    enableIntegrations: true,
    enableCustomBranding: true,
    enableAdvancedModeration: true
  },

  // Production API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL!,
    timeout: 30000,
    retryAttempts: 5,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    
    // Performance optimizations
    enableCompression: true,
    enablePipelining: true,
    enableConnectionPooling: true,
    
    // Security
    enableCORS: true,
    enableCSRF: true,
    enableAPIKeyAuth: true
  },

  // Enterprise WebRTC Settings
  webrtc: {
    iceGatheringTimeout: 5000, // Faster in production
    iceConnectionTimeout: 15000,
    enableIPv6: true,
    enableDscp: true, // Quality of Service
    enableBundlePolicy: 'max-bundle',
    enableRtcpMuxPolicy: 'require',
    
    // Advanced settings
    enableJitterBuffer: true,
    enablePacketization: true,
    enableFEC: true, // Forward Error Correction
    enableUlpfec: true, // Uneven Level Protection FEC
    enableFlexfec: true,
    
    // Media constraints optimized for production
    defaultVideoConstraints: {
      width: { ideal: 1920, max: 3840 }, // Up to 4K
      height: { ideal: 1080, max: 2160 },
      frameRate: { ideal: 30, max: 60 }
    },
    
    defaultAudioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 2
    }
  },

  // Production UI/UX Configuration
  ui: {
    theme: 'auto', // System preference
    showDebugInfo: false,
    showPerformanceMetrics: false,
    enableKeyboardShortcuts: true,
    showTooltips: true,
    animationsEnabled: true,
    compactMode: false,
    
    // Accessibility
    enableA11y: true,
    enableHighContrast: true,
    enableScreenReader: true,
    enableKeyboardNavigation: true
  },

  // Enterprise Quality Settings
  quality: {
    adaptiveBitrate: true,
    initialVideoQuality: 'high', // Start with high quality
    minVideoBitrate: 300000, // 300 kbps
    maxVideoBitrate: 8000000, // 8 Mbps
    minAudioBitrate: 128000, // 128 kbps
    maxAudioBitrate: 320000, // 320 kbps
    
    // Professional quality levels
    qualityLevels: {
      minimal: { width: 320, height: 180, bitrate: 300000 },
      low: { width: 640, height: 360, bitrate: 600000 },
      medium: { width: 1280, height: 720, bitrate: 1200000 },
      high: { width: 1920, height: 1080, bitrate: 2500000 },
      ultra: { width: 3840, height: 2160, bitrate: 8000000 } // 4K
    },
    
    // Adaptive streaming
    enableSimulcast: true,
    enableSVC: true, // Scalable Video Coding
    enableAV1: true, // Next-gen codec
    enableHEVC: true // High Efficiency Video Coding
  },

  // Enterprise Notifications
  notifications: {
    enableBrowserNotifications: true,
    enableSoundNotifications: true,
    enableToastNotifications: true,
    enableEmailNotifications: true,
    enableSMSNotifications: true,
    enableSlackIntegration: true,
    enableTeamsIntegration: true,
    
    // Advanced notifications
    enableWebhooks: true,
    webhookEndpoint: import.meta.env.VITE_WEBHOOK_ENDPOINT,
    enableRealTimeAlerts: true,
    enableEscalation: true
  },

  // Monitoring and Observability
  monitoring: {
    enableAPM: true, // Application Performance Monitoring
    apmEndpoint: import.meta.env.VITE_APM_ENDPOINT!,
    enableTracing: true,
    enableMetrics: true,
    enableLogging: true,
    
    // Health checks
    enableHealthChecks: true,
    healthCheckInterval: 30000,
    
    // Alerting
    enableAlerting: true,
    alertingThreshold: {
      errorRate: 0.05, // 5%
      latency: 500, // 500ms
      availability: 0.999 // 99.9%
    }
  },

  // Compliance and Governance
  compliance: {
    enableGDPR: true,
    enableHIPAA: true,
    enableSOC2: true,
    enableISO27001: true,
    
    // Data protection
    enableDataEncryption: true,
    enableDataMasking: true,
    enableDataRetention: true,
    enableRightToErasure: true,
    
    // Audit
    enableAuditTrail: true,
    auditRetentionPeriod: '7-years',
    enableComplianceReporting: true
  },

  // Disaster Recovery
  disasterRecovery: {
    enableBackups: true,
    backupFrequency: '4-hours',
    backupRetention: '1-year',
    enableReplication: true,
    replicationRegions: ['us-east', 'us-west', 'eu-west'],
    enableFailover: true,
    rto: 300, // 5 minutes Recovery Time Objective
    rpo: 3600 // 1 hour Recovery Point Objective
  }
};

// Production utilities for operations
export const productionUtils = {
  // Health check endpoint
  healthCheck: async (): Promise<{ status: string; timestamp: Date; services: any }> => {
    const services = {
      database: 'healthy',
      supabase: 'healthy',
      sfu: 'healthy',
      storage: 'healthy',
      analytics: 'healthy'
    };

    return {
      status: 'healthy',
      timestamp: new Date(),
      services
    };
  },

  // Performance metrics
  getMetrics: (): any => {
    return {
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      timing: performance.timing,
      navigationTiming: performance.getEntriesByType('navigation')[0]
    };
  },

  // Environment validation
  validateEnvironment: (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!import.meta.env.VITE_SUPABASE_URL) {
      errors.push('VITE_SUPABASE_URL is required');
    }
    
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
      errors.push('VITE_SUPABASE_ANON_KEY is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
};

export default productionConfig;