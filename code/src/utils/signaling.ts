import { RefObject } from 'react';
import Hls from 'hls.js';

const CHUNK_SIZE = 64 * 1024;

interface SignalingOptions {
  role: 'sender' | 'receiver';
  file: File | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  send: (data: any) => void;
}

export function setupSignaling(socket: WebSocket, options: SignalingOptions) {
  const { role, file, videoRef, send } = options;
  let peerConnection: RTCPeerConnection | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let pendingCandidates: RTCIceCandidate[] = [];
  const receivedChunks: BlobPart[] = [];

  async function addPendingCandidates() {
    if (!peerConnection) return;
    while (pendingCandidates.length) {
      const candidate = pendingCandidates.shift();
      if (candidate) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (e) {
          console.error('Error adding pending ICE candidate:', e);
        }
      }
    }
  }

  socket.onmessage = async (msg: MessageEvent) => {
    let data;
    try {
      const text = msg.data instanceof Blob ? await msg.data.text() : msg.data;
      data = JSON.parse(text);
    } catch (e) {
      console.error('Invalid JSON:', msg.data);
      return;
    }

    const { type, offer, answer, candidate } = data;

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
    }
  };

  async function setupSender() {
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    dataChannel = peerConnection.createDataChannel('file');
    
    peerConnection.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'candidate', candidate: e.candidate });
    };

    dataChannel.onopen = sendChunks;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    send({ type: 'offer', offer });
  }

  function sendChunks() {
    if (!file || !dataChannel || dataChannel.readyState !== 'open') return;

    let offset = 0;
    const totalSize = file.size;
    const reader = new FileReader();

    const sendNext = () => {
      if (offset >= totalSize || dataChannel?.readyState !== 'open') {
        console.log('File transfer complete');
        dataChannel?.close();
        return;
      }

      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(chunk);
    };

    reader.onload = (e) => {
      const chunk = e.target?.result;
      if (chunk instanceof ArrayBuffer) {
        dataChannel?.send(chunk);
        offset += chunk.byteLength;
        console.log(`Sent ${offset}/${totalSize} bytes`);
        
        if (dataChannel?.bufferedAmount && dataChannel.bufferedAmount > 8 * 1024 * 1024) {
          dataChannel.onbufferedamountlow = () => {
            dataChannel!.onbufferedamountlow = null;
            sendNext();
          };
        } else {
          setTimeout(sendNext, 0);
        }
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
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
      let receivedSize = 0;
      
      receiveChannel.onmessage = (e) => {
        const data = e.data;
        receivedChunks.push(data);
        receivedSize += data.byteLength;
        
        // Log progress
        console.log(`Received ${receivedSize} bytes`);
      };

      receiveChannel.onclose = () => {
        try {
          console.log('Assembling video from chunks...');
          const completeBlob = new Blob(receivedChunks, { 
            type: 'video/webm' 
          });
          console.log(`Total video size: ${completeBlob.size} bytes`);

          const video = videoRef.current;
          if (video) {
            if (video.src) {
              URL.revokeObjectURL(video.src);
            }

            const url = URL.createObjectURL(completeBlob);
            video.src = url;
            
            // Reset video element
            video.currentTime = 0;
            video.load();

            video.onloadedmetadata = () => {
              console.log('Video metadata loaded');
              video.play().catch(error => {
                console.error('Error playing video:', error);
              });
            };

            video.onerror = () => {
              console.error('Video load error:', video.error);
              // Try to recover by downloading
              const downloadUrl = URL.createObjectURL(completeBlob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = 'received-video.webm';
              a.click();
              URL.revokeObjectURL(downloadUrl);
            };
          }
        } catch (error) {
          console.error('Error setting up video playback:', error);
        }
      };

      receiveChannel.onerror = (error) => {
        console.error('Data channel error:', error);
      };
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    send({ type: 'answer', answer });
  }

  // Send ready signal if receiver
  if (role === 'receiver') {
    send({ type: 'ready' });
  }

  // Cleanup function
  return () => {
    dataChannel?.close();
    peerConnection?.close();
  };
}
