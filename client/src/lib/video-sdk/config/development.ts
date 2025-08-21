/**
 * Development Configuration - Video SDK development environment
 * Optimized settings for development and testing
 */

import { VideoSDKConfig } from '../core/VideoSDK';
import { EnterpriseVideoSDKConfig } from '../enterprise/EnterpriseVideoSDK';

export const developmentConfig: VideoSDKConfig & EnterpriseVideoSDKConfig & {
  production: any;
  analytics: any;
  security: any;
} = {
  // Core SDK Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-dev-project.supabase.co',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-dev-anon-key',
  
  // WebRTC Configuration
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302'
  ],
  turnServers: [
    {
      urls: 'turn:dev-turn.yourapp.com:3478',
      username: 'dev-user',
      credential: 'dev-pass'
    }
  ],
  maxParticipants: 10, // Limited for development

  // Enterprise Features
  region: 'us-east',
  enableSFU: true,
  enableAdaptiveBitrate: true,
  enableAudioProcessing: true,
  enableNetworkResilience: true,
  enableRecording: true,

  // Audio Configuration
  audioConfig: {
    enableNoiseSuppression: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true,
    sampleRate: 48000,
    channels: 1,
    voiceActivityDetection: true,
    mlNoiseSuppressionLevel: 'moderate'
  },

  // Recording Configuration
  recordingConfig: {
    format: 'mp4',
    quality: 'HD',
    fps: 30,
    includeAudio: true,
    includeVideo: true,
    storageProvider: 'local',
    storageConfig: {
      path: './recordings',
      maxFileSize: '1GB'
    }
  },

  // Production Components Configuration
  production: {
    connectionManager: {
      maxReconnectAttempts: 5,
      initialReconnectDelay: 1000,
      maxReconnectDelay: 10000,
      heartbeatInterval: 10000,
      connectionTimeout: 30000,
      enableExponentialBackoff: true
    },

    errorHandler: {
      enableRateLimiting: false, // Disabled for development
      enableThreatDetection: false,
      logLevel: 'debug',
      enableUserFriendlyMessages: true,
      autoRetry: true,
      maxRetryAttempts: 3
    },

    loadBalancer: {
      strategy: { name: 'round_robin' },
      healthCheckInterval: 60000,
      maxRetries: 2,
      timeoutMs: 10000,
      enableFailover: true,
      enableGeolocation: false, // Simplified for dev
      capacityThreshold: 0.9
    }
  },

  // Analytics Configuration
  analytics: {
    enableRealTimeTracking: true,
    metricsInterval: 30000, // 30 seconds for development
    batchSize: 10,
    retentionPeriod: 7, // 7 days for development
    enableUserTracking: true,
    enablePerformanceTracking: true,
    apiEndpoint: null, // No external analytics in dev
    debugMode: true
  },

  // Security Configuration
  security: {
    enableRateLimiting: false, // Disabled for easier development
    enableThreatDetection: false,
    enableE2EE: false,
    maxConnectionsPerIP: 100,
    maxRoomsPerUser: 10,
    sessionTimeoutMs: 4 * 60 * 60 * 1000, // 4 hours
    tokenExpirationMs: 2 * 60 * 60 * 1000, // 2 hours
    allowedDomains: [], // Allow all domains in dev
    blockedIPs: []
  },

  // Logging Configuration
  logging: {
    level: 'debug',
    enableConsoleOutput: true,
    enableFileOutput: false,
    enableAnalyticsLogging: false,
    includeStackTrace: true,
    maskSensitiveData: false
  },

  // Development-specific Features
  development: {
    enableDevTools: true,
    enableMockData: true,
    enableTestingMode: true,
    simulateNetworkConditions: false,
    debugWebRTC: true,
    
    // Mock SFU servers for development
    mockSFUServers: [
      {
        id: 'dev-sfu-1',
        endpoint: 'ws://localhost:8080',
        region: 'local',
        capacity: { max: 50, current: 0 }
      }
    ],

    // Development database settings
    database: {
      enableMigrations: true,
      enableSeeding: true,
      resetOnStart: false,
      mockDataSize: 'small'
    },

    // Testing configuration
    testing: {
      enableAutomatedTests: true,
      testDataGeneration: true,
      performanceTesting: false,
      loadTesting: false
    }
  },

  // Feature Flags for Development
  features: {
    enableBreakoutRooms: true,
    enableScreenShare: true,
    enableRecording: true,
    enableTranscription: false, // Expensive, disabled in dev
    enableAIFeatures: false, // Expensive, disabled in dev
    enableVirtualBackgrounds: false,
    enableChat: true,
    enableReactions: true,
    enablePolls: true,
    enableWhiteboard: false,
    enableFileSharing: true
  },

  // API Configuration
  api: {
    baseUrl: 'http://localhost:5000/api',
    timeout: 30000,
    retryAttempts: 3,
    enableCaching: false, // Disabled for development
    cacheTimeout: 0
  },

  // WebRTC Advanced Settings
  webrtc: {
    iceGatheringTimeout: 10000,
    iceConnectionTimeout: 30000,
    enableIPv6: false,
    enableDscp: false,
    enableBundlePolicy: 'max-bundle',
    enableRtcpMuxPolicy: 'require',
    
    // Media constraints
    defaultVideoConstraints: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    },
    
    defaultAudioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000
    }
  },

  // UI/UX Configuration for Development
  ui: {
    theme: 'light',
    showDebugInfo: true,
    showPerformanceMetrics: true,
    enableKeyboardShortcuts: true,
    showTooltips: true,
    animationsEnabled: true,
    compactMode: false
  },

  // Bandwidth and Quality Settings
  quality: {
    adaptiveBitrate: true,
    initialVideoQuality: 'medium',
    minVideoBitrate: 150000, // 150 kbps
    maxVideoBitrate: 2000000, // 2 Mbps
    minAudioBitrate: 64000, // 64 kbps
    maxAudioBitrate: 128000, // 128 kbps
    
    qualityLevels: {
      low: { width: 320, height: 240, bitrate: 300000 },
      medium: { width: 640, height: 480, bitrate: 600000 },
      high: { width: 1280, height: 720, bitrate: 1200000 },
      ultra: { width: 1920, height: 1080, bitrate: 2000000 }
    }
  },

  // Notifications and Alerts
  notifications: {
    enableBrowserNotifications: true,
    enableSoundNotifications: true,
    enableToastNotifications: true,
    enableEmailNotifications: false,
    enableSMSNotifications: false
  }
};

// Development-specific utilities
export const developmentUtils = {
  // Mock data generators
  generateMockUser: () => ({
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    email: `dev.user${Math.floor(Math.random() * 1000)}@example.com`,
    displayName: `Dev User ${Math.floor(Math.random() * 100)}`,
    role: 'user'
  }),

  generateMockRoom: () => ({
    id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: `Development Room ${Math.floor(Math.random() * 100)}`,
    description: 'Auto-generated room for development testing',
    maxParticipants: Math.floor(Math.random() * 10) + 5,
    isPrivate: Math.random() > 0.7
  }),

  // Development helpers
  enableDebugMode: () => {
    (window as any).__VIDEO_SDK_DEBUG__ = true;
    console.log('🔧 Video SDK Debug Mode Enabled');
  },

  disableDebugMode: () => {
    (window as any).__VIDEO_SDK_DEBUG__ = false;
    console.log('🔧 Video SDK Debug Mode Disabled');
  },

  // Performance monitoring for development
  startPerformanceMonitoring: () => {
    if ('performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            console.log(`📊 Performance: ${entry.name} took ${entry.duration}ms`);
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
      console.log('📊 Performance monitoring started');
    }
  },

  // Network simulation for testing
  simulateNetworkConditions: (condition: 'good' | 'poor' | 'offline') => {
    const conditions = {
      good: { latency: 50, packetLoss: 0.01 },
      poor: { latency: 300, packetLoss: 0.05 },
      offline: { latency: 99999, packetLoss: 1 }
    };

    (window as any).__SIMULATED_NETWORK__ = conditions[condition];
    console.log(`🌐 Simulating ${condition} network conditions:`, conditions[condition]);
  }
};

// Export configuration
export default developmentConfig;