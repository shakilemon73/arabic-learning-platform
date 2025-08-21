/**
 * Video Room Join Page - Let users create or join existing rooms
 */

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Users, Plus, LogIn } from 'lucide-react';
import Header from '@/components/Header';

export default function VideoRoomJoinPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [roomCode, setRoomCode] = useState('');
  const [customRoomName, setCustomRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const joinRoom = (roomId: string) => {
    if (!roomId.trim()) {
      alert('Please enter a room code');
      return;
    }
    navigate(`/enterprise-meet?room=${encodeURIComponent(roomId.trim())}`);
  };

  const createRoom = () => {
    const roomName = customRoomName.trim() || `room-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    navigate(`/enterprise-meet?room=${encodeURIComponent(roomName)}`);
  };

  const joinQuickRoom = () => {
    navigate('/enterprise-meet?room=arabic-learning-room');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to join video meetings</h1>
          <Button onClick={() => navigate('/login')}>
            <LogIn className="w-4 h-4 mr-2" />
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Video Conference Rooms</h1>
          <p className="text-slate-400 text-lg">
            Create a new room or join an existing one to start your video meeting
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          
          {/* Quick Join - Default Room */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <CardTitle>Join Main Room</CardTitle>
              <p className="text-slate-400 text-sm">
                Join the main Arabic learning video room
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={joinQuickRoom}
                className="w-full"
                size="lg"
              >
                <Video className="w-4 h-4 mr-2" />
                Join Now
              </Button>
            </CardContent>
          </Card>

          {/* Join Existing Room */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8" />
              </div>
              <CardTitle>Join Existing Room</CardTitle>
              <p className="text-slate-400 text-sm">
                Enter a room code to join an existing meeting
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Enter room code..."
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <Button 
                onClick={() => joinRoom(roomCode)}
                className="w-full"
                size="lg"
                disabled={!roomCode.trim()}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Join Room
              </Button>
            </CardContent>
          </Card>

          {/* Create New Room */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8" />
              </div>
              <CardTitle>Create New Room</CardTitle>
              <p className="text-slate-400 text-sm">
                Start a new video meeting room
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customRoomName">Room Name (Optional)</Label>
                <Input
                  id="customRoomName"
                  value={customRoomName}
                  onChange={(e) => setCustomRoomName(e.target.value)}
                  placeholder="My Arabic Class..."
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <Button 
                onClick={createRoom}
                className="w-full"
                size="lg"
                disabled={isCreating}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? 'Creating...' : 'Create Room'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <div className="mt-12 max-w-2xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-center">How to Share Rooms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-300">
              <p>1. <strong>Create or join a room</strong> using the options above</p>
              <p>2. <strong>Copy the room URL</strong> by clicking "Share Room" in the meeting</p>
              <p>3. <strong>Send the link</strong> to others you want to join</p>
              <p>4. <strong>Multiple users</strong> can join the same room for group video calls</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}