import React from 'react';

interface FileMeta {
  name: string;
  size: number;
  type: string;
}

interface Props {
  files: FileMeta[];
  selected: string | null;
  onSelect: (name: string) => void;
}

const VideoSelector: React.FC<Props> = ({ files, selected, onSelect }) => (
  <div style={{ margin: '1rem 0' }}>
    <h4>Select a video to download and play:</h4>
    <ul>
      {files.map(f => (
        <li key={f.name}>
          <button
            disabled={selected === f.name}
            onClick={() => onSelect(f.name)}
            style={{
              margin: '0.25rem 0',
              background: selected === f.name ? '#ccc' : '#eee',
              cursor: selected === f.name ? 'not-allowed' : 'pointer'
            }}
          >
            {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
          </button>
        </li>
      ))}
    </ul>
  </div>
);

export default VideoSelector;