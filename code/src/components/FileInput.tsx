import React from 'react';

interface Props {
  onFileSelected: (file: File | null) => void;
}

const FileInput: React.FC<Props> = ({ onFileSelected }) => (
  <div style={{ marginTop: '1rem' }}>
    <input 
      type="file" 
      accept="video/webm"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && !file.type.startsWith('video/webm')) {
          alert('Please select a WebM video file');
          return;
        }
        onFileSelected(file || null);
      }} 
    />
    <p style={{ fontSize: '0.8em', color: '#666' }}>
      Please select a WebM video file
    </p>
  </div>
);

export default FileInput;
