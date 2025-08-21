/**
 * Configuration Manager - Environment-aware configuration system
 * Intelligent configuration selection based on environment and runtime conditions
 */

import developmentConfig, { developmentUtils } from './development';
import productionConfig, { productionUtils } from './production';

// Environment detection
const getEnvironment = (): 'development' | 'production' | 'test' => {
  // Check explicit environment variable first
  if (import.meta.env.VITE_ENVIRONMENT) {
    return import.meta.env.VITE_ENVIRONMENT as 'development' | 'production' | 'test';
  }
  
  // Check Node environment
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  if (import.meta.env.PROD) {
    return 'production';
  }
  
  // Check for test environment
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'development';
  }
  
  // Default to production for safety
  return 'production';
};

// Current environment
export const CURRENT_ENVIRONMENT = getEnvironment();

// Configuration selector
export const getVideoSDKConfig = () => {
  const env = CURRENT_ENVIRONMENT;
  
  console.log(`🔧 Loading Video SDK configuration for: ${env}`);
  
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'production':
      return productionConfig;
    default:
      console.warn(`⚠️ Unknown environment: ${env}, falling back to development config`);
      return developmentConfig;
  }
};

// Configuration utilities selector
export const getConfigUtils = () => {
  switch (CURRENT_ENVIRONMENT) {
    case 'development':
      return developmentUtils;
    case 'production':
      return productionUtils;
    default:
      return developmentUtils;
  }
};

// Global configuration
export const videoSDKConfig = getVideoSDKConfig();
export const configUtils = getConfigUtils();

// Environment-specific feature flags
export const isFeatureEnabled = (feature: string): boolean => {
  const config = videoSDKConfig;
  
  // Check feature flags first
  if (config.features && feature in config.features) {
    return config.features[feature as keyof typeof config.features];
  }
  
  // Environment-based defaults
  switch (feature) {
    case 'debug':
      return CURRENT_ENVIRONMENT === 'development';
    case 'analytics':
      return config.analytics?.enableRealTimeTracking || false;
    case 'security':
      return config.security?.enableThreatDetection || false;
    case 'recording':
      return config.enableRecording || false;
    case 'transcription':
      return config.features?.enableTranscription || false;
    default:
      return false;
  }
};

// Configuration validation
export const validateConfiguration = (): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = videoSDKConfig;

  // Required fields validation
  if (!config.supabaseUrl) {
    errors.push('Supabase URL is required');
  }
  
  if (!config.supabaseKey) {
    errors.push('Supabase anon key is required');
  }

  // URL format validation
  if (config.supabaseUrl && !config.supabaseUrl.startsWith('https://')) {
    if (CURRENT_ENVIRONMENT === 'production') {
      errors.push('Supabase URL must use HTTPS in production');
    } else {
      warnings.push('Consider using HTTPS for Supabase URL');
    }
  }

  // Production-specific validations
  if (CURRENT_ENVIRONMENT === 'production') {
    if (!config.turnServers || config.turnServers.length === 0) {
      errors.push('TURN servers are required for production');
    }
    
    if (config.logging?.level === 'debug') {
      warnings.push('Debug logging should be disabled in production');
    }
    
    if (!config.security?.enableThreatDetection) {
      warnings.push('Threat detection should be enabled in production');
    }
  }

  // Development-specific validations
  if (CURRENT_ENVIRONMENT === 'development') {
    if (config.maxParticipants && config.maxParticipants > 50) {
      warnings.push('High participant limit in development may cause performance issues');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// Runtime configuration updates
export const updateConfiguration = (updates: Partial<typeof videoSDKConfig>): void => {
  console.log('🔧 Updating Video SDK configuration:', updates);
  
  // Merge updates (shallow merge for safety)
  Object.assign(videoSDKConfig, updates);
  
  // Trigger configuration change event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('videosdk-config-changed', { 
      detail: { updates, newConfig: videoSDKConfig } 
    }));
  }
};

// Configuration monitoring
export const startConfigurationMonitoring = (): void => {
  if (typeof window === 'undefined') return;

  // Monitor environment changes
  const observer = new MutationObserver(() => {
    const newEnv = getEnvironment();
    if (newEnv !== CURRENT_ENVIRONMENT) {
      console.log(`🔄 Environment changed from ${CURRENT_ENVIRONMENT} to ${newEnv}`);
      location.reload(); // Reload to apply new configuration
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-environment']
  });

  console.log('🔍 Configuration monitoring started');
};

// Configuration debugging helper
export const debugConfiguration = (): void => {
  if (CURRENT_ENVIRONMENT !== 'development') {
    console.warn('Configuration debugging is only available in development');
    return;
  }

  console.group('🔧 Video SDK Configuration Debug');
  console.log('Environment:', CURRENT_ENVIRONMENT);
  console.log('Configuration:', videoSDKConfig);
  
  const validation = validateConfiguration();
  console.log('Validation:', validation);
  
  if (validation.errors.length > 0) {
    console.error('Configuration Errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('Configuration Warnings:', validation.warnings);
  }
  
  console.groupEnd();
};

// Export commonly used configurations
export const webrtcConfig = {
  iceServers: [
    ...videoSDKConfig.stunServers?.map(url => ({ urls: url })) || [],
    ...(videoSDKConfig.turnServers || [])
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: videoSDKConfig.webrtc?.enableBundlePolicy || 'max-bundle',
  rtcpMuxPolicy: videoSDKConfig.webrtc?.enableRtcpMuxPolicy || 'require'
} as RTCConfiguration;

export const mediaConstraints = {
  video: videoSDKConfig.webrtc?.defaultVideoConstraints || {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: videoSDKConfig.webrtc?.defaultAudioConstraints || {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// Initialize configuration
export const initializeConfiguration = async (): Promise<void> => {
  console.log('🚀 Initializing Video SDK Configuration...');
  
  // Validate configuration
  const validation = validateConfiguration();
  
  if (!validation.valid) {
    console.error('❌ Configuration validation failed:', validation.errors);
    throw new Error(`Configuration errors: ${validation.errors.join(', ')}`);
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:', validation.warnings);
  }
  
  // Environment-specific initialization
  if (CURRENT_ENVIRONMENT === 'development') {
    if (configUtils && 'enableDebugMode' in configUtils) {
      configUtils.enableDebugMode();
    }
  }
  
  // Start monitoring if enabled
  if (isFeatureEnabled('monitoring')) {
    startConfigurationMonitoring();
  }
  
  console.log('✅ Video SDK Configuration initialized successfully');
};

// Default export
export default {
  config: videoSDKConfig,
  utils: configUtils,
  environment: CURRENT_ENVIRONMENT,
  webrtcConfig,
  mediaConstraints,
  isFeatureEnabled,
  validateConfiguration,
  updateConfiguration,
  debugConfiguration,
  initializeConfiguration
};