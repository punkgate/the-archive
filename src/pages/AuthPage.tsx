import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Both fields are required.');
      return;
    }

    if (mode === 'signin') {
      const err = await signIn(email, password);
      if (err) {
        setError(err);
      } else {
        navigate('/entries');
      }
    } else {
      const err = await signUp(email, password);
      if (err) {
        setError(err);
      } else {
        setSuccess('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--ink)' }}
    >
      <div className="grain-overlay" aria-hidden />
      <div className="film-leader" aria-hidden />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm px-8"
      >
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className="text-5xl font-display font-light mb-3"
            style={{ color: 'var(--paper)', letterSpacing: '0.06em' }}
          >
            The Archive
          </h1>
          <p
            className="font-mono text-xs tracking-widest uppercase"
            style={{ color: 'var(--ghost)' }}
          >
            A machine for accumulating observations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block font-mono text-2xs tracking-widest uppercase mb-2"
              style={{ color: 'var(--ghost)' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full px-4 py-3 bg-transparent border text-sm outline-none transition-colors duration-150"
              style={{
                borderColor: 'var(--border-2)',
                color: 'var(--paper)',
                fontFamily: 'var(--font-mono)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--amber)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-mono text-2xs tracking-widest uppercase mb-2"
              style={{ color: 'var(--ghost)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full px-4 py-3 bg-transparent border text-sm outline-none transition-colors duration-150"
              style={{
                borderColor: 'var(--border-2)',
                color: 'var(--paper)',
                fontFamily: 'var(--font-mono)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--amber)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}
            />
          </div>

          {/* Error / Success */}
          {error && (
            <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          {success && (
            <p className="font-mono text-xs" style={{ color: 'var(--parchment)' }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 border text-sm tracking-widest font-mono uppercase transition-colors duration-150 disabled:opacity-40"
            style={{
              borderColor: 'var(--amber)',
              color: 'var(--amber)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139,115,85,0.1)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {loading ? 'Working…' : mode === 'signin' ? 'Enter the Archive' : 'Create Account'}
          </button>
        </form>

        {/* Mode toggle */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setMode(m => m === 'signin' ? 'signup' : 'signin');
              setError(null);
              setSuccess(null);
            }}
            className="font-mono text-2xs tracking-wide transition-colors duration-150"
            style={{ color: 'var(--ghost)' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--parchment)')}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
          >
            {mode === 'signin'
              ? 'No account yet — create one'
              : 'Already have an account — sign in'}
          </button>
        </div>

        {/* Epigraph */}
        <div className="mt-16 text-center">
          <p
            className="font-display italic text-sm"
            style={{ color: 'var(--ghost)', lineHeight: '1.8' }}
          >
            "The archive is not a productivity tool.<br />
            It is a machine for accumulating observations<br />
            until they become literature."
          </p>
        </div>
      </motion.div>
    </div>
  );
}
