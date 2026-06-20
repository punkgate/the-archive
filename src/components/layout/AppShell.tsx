import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores';

interface AppShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/entries', label: 'Archive', sublabel: 'All entries' },
  { to: '/entities', label: 'Index', sublabel: 'Themes · Characters · Places' },
  { to: '/search',   label: 'Search', sublabel: 'Full-text search' },
];

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNewEntry = () => {
    navigate('/entries/new');
  };

  return (
    <div className="flex min-h-screen bg-ink">
      {/* ---- SIDEBAR ---- */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-56 flex flex-col border-r"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link to="/entries" className="block">
            <h1
              className="text-2xl font-display font-light tracking-wide"
              style={{ color: 'var(--paper)', letterSpacing: '0.08em' }}
            >
              The Archive
            </h1>
            <p
              className="font-mono text-2xs mt-1 tracking-widest uppercase"
              style={{ color: 'var(--ghost)' }}
            >
              Personal record
            </p>
          </Link>
        </div>

        {/* New Entry CTA */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleNewEntry}
            className="w-full text-left px-3 py-2.5 border transition-colors duration-150 group"
            style={{
              borderColor: 'var(--amber)',
              backgroundColor: 'transparent',
              color: 'var(--amber)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139,115,85,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            <span className="font-mono text-xs tracking-widest uppercase">+ New Entry</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="block px-6 py-3.5 transition-colors duration-150 relative"
                style={{
                  backgroundColor: active ? 'rgba(139,115,85,0.08)' : 'transparent',
                  borderLeft: active ? '2px solid var(--amber)' : '2px solid transparent',
                }}
              >
                <span
                  className="block text-sm font-light"
                  style={{ color: active ? 'var(--parchment)' : 'var(--ghost)' }}
                >
                  {item.label}
                </span>
                <span
                  className="block font-mono text-2xs mt-0.5 tracking-wide"
                  style={{ color: active ? 'var(--ghost)' : 'var(--border-2)' }}
                >
                  {item.sublabel}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User / Sign out */}
        <div
          className="px-6 py-5 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <p
            className="font-mono text-2xs tracking-wide truncate mb-2"
            style={{ color: 'var(--ghost)' }}
          >
            {user?.email}
          </p>
          <button
            onClick={() => signOut()}
            className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
            style={{ color: 'var(--ghost)' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--parchment)')}
            onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ---- MAIN CANVAS ---- */}
      <main
        className="flex-1 ml-56 min-h-screen"
        style={{ backgroundColor: 'var(--ink)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
