import { RefObject } from 'react';

const CHUNK_SIZE = 64 * 1024;

interface FileMeta {
  name: string;
  size: number;
  type: string;
}

interface SignalingOptions {
  role: 'sender' | 'receiver';
  files?: FileList | null; // Sender: all files
  selectedVideo?: string | null; // Receiver: selected file name
  setAvailableFiles?: (files: FileMeta[]) => void; // Receiver: update file list
  videoRef: RefObject<HTMLVideoElement | null>;
  send: (data: any) => void;
}

export function setupSignaling(socket: WebSocket, options: SignalingOptions) {
  const { role, files, selectedVideo, setAvailableFiles, videoRef, send } = options;
  let peerConnection: RTCPeerConnection | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let pendingCandidates: RTCIceCandidate[] = [];
  let receivedChunks: BlobPart[] = [];
  let pendingFileToSend: File | null = null;

  socket.onmessage = async (msg: MessageEvent) => {
    let data;
    try {
      data = JSON.parse(msg.data);
    } catch {
      return;
    }
    const { type, offer, answer, candidate, files: fileList, name } = data;

    if (type === 'ready' && role === 'sender') {
      await setupSender();
    } else if (type === 'offer' && role === 'receiver') {
      await setupReceiver(offer);
      await addPendingCandidates();
    } else if (type === 'answer' && role === 'sender') {
      await peerConnection?.setRemoteDescription(new RTCSessionDescription(answer));
      await addPendingCandidates();
    } else if (type === 'candidate') {
      const iceCandidate = new RTCIceCandidate(candidate);
      if (peerConnection?.remoteDescription) {
        await peerConnection.addIceCandidate(iceCandidate);
      } else {
        pendingCandidates.push(iceCandidate);
      }
    } else if (type === 'file-list' && role === 'receiver' && setAvailableFiles) {
      setAvailableFiles(fileList);
    } else if (type === 'file-request' && role === 'sender') {
      const file = files && Array.from(files).find(f => f.name === name);
      if (file) {
        if (dataChannel && dataChannel.readyState === 'open') {
          sendFileOverDataChannel(file);
        } else {
          pendingFileToSend = file;
        }
      }
    }
  };

  async function addPendingCandidates() {
    if (!peerConnection) return;
    while (pendingCandidates.length) {
      const candidate = pendingCandidates.shift();
      if (candidate) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      }
    }
  }

  async function setupSender() {
    peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    dataChannel = peerConnection.createDataChannel('file');
    peerConnection.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'candidate', candidate: e.candidate });
    };

    dataChannel.onopen = () => {
      // Send file list metadata
      if (files) {
        const fileList = Array.from(files).map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }));
        send({ type: 'file-list', files: fileList });
      }
      // If a file was requested before the channel opened, send it now
      if (pendingFileToSend) {
        sendFileOverDataChannel(pendingFileToSend);
        pendingFileToSend = null;
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    send({ type: 'offer', offer });
  }

  function sendFileOverDataChannel(file: File) {
    if (!dataChannel || dataChannel.readyState !== 'open') return;
    console.log('Sending file:', file.name, 'size:', file.size);
    if (file.size === 0) {
      alert('Selected file is empty!');
      return;
    }
    let offset = 0;
    const reader = new FileReader();

    const sendNext = () => {
      if (offset >= file.size) {
        dataChannel?.close();
        return;
      }
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(chunk);
    };

    reader.onload = (e) => {
      const chunk = e.target?.result as ArrayBuffer;
      if (chunk) {
        console.log('Sending chunk of size:', chunk.byteLength);
        dataChannel?.send(chunk);
        offset += chunk.byteLength;
        sendNext();
      }
    };

    reader.onerror = () => {
      dataChannel?.close();
    };

    sendNext();
  }

  async function setupReceiver(offer: RTCSessionDescriptionInit) {
    peerConnection = new RTCPeerConnection();
    peerConnection.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'candidate', candidate: e.candidate });
    };

    peerConnection.ondatachannel = (event) => {
      const receiveChannel = event.channel;
      receivedChunks = [];
      receiveChannel.onmessage = (e) => {
        if (e.data instanceof ArrayBuffer) {
          console.log('Received chunk of size:', e.data.byteLength);
          receivedChunks.push(e.data);
        } else if (e.data instanceof Blob) {
          e.data.arrayBuffer().then(buf => receivedChunks.push(buf));
        }
      };
      receiveChannel.onclose = () => {
        const blob = new Blob(receivedChunks, { type: 'video/webm' });
        console.log('Received blob size:', blob.size);
        const video = videoRef.current;
        if (video) {
          if (video.src) URL.revokeObjectURL(video.src);
          video.src = URL.createObjectURL(blob);
          video.onloadedmetadata = () => video.play().catch(console.error);
        }
      };
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    send({ type: 'answer', answer });
  }

  // Initial signaling
  if (role === 'receiver') {
    send({ type: 'ready' });
  }
  // When receiver selects a file, request it
  if (role === 'receiver' && selectedVideo) {
    send({ type: 'file-request', name: selectedVideo });
  }

  // Cleanup
  return () => {
    dataChannel?.close();
    peerConnection?.close();
  };
}

