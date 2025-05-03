
# Peer-to-Peer Video Transfer

The Peer-to-Peer Video Transfer project is a web-based application that enables users to share video files directly between browsers using WebRTC technology. It leverages WebSockets for signaling and WebRTC for peer-to-peer communication, facilitating efficient video transfers without relying on centralized servers.

## Features

- Direct Video Sharing: Users can send and receive video files directly between browsers, eliminating the need for server-side storage.

- Role Selection: Participants can choose to act as a sender or a receiver allowing flexibility in sharing and receiving videos.

- WebRTC Integration: Utilizes WebRTC for real-time, peer-to-peer communication, ensuring fast and secure transfers.

- WebSocket Signaling: Employs WebSockets to establish and manage connections between peers.
## Tech Stack

- Frontend: React with TypeScript

- Backend: Node.js with WebSocket for signaling

- Communication: WebRTC for peer-to-peer data transfer

- Styling: CSS
## Run Locally

Clone the project

```bash
  git clone https://github.com/EmaadAkhter/Peer-to-Peer-video-transfer.git
```

Go to the project directory

```bash
  cd Peer-to-Peer-video-transfer
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm run server
```

Locally host the webpage

```bash
  npm run dev
```

## Acknowledgements

 - [webrtc](https://webrtc.org/)
 - [react](https://react.dev/)


