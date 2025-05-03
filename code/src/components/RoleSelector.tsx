import React from 'react';

interface Props {
  role: 'sender' | 'receiver';
  onChange: (role: 'sender' | 'receiver') => void;
}

const RoleSelector: React.FC<Props> = ({ role, onChange }) => (
  <div>
    <label>
      <input type="radio" name="role" value="sender" checked={role === 'sender'} onChange={() => onChange('sender')} />
      Sender
    </label>
    <label style={{ marginLeft: '1rem' }}>
      <input type="radio" name="role" value="receiver" checked={role === 'receiver'} onChange={() => onChange('receiver')} />
      Receiver
    </label>
  </div>
);

export default RoleSelector;
