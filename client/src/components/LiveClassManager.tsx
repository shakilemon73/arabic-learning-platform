/**
 * Live Class Manager - Production Ready Multi-User Video Conferencing
 * Handles live classes with proper host/student roles and real-time functionality
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VideoConference } from '@/components/VideoConference';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Video, Users, Plus, Calendar, Clock, User, 
  Settings, Copy, CheckCircle, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LiveClass {
  id: string;
  title: string;
  description?: string;
  room_id: string;
  instructor_id: string;
  instructor_name: string;
  scheduled_at: string;
  duration: number;
  max_participants: number;
  is_active: boolean;
  participant_count: number;
  status: 'scheduled' | 'live' | 'ended';
}

interface LiveClassManagerProps {
  onJoinClass?: (roomId: string, userRole: 'host' | 'participant') => void;
}

export const LiveClassManager: React.FC<LiveClassManagerProps> = ({ onJoinClass }) => {
  const { user, profile } = useAuth();
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinedClassRoom, setJoinedClassRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create class form state
  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    maxParticipants: 50
  });

  const isInstructor = profile?.role === 'admin' || profile?.role === 'instructor';

  useEffect(() => {
    loadLiveClasses();
  }, []);

  const loadLiveClasses = async () => {
    try {
      setLoading(true);
      
      // Get live classes from Supabase
      const { data, error } = await supabase
        .from('live_classes')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error loading live classes:', error);
        return;
      }

      // Transform data and add participant counts
      const transformedClasses: LiveClass[] = await Promise.all(
        (data || []).map(async (cls) => {
          // Get participant count
          const { data: participants } = await supabase
            .from('video_conference_participants')
            .select('id')
            .eq('room_id', cls.meeting_url)
            .eq('is_active', true);

          const now = new Date();
          const scheduledTime = new Date(cls.scheduled_at);
          const endTime = new Date(scheduledTime.getTime() + cls.duration * 60000);

          let status: 'scheduled' | 'live' | 'ended' = 'scheduled';
          if (now >= scheduledTime && now <= endTime && cls.is_active) {
            status = 'live';
          } else if (now > endTime || !cls.is_active) {
            status = 'ended';
          }

          return {
            id: cls.id,
            title: cls.title,
            description: cls.description,
            room_id: cls.meeting_url || `class-${cls.id}`,
            instructor_id: cls.instructor_id || '',
            instructor_name: 'Instructor', // You might want to fetch actual instructor name
            scheduled_at: cls.scheduled_at,
            duration: cls.duration,
            max_participants: cls.max_participants,
            is_active: cls.is_active,
            participant_count: participants?.length || 0,
            status
          };
        })
      );

      setLiveClasses(transformedClasses);
    } catch (error) {
      console.error('Error loading live classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLiveClass = async () => {
    if (!user || !isInstructor) return;

    try {
      setCreating(true);
      
      const roomId = `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('live_classes')
        .insert([
          {
            title: newClass.title,
            description: newClass.description,
            instructor_id: user.id,
            scheduled_at: new Date(newClass.scheduledAt).toISOString(),
            duration: newClass.duration,
            max_participants: newClass.maxParticipants,
            meeting_url: roomId,
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reset form
      setNewClass({
        title: '',
        description: '',
        scheduledAt: '',
        duration: 60,
        maxParticipants: 50
      });
      setShowCreateForm(false);

      // Reload classes
      await loadLiveClasses();

      console.log('✅ Live class created successfully');
    } catch (error) {
      console.error('❌ Failed to create live class:', error);
      alert('Failed to create live class: ' + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const joinClass = (liveClass: LiveClass) => {
    const userRole = isInstructor && liveClass.instructor_id === user?.id ? 'host' : 'participant';
    setJoinedClassRoom(liveClass.room_id);
    
    if (onJoinClass) {
      onJoinClass(liveClass.room_id, userRole);
    }
  };

  const leaveClass = () => {
    setJoinedClassRoom(null);
  };

  const copyRoomLink = (roomId: string) => {
    const link = `${window.location.origin}/video-meet?room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert('Room link copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <Video className="h-4 w-4" />;
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'ended': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // If user joined a class, show video conference
  if (joinedClassRoom && user && profile) {
    const liveClass = liveClasses.find(c => c.room_id === joinedClassRoom);
    const userRole = isInstructor && liveClass?.instructor_id === user.id ? 'host' : 'participant';
    
    return (
      <VideoConference
        roomId={joinedClassRoom}
        userId={user.id}
        displayName={profile.first_name || user.email || 'User'}
        userRole={userRole}
        supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
        supabaseKey={import.meta.env.VITE_SUPABASE_ANON_KEY}
        onLeave={leaveClass}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
              <Video className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Live Classes
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Join live Arabic learning sessions with real-time video conferencing
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <Button onClick={loadLiveClasses} variant="outline" disabled={loading}>
                Refresh Classes
              </Button>
            </div>
            
            {isInstructor && (
              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Create Live Class
              </Button>
            )}
          </div>

          {/* Create Class Form */}
          {showCreateForm && isInstructor && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create New Live Class</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Class Title</Label>
                    <Input
                      id="title"
                      value={newClass.title}
                      onChange={(e) => setNewClass(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Arabic Grammar Basics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduledAt">Scheduled Time</Label>
                    <Input
                      id="scheduledAt"
                      type="datetime-local"
                      value={newClass.scheduledAt}
                      onChange={(e) => setNewClass(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={newClass.description}
                    onChange={(e) => setNewClass(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the class content"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newClass.duration}
                      onChange={(e) => setNewClass(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                      min="15"
                      max="180"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxParticipants">Max Participants</Label>
                    <Input
                      id="maxParticipants"
                      type="number"
                      value={newClass.maxParticipants}
                      onChange={(e) => setNewClass(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 50 }))}
                      min="5"
                      max="100"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    onClick={createLiveClass} 
                    disabled={creating || !newClass.title || !newClass.scheduledAt}
                  >
                    {creating ? 'Creating...' : 'Create Class'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Classes Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading live classes...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveClasses.map((liveClass) => (
                <Card key={liveClass.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{liveClass.title}</CardTitle>
                        <div className="flex items-center mt-2">
                          <Badge className={`${getStatusColor(liveClass.status)} text-white`}>
                            <span className="flex items-center">
                              {getStatusIcon(liveClass.status)}
                              <span className="ml-1 capitalize">{liveClass.status}</span>
                            </span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {liveClass.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {liveClass.description}
                      </p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(liveClass.scheduled_at).toLocaleString()}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {liveClass.duration} minutes
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-2" />
                      {liveClass.participant_count} / {liveClass.max_participants} participants
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <User className="h-4 w-4 mr-2" />
                      Instructor: {liveClass.instructor_name}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      {liveClass.status === 'live' || liveClass.status === 'scheduled' ? (
                        <Button 
                          onClick={() => joinClass(liveClass)}
                          className="flex-1"
                          variant={liveClass.status === 'live' ? 'default' : 'outline'}
                        >
                          <Video className="h-4 w-4 mr-2" />
                          {liveClass.status === 'live' ? 'Join Live Class' : 'Join When Live'}
                        </Button>
                      ) : (
                        <Button variant="secondary" className="flex-1" disabled>
                          Class Ended
                        </Button>
                      )}
                      
                      {isInstructor && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyRoomLink(liveClass.room_id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {liveClasses.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Live Classes Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {isInstructor 
                      ? 'Create your first live class to get started.'
                      : 'Check back later for upcoming live classes.'
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};