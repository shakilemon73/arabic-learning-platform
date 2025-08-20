import { EventEmitter } from '../core/EventEmitter';

export interface AudioProcessingConfig {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  voiceActivityDetection: boolean;
  advancedNoiseSuppression: boolean;
  speechEnhancement: boolean;
  backgroundMusicSuppression: boolean;
}

export interface AudioMetrics {
  inputLevel: number; // 0-100
  outputLevel: number;
  noiseLevel: number;
  speechProbability: number; // 0-1
  echoDetected: boolean;
  backgroundMusicDetected: boolean;
}

export interface VoiceActivityEvent {
  isActive: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Enterprise Audio Processing Manager
 * Advanced audio processing like Zoom, Teams, Google Meet
 */
export class AudioProcessingManager extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  
  // Audio processing nodes
  private gainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private biquadFilter: BiquadFilterNode | null = null;
  
  // Processing configuration
  private config: AudioProcessingConfig;
  private isInitialized = false;
  private isProcessing = false;
  
  // Audio analysis
  private analyserNode: AnalyserNode | null = null;
  private audioData: Float32Array | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  // Voice Activity Detection
  private vadThreshold = 0.3;
  private speechSamples: number[] = [];
  private backgroundNoiseSamples: number[] = [];
  private isCalibrating = true;
  private calibrationStartTime = 0;
  
  // Advanced features
  private mlModelsLoaded = false;
  private noiseSuppressionModel: any = null;
  private speechEnhancementModel: any = null;

  constructor(config: Partial<AudioProcessingConfig> = {}) {
    super();
    
    this.config = {
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
      voiceActivityDetection: true,
      advancedNoiseSuppression: true,
      speechEnhancement: true,
      backgroundMusicSuppression: true,
      ...config
    };
  }

  /**
   * Initialize audio processing system
   */
  async initialize(): Promise<void> {
    try {
      console.log('🎙️ Initializing enterprise audio processing...');
      
      // Create audio context with optimal settings
      this.audioContext = new AudioContext({
        sampleRate: 48000, // Professional quality
        latencyHint: 'interactive' // Low latency for real-time
      });

      // Load advanced ML models if enabled
      if (this.config.advancedNoiseSuppression || this.config.speechEnhancement) {
        await this.loadMLModels();
      }

      // Register audio worklet for advanced processing
      await this.registerAudioWorklet();

      this.isInitialized = true;
      console.log('✅ Audio processing system initialized');
      
      this.emit('initialized');

    } catch (error) {
      console.error('❌ Failed to initialize audio processing:', error);
      throw error;
    }
  }

  /**
   * Load machine learning models for advanced audio processing
   */
  private async loadMLModels(): Promise<void> {
    try {
      console.log('🧠 Loading advanced audio ML models...');
      
      // Note: In a real implementation, you would load actual ML models
      // For this demo, we'll simulate the loading process
      
      if (this.config.advancedNoiseSuppression) {
        // Simulate loading RNNoise or similar noise suppression model
        await this.simulateModelLoad('noise-suppression');
        this.noiseSuppressionModel = { loaded: true, type: 'RNNoise' };
      }

      if (this.config.speechEnhancement) {
        // Simulate loading speech enhancement model
        await this.simulateModelLoad('speech-enhancement');
        this.speechEnhancementModel = { loaded: true, type: 'SpeechEnhancer' };
      }

      this.mlModelsLoaded = true;
      console.log('✅ ML models loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load ML models:', error);
      // Continue without advanced features
    }
  }

  /**
   * Simulate ML model loading (replace with actual model loading in production)
   */
  private async simulateModelLoad(modelType: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`📦 Loaded ${modelType} model`);
        resolve();
      }, 1000);
    });
  }

  /**
   * Register custom audio worklet for advanced processing
   */
  private async registerAudioWorklet(): Promise<void> {
    try {
      // Audio worklet code for advanced processing
      const workletCode = `
        class AudioProcessorWorklet extends AudioWorkletProcessor {
          constructor() {
            super();
            this.noiseGateThreshold = -50; // dB
            this.compressionRatio = 4;
            this.speechDetectionBuffer = new Float32Array(1024);
            this.bufferIndex = 0;
          }

          process(inputs, outputs, parameters) {
            const input = inputs[0];
            const output = outputs[0];
            
            if (input.length > 0 && output.length > 0) {
              const inputChannel = input[0];
              const outputChannel = output[0];
              
              for (let i = 0; i < inputChannel.length; i++) {
                let sample = inputChannel[i];
                
                // Apply noise gate
                sample = this.applyNoiseGate(sample);
                
                // Apply dynamic compression
                sample = this.applyCompression(sample);
                
                // Store for speech detection
                this.speechDetectionBuffer[this.bufferIndex] = Math.abs(sample);
                this.bufferIndex = (this.bufferIndex + 1) % this.speechDetectionBuffer.length;
                
                outputChannel[i] = sample;
              }
              
              // Send speech detection results
              if (this.bufferIndex % 256 === 0) {
                const speechLevel = this.calculateSpeechLevel();
                this.port.postMessage({
                  type: 'speech-level',
                  level: speechLevel
                });
              }
            }
            
            return true;
          }
          
          applyNoiseGate(sample) {
            const level = 20 * Math.log10(Math.abs(sample) + 1e-10);
            return level > this.noiseGateThreshold ? sample : 0;
          }
          
          applyCompression(sample) {
            const threshold = 0.7;
            if (Math.abs(sample) > threshold) {
              const excess = Math.abs(sample) - threshold;
              const compressedExcess = excess / this.compressionRatio;
              return Math.sign(sample) * (threshold + compressedExcess);
            }
            return sample;
          }
          
          calculateSpeechLevel() {
            let sum = 0;
            for (let i = 0; i < this.speechDetectionBuffer.length; i++) {
              sum += this.speechDetectionBuffer[i];
            }
            return sum / this.speechDetectionBuffer.length;
          }
        }
        
        registerProcessor('audio-processor-worklet', AudioProcessorWorklet);
      `;

      // Create blob URL for worklet
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await this.audioContext!.audioWorklet.addModule(workletUrl);
      console.log('✅ Audio worklet registered');

    } catch (error) {
      console.error('❌ Failed to register audio worklet:', error);
    }
  }

  /**
   * Process audio stream with enterprise-grade features
   */
  async processAudioStream(inputStream: MediaStream): Promise<MediaStream> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🎙️ Starting audio processing pipeline...');
      
      // Create audio graph
      this.sourceNode = this.audioContext!.createMediaStreamSource(inputStream);
      this.destinationNode = this.audioContext!.createMediaStreamDestination();
      
      // Create processing nodes
      await this.createProcessingNodes();
      
      // Connect the audio graph
      this.connectAudioGraph();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      // Start voice activity detection calibration
      this.startVADCalibration();
      
      this.isProcessing = true;
      console.log('✅ Audio processing pipeline active');
      
      this.emit('processing-started');
      
      return this.destinationNode.stream;

    } catch (error) {
      console.error('❌ Failed to process audio stream:', error);
      throw error;
    }
  }

  /**
   * Create audio processing nodes
   */
  private async createProcessingNodes(): Promise<void> {
    if (!this.audioContext) return;

    // Gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    // Compressor for dynamic range control
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // High-pass filter to remove low-frequency noise
    this.biquadFilter = this.audioContext.createBiquadFilter();
    this.biquadFilter.type = 'highpass';
    this.biquadFilter.frequency.value = 85; // Remove frequencies below 85Hz
    this.biquadFilter.Q.value = 0.7;

    // Analyser for real-time metrics
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.audioData = new Float32Array(this.analyserNode.frequencyBinCount);

    // Advanced processing worklet
    try {
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor-worklet');
      
      // Listen for speech detection from worklet
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'speech-level') {
          this.processSpeechLevel(event.data.level);
        }
      };
    } catch (error) {
      console.warn('⚠️ Audio worklet not available, using basic processing');
    }
  }

  /**
   * Connect audio processing graph
   */
  private connectAudioGraph(): void {
    if (!this.sourceNode || !this.destinationNode) return;

    let currentNode: AudioNode = this.sourceNode;

    // Connect high-pass filter
    if (this.biquadFilter) {
      currentNode.connect(this.biquadFilter);
      currentNode = this.biquadFilter;
    }

    // Connect advanced processing worklet
    if (this.workletNode) {
      currentNode.connect(this.workletNode);
      currentNode = this.workletNode;
    }

    // Connect compressor
    if (this.compressorNode) {
      currentNode.connect(this.compressorNode);
      currentNode = this.compressorNode;
    }

    // Connect gain control
    if (this.gainNode) {
      currentNode.connect(this.gainNode);
      currentNode = this.gainNode;
    }

    // Connect analyser (for metrics)
    if (this.analyserNode) {
      currentNode.connect(this.analyserNode);
    }

    // Connect to destination
    currentNode.connect(this.destinationNode);

    console.log('🔗 Audio processing graph connected');
  }

  /**
   * Start real-time audio metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      if (this.analyserNode && this.audioData) {
        this.analyserNode.getFloatFrequencyData(this.audioData);
        
        const metrics = this.calculateAudioMetrics();
        this.emit('audio-metrics', metrics);
      }
    }, 100); // Update every 100ms
  }

  /**
   * Calculate real-time audio metrics
   */
  private calculateAudioMetrics(): AudioMetrics {
    if (!this.audioData) {
      return {
        inputLevel: 0,
        outputLevel: 0,
        noiseLevel: 0,
        speechProbability: 0,
        echoDetected: false,
        backgroundMusicDetected: false
      };
    }

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < this.audioData.length; i++) {
      sum += this.audioData[i] * this.audioData[i];
    }
    const rmsLevel = Math.sqrt(sum / this.audioData.length);
    const inputLevel = Math.max(0, Math.min(100, (rmsLevel + 100) * 1.25)); // Convert dB to 0-100

    // Estimate noise level (low frequencies)
    let noiseSample = 0;
    const noiseBins = Math.floor(this.audioData.length * 0.1); // First 10% of frequency bins
    for (let i = 0; i < noiseBins; i++) {
      noiseSample += this.audioData[i];
    }
    const noiseLevel = Math.max(0, Math.min(100, (noiseSample / noiseBins + 100) * 1.25));

    // Speech probability estimation
    const speechFrequencyRange = this.audioData.slice(
      Math.floor(this.audioData.length * 0.1), // 300Hz
      Math.floor(this.audioData.length * 0.4)  // 3400Hz (typical speech range)
    );
    let speechEnergy = 0;
    for (let i = 0; i < speechFrequencyRange.length; i++) {
      speechEnergy += speechFrequencyRange[i];
    }
    const speechProbability = Math.max(0, Math.min(1, (speechEnergy + 100) / 80));

    // Simple echo detection (frequency domain correlation)
    const echoDetected = this.detectEcho();

    // Background music detection (harmonic content analysis)
    const backgroundMusicDetected = this.detectBackgroundMusic();

    return {
      inputLevel,
      outputLevel: inputLevel, // Simplified - same as input after processing
      noiseLevel,
      speechProbability,
      echoDetected,
      backgroundMusicDetected
    };
  }

  /**
   * Simple echo detection algorithm
   */
  private detectEcho(): boolean {
    if (!this.audioData) return false;
    
    // Look for repeating patterns in frequency domain
    const correlationThreshold = 0.8;
    let maxCorrelation = 0;
    
    const halfLength = Math.floor(this.audioData.length / 2);
    for (let delay = 50; delay < 200; delay += 10) {
      if (delay >= halfLength) break;
      
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < halfLength - delay; i++) {
        correlation += this.audioData[i] * this.audioData[i + delay];
        count++;
      }
      
      correlation /= count;
      maxCorrelation = Math.max(maxCorrelation, correlation);
    }
    
    return maxCorrelation > correlationThreshold;
  }

  /**
   * Background music detection
   */
  private detectBackgroundMusic(): boolean {
    if (!this.audioData) return false;
    
    // Music typically has strong harmonic content
    let harmonicStrength = 0;
    const fundamentalBins = Math.floor(this.audioData.length * 0.1);
    
    for (let i = 1; i < 5; i++) { // Check first 4 harmonics
      const harmonicBin = fundamentalBins * i;
      if (harmonicBin < this.audioData.length) {
        harmonicStrength += this.audioData[harmonicBin];
      }
    }
    
    return harmonicStrength > -60; // dB threshold for music detection
  }

  /**
   * Start Voice Activity Detection calibration
   */
  private startVADCalibration(): void {
    this.isCalibrating = true;
    this.calibrationStartTime = Date.now();
    
    console.log('🔧 Starting VAD calibration (5 seconds of silence recommended)...');
    
    setTimeout(() => {
      this.finishVADCalibration();
    }, 5000); // 5 seconds calibration
  }

  /**
   * Finish VAD calibration and calculate optimal threshold
   */
  private finishVADCalibration(): void {
    this.isCalibrating = false;
    
    if (this.backgroundNoiseSamples.length > 0) {
      // Calculate background noise level
      const avgNoise = this.backgroundNoiseSamples.reduce((a, b) => a + b, 0) / this.backgroundNoiseSamples.length;
      const noiseStdDev = Math.sqrt(
        this.backgroundNoiseSamples.reduce((sum, val) => sum + Math.pow(val - avgNoise, 2), 0) / this.backgroundNoiseSamples.length
      );
      
      // Set VAD threshold to 3 standard deviations above noise floor
      this.vadThreshold = avgNoise + (3 * noiseStdDev);
      
      console.log(`✅ VAD calibration complete. Threshold: ${this.vadThreshold.toFixed(3)}`);
      this.emit('vad-calibrated', { threshold: this.vadThreshold });
    }
  }

  /**
   * Process speech level from audio worklet
   */
  private processSpeechLevel(level: number): void {
    if (this.isCalibrating) {
      // Collect background noise samples during calibration
      this.backgroundNoiseSamples.push(level);
      return;
    }

    // Voice activity detection
    const isVoiceActive = level > this.vadThreshold;
    const confidence = Math.min(1, level / this.vadThreshold);
    
    const vadEvent: VoiceActivityEvent = {
      isActive: isVoiceActive,
      confidence,
      timestamp: Date.now()
    };
    
    this.emit('voice-activity', vadEvent);
    
    // Collect speech samples for learning
    if (isVoiceActive) {
      this.speechSamples.push(level);
      // Keep only recent samples
      if (this.speechSamples.length > 1000) {
        this.speechSamples = this.speechSamples.slice(-1000);
      }
    }
  }

  /**
   * Apply advanced noise suppression
   */
  async applyAdvancedNoiseSuppression(enable: boolean): Promise<void> {
    if (!this.mlModelsLoaded || !this.noiseSuppressionModel) {
      console.warn('⚠️ Advanced noise suppression model not available');
      return;
    }

    // In a real implementation, this would apply ML-based noise suppression
    console.log(`${enable ? '✅' : '❌'} Advanced noise suppression ${enable ? 'enabled' : 'disabled'}`);
    this.emit('noise-suppression-changed', { enabled: enable });
  }

  /**
   * Apply speech enhancement
   */
  async applySpeechEnhancement(enable: boolean): Promise<void> {
    if (!this.mlModelsLoaded || !this.speechEnhancementModel) {
      console.warn('⚠️ Speech enhancement model not available');
      return;
    }

    // In a real implementation, this would apply ML-based speech enhancement
    console.log(`${enable ? '✅' : '❌'} Speech enhancement ${enable ? 'enabled' : 'disabled'}`);
    this.emit('speech-enhancement-changed', { enabled: enable });
  }

  /**
   * Adjust input gain
   */
  setInputGain(gain: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(3, gain)); // Limit to 0-3x gain
      this.emit('input-gain-changed', { gain });
    }
  }

  /**
   * Update processing configuration
   */
  updateConfig(newConfig: Partial<AudioProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { config: this.config });
  }

  /**
   * Get current audio processing configuration
   */
  getConfig(): AudioProcessingConfig {
    return { ...this.config };
  }

  /**
   * Get current VAD threshold
   */
  getVADThreshold(): number {
    return this.vadThreshold;
  }

  /**
   * Stop audio processing
   */
  stopProcessing(): void {
    if (!this.isProcessing) return;

    this.isProcessing = false;

    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Disconnect audio graph
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.destinationNode) {
      this.destinationNode = null;
    }

    console.log('⏹️ Audio processing stopped');
    this.emit('processing-stopped');
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stopProcessing();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear sample arrays
    this.speechSamples = [];
    this.backgroundNoiseSamples = [];

    this.removeAllListeners();
    console.log('🧹 Audio processing cleanup completed');
  }

  /**
   * Check if audio processing is active
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Get real-time processing statistics
   */
  getProcessingStats(): {
    isProcessing: boolean;
    isCalibrated: boolean;
    vadThreshold: number;
    speechSamples: number;
    backgroundSamples: number;
    mlModelsLoaded: boolean;
  } {
    return {
      isProcessing: this.isProcessing,
      isCalibrated: !this.isCalibrating,
      vadThreshold: this.vadThreshold,
      speechSamples: this.speechSamples.length,
      backgroundSamples: this.backgroundNoiseSamples.length,
      mlModelsLoaded: this.mlModelsLoaded
    };
  }
}