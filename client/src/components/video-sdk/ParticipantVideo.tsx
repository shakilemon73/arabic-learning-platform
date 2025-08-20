/**
 * ParticipantVideo - Individual participant video display component
 * Handles remote video streams for Zoom-like multi-participant display
 */

import React, { useEffect, useRef } from 'react';
import { ParticipantInfo } from '@/lib/video-sdk/core/VideoSDK';

interface ParticipantVideoProps {
  stream: MediaStream;
  participant: ParticipantInfo;
}

export function ParticipantVideo({ stream, participant }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('📹 Setting up video stream for participant:', participant.name);
      videoRef.current.srcObject = stream;
      
      // Ensure video plays automatically
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(err => {
          console.warn('Auto-play failed for participant video:', err);
        });
      };
    }

    // Cleanup when component unmounts
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream, participant.name]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
        data-testid={`participant-video-${participant.id}`}
      />
      
      {/* Connection quality indicator */}
      <div className="absolute top-2 left-2">
        <div className={`w-2 h-2 rounded-full ${
          participant.connectionQuality === 'excellent' ? 'bg-green-500' :
          participant.connectionQuality === 'good' ? 'bg-yellow-500' :
          participant.connectionQuality === 'poor' ? 'bg-orange-500' : 'bg-red-500'
        }`}></div>
      </div>
      
      {/* Audio indicator */}
      <div className="absolute bottom-2 right-2">
        {participant.audioEnabled && (
          <div className="bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}