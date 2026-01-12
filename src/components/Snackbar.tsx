import React, { useEffect } from 'react';

interface SnackbarProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

const Snackbar: React.FC<SnackbarProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 bg-surface-container-highest-80 text-on-surface px-4 py-2 rounded-xl shadow-lg z-50">
      {message}
    </div>
  );
};

export default Snackbar;
