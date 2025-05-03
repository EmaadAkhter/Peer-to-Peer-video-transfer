import {useRef, useState } from 'react';
import RoleSelector from './components/RoleSelector';
import FileInput from './components/FileInput';
import VideoPlayer from './components/VideoPlayer';
import useWebRTC from './hooks/useWebRTC';

export default function App() {
  const [role, setRole] = useState<'sender' | 'receiver'>('sender');
  const [file, setFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useWebRTC({ role, file, videoRef });

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>P2P Video Transfer </h2>
      <RoleSelector role={role} onChange={setRole} />
      {role === 'sender' && <FileInput onFileSelected={setFile} />}
      <VideoPlayer videoRef={videoRef} />
    </div>
  );
}
