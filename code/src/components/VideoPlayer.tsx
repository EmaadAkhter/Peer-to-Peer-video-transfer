import React, { useEffect } from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const VideoPlayer: React.FC<Props> = ({ videoRef }) => {
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.onerror = () => {
        const error = video.error;
        console.error('Video error:', {
          code: error?.code,
          message: error?.message,
          networkState: video.networkState,
          readyState: video.readyState,
          currentSrc: video.currentSrc
        });
      };
    }
  }, []);

  return (
    <div>
      <video 
        ref={videoRef} 
        controls 
        playsInline
        style={{ width: '100%', maxWidth: 640, marginTop: 20 }} 
      />
      <p style={{ fontSize: '0.8em', color: '#666', marginTop: 10 }}>
        If video doesn't play, it will be downloaded automatically
      </p>
    </div>
  );
};

export default VideoPlayer;

