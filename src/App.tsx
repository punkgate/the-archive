import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { EntriesPage } from './pages/EntriesPage';
import { EntryPage } from './pages/EntryPage';
import { NewEntryPage } from './pages/NewEntryPage';
import { EntityPage } from './pages/EntityPage';
import { EntitiesPage } from './pages/EntitiesPage';
import { SearchPage } from './pages/SearchPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink">
        <span className="font-mono text-xs text-ghost tracking-widest animate-pulse">
          INITIALIZING
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      {/* Film grain atmosphere */}
      <div className="grain-overlay" aria-hidden />
      {/* Film leader strip */}
      <div className="film-leader" aria-hidden />

      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/entries" replace />} />
                  <Route path="/entries" element={<EntriesPage />} />
                  <Route path="/entries/new" element={<NewEntryPage />} />
                  <Route path="/entries/:id" element={<EntryPage />} />
                  <Route path="/entities" element={<EntitiesPage />} />
                  <Route path="/entities/:id" element={<EntityPage />} />
                  <Route path="/search" element={<SearchPage />} />
                </Routes>
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
}
