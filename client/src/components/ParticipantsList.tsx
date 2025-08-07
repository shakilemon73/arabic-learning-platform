import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hand, Mic, MicOff, Video, VideoOff, Crown } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isInstructor: boolean;
  isActive: boolean;
  hasHandRaised: boolean;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  profileImage?: string;
}

interface ParticipantsListProps {
  participants: Participant[];
}

export default function ParticipantsList({ participants }: ParticipantsListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sortedParticipants = [...participants].sort((a, b) => {
    // Instructors first
    if (a.isInstructor && !b.isInstructor) return -1;
    if (!a.isInstructor && b.isInstructor) return 1;
    
    // Then by active status
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    
    // Then by hand raised
    if (a.hasHandRaised && !b.hasHandRaised) return -1;
    if (!a.hasHandRaised && b.hasHandRaised) return 1;
    
    // Finally alphabetically
    return a.name.localeCompare(b.name);
  });

  return (
    <Card className="bento-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between font-bengali">
          <span>অংশগ্রহণকারী</span>
          <Badge variant="secondary">{participants.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {sortedParticipants.length > 0 ? (
            <div className="space-y-1">
              {sortedParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 mx-3 rounded-lg transition-all duration-200 ${
                    participant.isActive
                      ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  } ${
                    participant.hasHandRaised
                      ? 'ring-2 ring-yellow-400 animate-pulse-glow'
                      : ''
                  }`}
                  data-testid={`participant-${participant.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage 
                        src={participant.profileImage} 
                        alt={participant.name}
                      />
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate font-bengali">
                          {participant.name}
                        </p>
                        {participant.isInstructor && (
                          <Crown className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 mt-1">
                        <Badge 
                          variant={participant.isInstructor ? "default" : "secondary"}
                          className="text-xs px-2 py-0"
                        >
                          {participant.isInstructor ? 'শিক্ষক' : 'ছাত্র/ছাত্রী'}
                        </Badge>
                        
                        {!participant.isActive && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            অফলাইন
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    {participant.hasHandRaised && (
                      <div className="animate-bounce">
                        <Hand className="w-4 h-4 text-yellow-600" />
                      </div>
                    )}
                    
                    {participant.isActive && (
                      <>
                        <div className={`w-4 h-4 ${
                          participant.isMicOn 
                            ? 'text-green-600' 
                            : 'text-gray-400'
                        }`}>
                          {participant.isMicOn ? (
                            <Mic className="w-4 h-4" />
                          ) : (
                            <MicOff className="w-4 h-4" />
                          )}
                        </div>
                        
                        <div className={`w-4 h-4 ${
                          participant.isCameraOn 
                            ? 'text-green-600' 
                            : 'text-gray-400'
                        }`}>
                          {participant.isCameraOn ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <VideoOff className="w-4 h-4" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-bengali">কোনো অংশগ্রহণকারী নেই</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}