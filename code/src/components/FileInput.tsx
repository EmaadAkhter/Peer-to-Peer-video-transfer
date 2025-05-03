import React from 'react';

interface Props {
  onFilesSelected: (files: FileList | null) => void;
}

const FileInput: React.FC<Props> = ({ onFilesSelected }) => (
  <div style={{ marginTop: '1rem' }}>
    <input
      type="file"
      accept="video/webm"
      multiple
      onChange={e => onFilesSelected(e.target.files)}
    />
    <p style={{ fontSize: '0.8em', color: '#666' }}>
      Please select one or more WebM video files
    </p>
  </div>
);

export default FileInput;
