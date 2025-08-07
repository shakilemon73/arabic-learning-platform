import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MonitorUp, 
  MonitorStop,
  Circle,
  Square,
  Users,
  MessageSquare,
  Upload,
  FileText,
  Hand,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import HomeworkSubmission from '@/components/HomeworkSubmission';
import ParticipantsList from '@/components/ParticipantsList';
import LiveChat from '@/components/LiveChat';

interface LiveClassroomProps {
  sessionId: string;
  isInstructor: boolean;
  classTitle: string;
  userId: string;
}

interface Participant {
  id: string;
  name: string;
  isInstructor: boolean;
  isActive: boolean;
  hasHandRaised: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'system' | 'homework';
}

// Extend window to include JitsiMeetExternalAPI
declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function LiveClassroom({ 
  sessionId, 
  isInstructor, 
  classTitle, 
  userId 
}: LiveClassroomProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [hasHandRaised, setHasHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHomeworkDialog, setShowHomeworkDialog] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate unique room name for the class
  const roomName = `ArabicClass_${sessionId}_${Date.now()}`;
  
  // Mock user name (in real app, get from your user system)
  const userName = isInstructor ? 'উস্তাদ আহমেদ' : 'শিক্ষার্থী';

  useEffect(() => {
    // Initialize Jitsi Meet when component mounts
    if (jitsiContainerRef.current && window.JitsiMeetExternalAPI && !jitsiApi) {
      initializeJitsiMeet();
    }
    
    return () => {
      // Cleanup when component unmounts
      if (jitsiApi) {
        jitsiApi.dispose();
      }
    };
  }, []);

  const initializeJitsiMeet = () => {
    const domain = 'meet.jit.si';
    const options = {
      roomName: roomName,
      width: '100%',
      height: 600,
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: !isInstructor, // Instructors start with mic on
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableClosePage: false,
        prejoinPageEnabled: false,
        toolbarButtons: [
          'microphone', 
          'camera', 
          'closedcaptions', 
          'desktop', 
          'fullscreen',
          'fodeviceselection', 
          'hangup', 
          'profile', 
          'chat', 
          'recording',
          'livestreaming', 
          'etherpad', 
          'sharedvideo', 
          'settings', 
          'raisehand',
          'videoquality', 
          'filmstrip', 
          'invite', 
          'feedback', 
          'stats', 
          'shortcuts',
          'tileview', 
          'videobackgroundblur', 
          'download', 
          'help', 
          'mute-everyone'
        ],
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
      },
      interfaceConfigOverwrite: {
        BRAND_WATERMARK_LINK: '',
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#1a1a1a',
        TOOLBAR_ALWAYS_VISIBLE: true,
        LANG_DETECTION: false,
        DEFAULT_LANGUAGE: 'bn', // Bengali language support
      },
      userInfo: {
        displayName: userName,
        email: `${userId}@arabiclearning.com`
      }
    };

    try {
      const api = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiApi(api);
      
      // Event listeners for Jitsi Meet
      api.addEventListener('ready', () => {
        console.log('Jitsi Meet API ready');
        setIsConnected(true);
        toast({
          title: "ক্লাসে যোগ দিয়েছেন",
          description: "লাইভ ক্লাস শুরু হয়েছে",
        });
        
        // Set initial participant
        setParticipants([{
          id: userId,
          name: userName,
          isInstructor: isInstructor,
          isActive: true,
          hasHandRaised: false
        }]);
      });

      api.addEventListener('participantJoined', (participant: any) => {
        console.log('Participant joined:', participant);
        setParticipants(prev => [...prev, {
          id: participant.id,
          name: participant.displayName || 'অতিথি',
          isInstructor: false,
          isActive: true,
          hasHandRaised: false
        }]);
        
        toast({
          title: "নতুন অংশগ্রহণকারী",
          description: `${participant.displayName || 'অতিথি'} ক্লাসে যোগ দিয়েছেন`,
        });
      });

      api.addEventListener('participantLeft', (participant: any) => {
        console.log('Participant left:', participant);
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
        
        toast({
          title: "অংশগ্রহণকারী চলে গেছেন",
          description: `${participant.displayName || 'অতিথি'} ক্লাস ছেড়েছেন`,
        });
      });

      api.addEventListener('audioMuteStatusChanged', (data: any) => {
        setIsMicOn(!data.muted);
      });

      api.addEventListener('videoMuteStatusChanged', (data: any) => {
        setIsCameraOn(!data.muted);
      });

      api.addEventListener('screenSharingStatusChanged', (data: any) => {
        setIsScreenSharing(data.on);
      });

      api.addEventListener('recordingStatusChanged', (data: any) => {
        setIsRecording(data.on);
      });

      api.addEventListener('raiseHandUpdated', (data: any) => {
        setHasHandRaised(data.handRaised);
      });

    } catch (error) {
      console.error('Error initializing Jitsi Meet:', error);
      toast({
        title: "ক্লাসে যোগ দিতে সমস্যা",
        description: "পুনরায় চেষ্টা করুন",
        variant: "destructive",
      });
    }
  };

  const toggleCamera = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleVideo');
    }
  };

  const toggleMicrophone = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleAudio');
    }
  };

  const toggleScreenShare = () => {
    if (jitsiApi) {
      if (isScreenSharing) {
        jitsiApi.executeCommand('toggleShareScreen');
      } else {
        jitsiApi.executeCommand('toggleShareScreen');
      }
    }
  };

  const toggleRecording = () => {
    if (jitsiApi && isInstructor) {
      jitsiApi.executeCommand('toggleRecording');
    }
  };

  const raiseHand = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleRaiseHand');
    }
  };

  const leaveClass = () => {
    if (jitsiApi) {
      jitsiApi.dispose();
      setJitsiApi(null);
      setIsConnected(false);
      window.location.href = '/dashboard';
    }
  };

  const toggleFullscreen = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleFullScreen');
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green/10 via-white to-sage-green/5">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-islamic-green to-sage-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">আ</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{classTitle}</h1>
                <div className="flex items-center space-x-2">
                  <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                    {isConnected ? "✅ সংযুক্ত" : "⏳ যোগ দিচ্ছে..."}
                  </Badge>
                  {isRecording && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      <Circle className="w-2 h-2 mr-1 fill-current" />
                      রেকর্ডিং
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowParticipantsDialog(true)}
            >
              <Users className="w-4 h-4 mr-1" />
              {participants.length}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChatDialog(true)}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              চ্যাট
            </Button>
            
            {isInstructor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHomeworkDialog(true)}
              >
                <Upload className="w-4 h-4 mr-1" />
                হোমওয়ার্ক
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="sm"
              onClick={leaveClass}
            >
              <PhoneOff className="w-4 h-4 mr-1" />
              ছেড়ে দিন
            </Button>
          </div>
        </div>
      </div>

      {/* Main Video Container */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-0">
              {/* Jitsi Meet Video Container */}
              <div 
                ref={jitsiContainerRef} 
                className="w-full bg-gray-900 rounded-t-lg overflow-hidden"
                style={{ minHeight: '600px' }}
              />
              
              {/* Custom Controls */}
              <div className="bg-gray-50 p-4 rounded-b-lg">
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant={isMicOn ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleMicrophone}
                    className={isMicOn ? "bg-islamic-green hover:bg-islamic-green/90" : ""}
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant={isCameraOn ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleCamera}
                    className={isCameraOn ? "bg-islamic-green hover:bg-islamic-green/90" : ""}
                  >
                    {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant={isScreenSharing ? "default" : "outline"}
                    size="sm"
                    onClick={toggleScreenShare}
                  >
                    {isScreenSharing ? <MonitorStop className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                  </Button>
                  
                  {isInstructor && (
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="sm"
                      onClick={toggleRecording}
                    >
                      {isRecording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </Button>
                  )}
                  
                  <Button
                    variant={hasHandRaised ? "default" : "outline"}
                    size="sm"
                    onClick={raiseHand}
                    className={hasHandRaised ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                  >
                    <Hand className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Class Information */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  ক্লাসের তথ্য
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">শিক্ষক: {isInstructor ? userName : 'উস্তাদ আহমেদ'}</p>
                <p className="text-sm">অংশগ্রহণকারী: {participants.length} জন</p>
                <p className="text-sm">সময়: {new Date().toLocaleTimeString('bn-BD')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">ক্লাসের নিয়মাবলী</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-gray-600">
                <p>• প্রশ্ন করার আগে হাত তুলুন</p>
                <p>• মাইক বন্ধ রাখুন যখন কথা বলছেন না</p>
                <p>• চ্যাটে শুধু ক্লাস সংক্রান্ত আলোচনা করুন</p>
                <p>• সবার প্রতি সম্মান প্রদর্শন করুন</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">আজকের পাঠ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-gray-600">
                <p>• আরবি বর্ণমালা পরিচয়</p>
                <p>• উচ্চারণ অনুশীলন</p>
                <p>• সাধারণ শব্দভাণ্ডার</p>
                <p>• দোয়া ও তসবিহ</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={showParticipantsDialog} onOpenChange={setShowParticipantsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>অংশগ্রহণকারী ({participants.length})</DialogTitle>
          </DialogHeader>
          <ParticipantsList participants={participants} />
        </DialogContent>
      </Dialog>

      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>লাইভ চ্যাট</DialogTitle>
          </DialogHeader>
          <LiveChat 
            messages={messages} 
            onSendMessage={(message) => {
              const newMessage: ChatMessage = {
                id: Date.now().toString(),
                userId: userId,
                userName: userName,
                message: message,
                timestamp: new Date(),
                type: 'message'
              };
              setMessages(prev => [...prev, newMessage]);
            }}
          />
        </DialogContent>
      </Dialog>

      {isInstructor && (
        <Dialog open={showHomeworkDialog} onOpenChange={setShowHomeworkDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>হোমওয়ার্ক ব্যবস্থাপনা</DialogTitle>
            </DialogHeader>
            <HomeworkSubmission sessionId={sessionId} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}