// Production device management for video conferencing
export class DeviceManager {
  private static instance: DeviceManager;
  
  public static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }
  
  /**
   * Check if browser supports WebRTC and media devices
   */
  public checkBrowserSupport(): boolean {
    const hasGetUserMedia = !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
    
    const hasRTCPeerConnection = !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    );
    
    return hasGetUserMedia && hasRTCPeerConnection;
  }
  
  /**
   * Get available media devices
   */
  public async getAvailableDevices() {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error('Device enumeration not supported');
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      return {
        videoInputs: devices.filter(d => d.kind === 'videoinput'),
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        audioOutputs: devices.filter(d => d.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return {
        videoInputs: [],
        audioInputs: [],
        audioOutputs: []
      };
    }
  }
  
  /**
   * Test media device access without creating stream
   */
  public async testDeviceAccess(): Promise<{
    video: boolean;
    audio: boolean;
    error?: string;
  }> {
    try {
      const devices = await this.getAvailableDevices();
      
      return {
        video: devices.videoInputs.length > 0,
        audio: devices.audioInputs.length > 0
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        video: false,
        audio: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get optimized media constraints based on device capabilities
   */
  public async getOptimalConstraints(): Promise<MediaStreamConstraints[]> {
    const devices = await this.getAvailableDevices();
    const hasVideo = devices.videoInputs.length > 0;
    const hasAudio = devices.audioInputs.length > 0;
    
    const constraints: MediaStreamConstraints[] = [];
    
    if (hasVideo && hasAudio) {
      // High quality for devices with both
      constraints.push({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Medium quality fallback
      constraints.push({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true
      });
    }
    
    if (hasAudio) {
      // Audio only
      constraints.push({
        video: false,
        audio: true
      });
    }
    
    // Basic fallback
    constraints.push({
      video: hasVideo,
      audio: hasAudio
    });
    
    return constraints;
  }
  
  /**
   * Get detailed error message for media access failures
   */
  public getErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('notfound') || message.includes('devicesnotfound')) {
      return 'ক্যামেরা বা মাইক্রোফোন খুঁজে পাওয়া যায়নি। ডিভাইস সংযুক্ত আছে কিনা পরীক্ষা করুন।';
    }
    
    if (message.includes('notallowed') || message.includes('permissiondenied')) {
      return 'ক্যামেরা এবং মাইক্রোফোনের অনুমতি প্রয়োজন। ব্রাউজার সেটিংসে অনুমতি দিন।';
    }
    
    if (message.includes('notreadable') || message.includes('trackstart')) {
      return 'ডিভাইস ব্যবহারে সমস্যা। অন্য অ্যাপ্লিকেশন বন্ধ করুন এবং পুনরায় চেষ্টা করুন।';
    }
    
    if (message.includes('overconstrained')) {
      return 'ডিভাইসের ক্ষমতা সীমিত। কম রেজোলিউশনে চেষ্টা করা হচ্ছে।';
    }
    
    if (message.includes('abort')) {
      return 'মিডিয়া অ্যাক্সেস বাতিল হয়েছে। পুনরায় চেষ্টা করুন।';
    }
    
    return 'মিডিয়া ডিভাইস অ্যাক্সেসে সমস্যা। ব্রাউজার রিফ্রেশ করে পুনরায় চেষ্টা করুন।';
  }
}