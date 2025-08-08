/**
 * Live Class Demo - Showcase the WorldClass Video SDK
 * Full-featured video conferencing demo for Arabic learning
 */

import React, { useState, useEffect } from 'react';
import { VideoSDKProvider, useVideoSDK } from '@/components/video-sdk/VideoSDKProvider';
import { VideoConference } from '@/components/video-sdk/VideoConference';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Video, 
  Users, 
  MessageSquare, 
  Settings, 
  Monitor, 
  Mic,
  Camera,
  Globe,
  BookOpen,
  Star,
  Clock,
  Zap
} from 'lucide-react';

// Demo Configuration
const DEMO_SDK_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key',
  enableAI: true,
  enableRecording: true,
  enableWhiteboard: true,
  maxParticipants: 1000,
  bitrate: {
    video: 2500,
    audio: 128
  }
};

export default function LiveClassDemo() {
  return (
    <VideoSDKProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <LiveClassDemoContent />
      </div>
    </VideoSDKProvider>
  );
}

function LiveClassDemoContent() {
  const {
    sdk,
    isInitialized,
    isConnected,
    participants,
    currentUser,
    initializeSDK,
    joinRoom,
    leaveRoom,
    error
  } = useVideoSDK();

  const [roomCode, setRoomCode] = useState('DEMO-ARABIC-001');
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState<'host' | 'moderator' | 'participant'>('participant');
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [activeTab, setActiveTab] = useState('join');

  // Initialize SDK on mount
  useEffect(() => {
    initializeSDKDemo();
  }, []);

  const initializeSDKDemo = async () => {
    try {
      await initializeSDK(DEMO_SDK_CONFIG);
    } catch (err) {
      console.error('Failed to initialize SDK:', err);
    }
  };

  const handleJoinRoom = async () => {
    if (!displayName.trim()) {
      alert('Please enter your display name');
      return;
    }

    setIsLoading(true);
    try {
      await joinRoom({
        roomId: roomCode,
        userId: `demo-user-${Date.now()}`, // In production, use actual user ID
        userRole,
        displayName: displayName.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`
      });
      setActiveTab('conference');
    } catch (err) {
      console.error('Failed to join room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      setActiveTab('join');
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-green-600 rounded-full mr-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              WorldClass Video SDK Demo
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience enterprise-grade video conferencing built specifically for Arabic learning. 
            Supporting 1000+ participants with advanced collaboration features.
          </p>
        </div>

        {/* SDK Status */}
        <div className="flex justify-center mb-8">
          <Badge variant={isInitialized ? "default" : "secondary"} className="px-4 py-2 text-lg">
            <Zap className="w-4 h-4 mr-2" />
            SDK Status: {isInitialized ? 'Ready' : 'Initializing...'}
          </Badge>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">1000+ Participants</h3>
              <p className="text-sm text-gray-600">Scalable WebRTC SFU architecture</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <MessageSquare className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Real-time Chat</h3>
              <p className="text-sm text-gray-600">Arabic text support with moderation</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Monitor className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Interactive Whiteboard</h3>
              <p className="text-sm text-gray-600">Perfect for Arabic writing practice</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Globe className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Global Streaming</h3>
              <p className="text-sm text-gray-600">Unlimited live streaming audience</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Interface */}
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="join">Join Room</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Join Arabic Learning Session
                  </CardTitle>
                  <CardDescription>
                    Enter the demo room to experience the full video conferencing capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      <strong>Error:</strong> {error}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="displayName">Your Name</Label>
                        <Input
                          id="displayName"
                          placeholder="Enter your display name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="roomCode">Room Code</Label>
                        <Input
                          id="roomCode"
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          className="mt-1 font-mono"
                        />
                      </div>

                      <div>
                        <Label htmlFor="role">Join as</Label>
                        <select
                          id="role"
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value as any)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="participant">Student (Participant)</option>
                          <option value="moderator">Teacher Assistant (Moderator)</option>
                          <option value="host">Teacher (Host)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">Demo Room Features:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• HD video up to 1080p</li>
                          <li>• Crystal clear audio</li>
                          <li>• Screen sharing</li>
                          <li>• Interactive whiteboard</li>
                          <li>• Real-time Arabic chat</li>
                          <li>• Session recording</li>
                          <li>• Moderator controls</li>
                        </ul>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">Perfect for Arabic Learning:</h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• Quran recitation sessions</li>
                          <li>• Arabic calligraphy practice</li>
                          <li>• Interactive Hadith study</li>
                          <li>• Grammar lessons</li>
                          <li>• Group discussions</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="text-center">
                    <Button
                      onClick={handleJoinRoom}
                      disabled={isLoading || !isInitialized || !displayName.trim()}
                      size="lg"
                      className="px-8"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Joining Room...
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4 mr-2" />
                          Join Arabic Learning Room
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Core Video Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        'Multi-participant video (1000+ users)',
                        'Adaptive streaming quality (360p to 4K)',
                        'Screen sharing with annotations',
                        'Picture-in-picture mode',
                        'Virtual backgrounds',
                        'Device switching (camera/mic)',
                        'Connection quality monitoring',
                        'Automatic reconnection'
                      ].map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Collaboration Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        'Interactive whiteboard with shapes',
                        'Real-time chat with Arabic support',
                        'File sharing (images, documents)',
                        'Emoji reactions and responses',
                        'Message search and history',
                        'Breakout rooms (coming soon)',
                        'Polls and quizzes (coming soon)',
                        'AI-powered transcription'
                      ].map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Star className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recording & Streaming</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        'Cloud-based session recording',
                        'Multiple quality formats',
                        'Live streaming to unlimited viewers',
                        'Automatic cloud storage',
                        'Recording highlights',
                        'Download and sharing options',
                        'Playback with timestamps',
                        'Search within recordings'
                      ].map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Star className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Moderator Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {[
                        'Mute/unmute participants',
                        'Remove disruptive users',
                        'Promote to moderator role',
                        'Spotlight main speaker',
                        'Control screen sharing permissions',
                        'Chat moderation and filtering',
                        'Waiting room management',
                        'Session analytics'
                      ].map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Star className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="docs" className="mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Start Integration</CardTitle>
                    <CardDescription>Add the SDK to your React application</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono">
                      <div className="text-green-400 mb-2">// Install the SDK</div>
                      <div className="mb-4">npm install @worldclass/video-sdk</div>
                      
                      <div className="text-green-400 mb-2">// Basic Usage</div>
                      <div className="whitespace-pre-wrap">{`import { VideoSDKProvider, VideoConference } from '@worldclass/video-sdk';

function App() {
  return (
    <VideoSDKProvider>
      <VideoConference />
    </VideoSDKProvider>
  );
}`}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Configuration</CardTitle>
                    <CardDescription>SDK configuration options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono">
                      <div className="whitespace-pre-wrap">{`const config = {
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  enableAI: true,
  enableRecording: true,
  enableWhiteboard: true,
  maxParticipants: 1000,
  bitrate: {
    video: 2500, // kbps
    audio: 128   // kbps
  }
};`}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Reference</CardTitle>
                    <CardDescription>Core SDK methods and events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Main Methods</h4>
                        <ul className="text-sm space-y-1 text-gray-600">
                          <li><code>sdk.joinRoom(sessionConfig)</code></li>
                          <li><code>sdk.leaveRoom()</code></li>
                          <li><code>sdk.toggleVideo(enabled?)</code></li>
                          <li><code>sdk.toggleAudio(enabled?)</code></li>
                          <li><code>sdk.startScreenShare()</code></li>
                          <li><code>sdk.sendChatMessage(message)</code></li>
                          <li><code>sdk.startRecording()</code></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Events</h4>
                        <ul className="text-sm space-y-1 text-gray-600">
                          <li><code>participant-joined</code></li>
                          <li><code>participant-left</code></li>
                          <li><code>chat-message-received</code></li>
                          <li><code>remote-stream-added</code></li>
                          <li><code>recording-started</code></li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Browser Support</CardTitle>
                    <CardDescription>Compatibility across platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold mb-2 text-green-600">✓ Fully Supported</h4>
                        <ul className="space-y-1 text-gray-600">
                          <li>Chrome 80+</li>
                          <li>Firefox 75+</li>
                          <li>Safari 13+</li>
                          <li>Edge 80+</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 text-blue-600">📱 Mobile</h4>
                        <ul className="space-y-1 text-gray-600">
                          <li>iOS Safari 13+</li>
                          <li>Chrome Mobile 80+</li>
                          <li>Samsung Internet</li>
                          <li>Firefox Mobile</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Conference View - Connected state
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-blue-600 rounded-lg mr-4">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Arabic Learning Session</h1>
            <p className="text-sm text-gray-600">Room: {roomCode}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            <Users className="w-4 h-4 mr-1" />
            {participants.length + 1} participants
          </Badge>
          <Badge variant="outline">
            <Clock className="w-4 h-4 mr-1" />
            Live
          </Badge>
          <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
        </div>
      </div>

      {/* Conference */}
      <div className="flex-1">
        <VideoConference
          showChat={showChat}
          onChatToggle={() => setShowChat(!showChat)}
        />
      </div>
    </div>
  );
}