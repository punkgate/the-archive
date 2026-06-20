import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { createEntry } from '../services/entries';

export function NewEntryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    createEntry(user.id).then((res) => {
      if (res.success) {
        navigate(`/entries/${res.data.id}`, { replace: true });
      } else {
        navigate('/entries');
      }
    });
  }, [user]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="font-mono text-xs tracking-widest animate-pulse" style={{ color: 'var(--ghost)' }}>
        OPENING NEW ENTRY
      </span>
    </div>
  );
}
