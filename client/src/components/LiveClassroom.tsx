import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Youtube,
  Share2,
  Settings,
  Hand,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { io, type Socket } from 'socket.io-client';
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

export default function LiveClassroom({ 
  sessionId, 
  isInstructor, 
  classTitle, 
  userId 
}: LiveClassroomProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [hasHandRaised, setHasHandRaised] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isHomeworkDialogOpen, setIsHomeworkDialogOpen] = useState(false);
  const [classStatus, setClassStatus] = useState<'waiting' | 'live' | 'ended'>('waiting');

  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Socket connection setup
  useEffect(() => {
    const newSocket = io('/', { path: '/ws' });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-session', { sessionId, userId });
      toast({
        title: "সংযুক্ত হয়েছে",
        description: "লাইভ ক্লাসে সফলভাবে যোগ দিয়েছেন",
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      toast({
        title: "সংযোগ বিচ্ছিন্ন",
        description: "লাইভ ক্লাস থেকে সংযোগ বিচ্ছিন্ন হয়েছে",
        variant: "destructive",
      });
    });

    newSocket.on('participants-updated', (updatedParticipants: Participant[]) => {
      setParticipants(updatedParticipants);
    });

    newSocket.on('new-message', (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('recording-started', () => {
      setIsRecording(true);
      setClassStatus('live');
    });

    newSocket.on('recording-stopped', ({ youtubeUrl }: { youtubeUrl?: string }) => {
      setIsRecording(false);
      if (youtubeUrl) {
        toast({
          title: "রেকর্ডিং YouTube এ আপলোড হয়েছে",
          description: "ক্লাসের রেকর্ডিং স্বয়ংক্রিয়ভাবে YouTube এ আপলোড করা হয়েছে",
        });
      }
    });

    newSocket.on('screen-share-started', () => {
      setIsScreenSharing(true);
    });

    newSocket.on('screen-share-stopped', () => {
      setIsScreenSharing(false);
    });

    newSocket.on('class-ended', () => {
      setClassStatus('ended');
    });

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      newSocket.disconnect();
    };
  }, [sessionId, userId]);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
      setIsMicOn(true);
      
      socket?.emit('camera-started', { sessionId, userId });
    } catch (error) {
      toast({
        title: "ক্যামেরা চালু করতে ব্যর্থ",
        description: "ক্যামেরা অ্যাক্সেস করার অনুমতি প্রয়োজন",
        variant: "destructive",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
    socket?.emit('camera-stopped', { sessionId, userId });
  };

  // Start screen sharing
  const startScreenShare = async () => {
    if (!isInstructor) {
      toast({
        title: "অনুমতি নেই",
        description: "শুধুমাত্র শিক্ষক স্ক্রিন শেয়ার করতে পারেন",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      });
      
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }

      setIsScreenSharing(true);
      socket?.emit('screen-share-started', { sessionId, userId });

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });

      toast({
        title: "স্ক্রিন শেয়ার শুরু",
        description: "আপনার স্ক্রিন এখন সবার সাথে শেয়ার হচ্ছে",
      });
    } catch (error) {
      toast({
        title: "স্ক্রিন শেয়ার ব্যর্থ",
        description: "স্ক্রিন শেয়ার করার অনুমতি প্রয়োজন",
        variant: "destructive",
      });
    }
  };

  // Stop screen sharing
  const stopScreenShare = () => {
    if (screenShareRef.current?.srcObject) {
      const stream = screenShareRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      screenShareRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    socket?.emit('screen-share-stopped', { sessionId, userId });
  };

  // Start recording
  const startRecording = async () => {
    if (!isInstructor) {
      toast({
        title: "অনুমতি নেই",
        description: "শুধুমাত্র শিক্ষক রেকর্ডিং শুরু করতে পারেন",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunks.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        uploadRecordingToYouTube();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setClassStatus('live');

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      socket?.emit('recording-started', { sessionId });

      toast({
        title: "রেকর্ডিং শুরু",
        description: "ক্লাসের রেকর্ডিং শুরু হয়েছে",
      });
    } catch (error) {
      toast({
        title: "রেকর্ডিং ব্যর্থ",
        description: "রেকর্ডিং শুরু করতে ব্যর্থ হয়েছে",
        variant: "destructive",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      socket?.emit('recording-stopped', { sessionId });
    }
  };

  // Upload to YouTube (simplified - would need actual YouTube API integration)
  const uploadRecordingToYouTube = async () => {
    try {
      const recordedBlob = new Blob(recordedChunks.current, { 
        type: 'video/webm' 
      });

      const formData = new FormData();
      formData.append('video', recordedBlob, `class-${sessionId}-${Date.now()}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('title', classTitle);

      const response = await fetch('/api/upload-to-youtube', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "YouTube আপলোড সফল",
          description: `ভিডিও লিঙ্ক: ${result.youtubeUrl}`,
        });
        socket?.emit('recording-uploaded', { 
          sessionId, 
          youtubeUrl: result.youtubeUrl 
        });
      }
    } catch (error) {
      toast({
        title: "YouTube আপলোড ব্যর্থ",
        description: "ভিডিও আপলোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    }
  };

  // Raise/lower hand
  const toggleHand = () => {
    setHasHandRaised(!hasHandRaised);
    socket?.emit('hand-toggled', { sessionId, userId, raised: !hasHandRaised });
  };

  // End class (instructor only)
  const endClass = () => {
    if (isInstructor) {
      if (isRecording) {
        stopRecording();
      }
      if (isScreenSharing) {
        stopScreenShare();
      }
      socket?.emit('class-ended', { sessionId });
      setClassStatus('ended');
    }
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <Badge 
                  variant={classStatus === 'live' ? 'destructive' : 'secondary'}
                  className="live-indicator"
                >
                  {classStatus === 'live' ? 'LIVE' : classStatus === 'waiting' ? 'অপেক্ষমাণ' : 'সমাপ্ত'}
                </Badge>
              </div>
              <h1 className="text-headline font-bengali">{classTitle}</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{participants.length}</span>
              </Badge>
              {isRecording && (
                <Badge variant="destructive" className="animate-pulse">
                  <Circle className="w-3 h-3 mr-1 fill-current" />
                  REC {formatDuration(recordingDuration)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-3">
            <Card className="bento-card h-[600px] relative overflow-hidden">
              <CardContent className="p-0 h-full">
                {isScreenSharing ? (
                  <video
                    ref={screenShareRef}
                    autoPlay
                    muted
                    className="w-full h-full object-contain bg-black"
                    data-testid="screen-share-video"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-islamic-green/10 to-sage-green/10">
                    <div className="text-center animate-fade-in-up">
                      <div className="w-24 h-24 bg-islamic-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Video className="w-12 h-12 text-islamic-green" />
                      </div>
                      <h3 className="text-subtitle font-bengali mb-2">
                        {isInstructor ? 'স্ক্রিন শেয়ার শুরু করুন' : 'শিক্ষকের স্ক্রিন শেয়ারের জন্য অপেক্ষা করুন'}
                      </h3>
                      <p className="text-muted-foreground font-bengali">
                        {isInstructor ? 'নিচের বাটন ব্যবহার করে স্ক্রিন শেয়ার করুন' : 'শিক্ষক শীঘ্রই পাঠ শুরু করবেন'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Instructor Camera Overlay */}
                {isCameraOn && (
                  <div className="absolute bottom-4 right-4 w-48 h-36">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover rounded-lg border-2 border-white shadow-lg"
                      data-testid="instructor-camera"
                    />
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full p-2">
                    <Button
                      size="sm"
                      variant={isCameraOn ? "default" : "secondary"}
                      onClick={isCameraOn ? stopCamera : startCamera}
                      className="btn-kinetic"
                      data-testid="camera-toggle"
                    >
                      {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant={isMicOn ? "default" : "secondary"}
                      onClick={() => setIsMicOn(!isMicOn)}
                      className="btn-kinetic"
                      data-testid="mic-toggle"
                    >
                      {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>

                    <Button
                      size="sm"
                      variant={isSpeakerOn ? "default" : "secondary"}
                      onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                      className="btn-kinetic"
                      data-testid="speaker-toggle"
                    >
                      {isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>

                    {isInstructor && (
                      <>
                        <Button
                          size="sm"
                          variant={isScreenSharing ? "destructive" : "default"}
                          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                          className="btn-kinetic"
                          data-testid="screen-share-toggle"
                        >
                          {isScreenSharing ? <MonitorStop className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
                        </Button>

                        <Button
                          size="sm"
                          variant={isRecording ? "destructive" : "default"}
                          onClick={isRecording ? stopRecording : startRecording}
                          className="btn-kinetic"
                          data-testid="recording-toggle"
                        >
                          {isRecording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </Button>
                      </>
                    )}

                    {!isInstructor && (
                      <Button
                        size="sm"
                        variant={hasHandRaised ? "destructive" : "secondary"}
                        onClick={toggleHand}
                        className="btn-kinetic"
                        data-testid="raise-hand"
                      >
                        <Hand className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="participants" data-testid="participants-tab">
                  <Users className="w-4 h-4 mr-1" />
                  অংশগ্রহণকারী
                </TabsTrigger>
                <TabsTrigger value="chat" data-testid="chat-tab">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  চ্যাট
                </TabsTrigger>
                <TabsTrigger value="homework" data-testid="homework-tab">
                  <FileText className="w-4 h-4 mr-1" />
                  হোমওয়ার্ক
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="mt-4">
                <ParticipantsList participants={participants} />
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <LiveChat 
                  messages={messages}
                  sessionId={sessionId}
                  userId={userId}
                  socket={socket}
                />
              </TabsContent>

              <TabsContent value="homework" className="mt-4">
                <div className="space-y-4">
                  <Button 
                    onClick={() => setIsHomeworkDialogOpen(true)}
                    className="w-full btn-kinetic"
                    data-testid="submit-homework"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    হোমওয়ার্ক জমা দিন
                  </Button>
                  
                  {isInstructor && (
                    <Button 
                      variant="outline"
                      className="w-full"
                      data-testid="view-submissions"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      জমা দেওয়া কাজ দেখুন
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Class Controls for Instructor */}
            {isInstructor && classStatus === 'live' && (
              <Card className="bento-card">
                <CardHeader>
                  <CardTitle className="font-bengali">ক্লাস নিয়ন্ত্রণ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={endClass}
                    data-testid="end-class"
                  >
                    ক্লাস সমাপ্ত করুন
                  </Button>
                  
                  <div className="text-sm text-muted-foreground font-bengali">
                    <p>রেকর্ডিং: {isRecording ? 'চালু' : 'বন্ধ'}</p>
                    <p>স্ক্রিন শেয়ার: {isScreenSharing ? 'চালু' : 'বন্ধ'}</p>
                    <p>অংশগ্রহণকারী: {participants.length} জন</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Homework Submission Dialog */}
      <Dialog open={isHomeworkDialogOpen} onOpenChange={setIsHomeworkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-bengali">হোমওয়ার্ক জমা দিন</DialogTitle>
          </DialogHeader>
          <HomeworkSubmission 
            sessionId={sessionId}
            userId={userId}
            onClose={() => setIsHomeworkDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}