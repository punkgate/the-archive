import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore, useEntriesStore } from '../stores';
import { getEntries, deleteEntry } from '../services/entries';
import { formatArchivalDate } from '../lib/extraction';
import type { EntryListItem } from '../types';

export function EntriesPage() {
  const { user } = useAuthStore();
  const { entries, loading, setEntries, setLoading, removeEntry } = useEntriesStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getEntries(user.id).then((res) => {
      if (res.success) setEntries(res.data);
      setLoading(false);
    });
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, entry: EntryListItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    setDeletingId(entry.id);
    const res = await deleteEntry(entry.id, user.id);
    if (res.success) {
      removeEntry(entry.id);
    }
    setDeletingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-10 py-12">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-10">
        <div>
          <h2
            className="font-display text-3xl font-light"
            style={{ color: 'var(--paper)', letterSpacing: '0.04em' }}
          >
            Archive
          </h2>
          {entries.length > 0 && (
            <p
              className="font-mono text-2xs mt-1 tracking-widest"
              style={{ color: 'var(--ghost)' }}
            >
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </p>
          )}
        </div>
        <Link
          to="/entries/new"
          className="font-mono text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-150"
          style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139,115,85,0.1)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
        >
          + New Entry
        </Link>
      </div>

      <hr className="hairline mb-10" />

      {/* Loading */}
      {loading && (
        <div className="py-24 text-center">
          <span
            className="font-mono text-xs tracking-widest animate-pulse"
            style={{ color: 'var(--ghost)' }}
          >
            LOADING
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="py-24 text-center">
          <p
            className="font-display text-2xl italic mb-4"
            style={{ color: 'var(--ghost)' }}
          >
            The archive is empty.
          </p>
          <p
            className="font-mono text-xs tracking-wide"
            style={{ color: 'var(--border-2)' }}
          >
            Begin with a single observation.
          </p>
          <Link
            to="/entries/new"
            className="inline-block mt-8 font-mono text-xs tracking-widest uppercase px-5 py-2.5 border transition-colors duration-150"
            style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
          >
            Open first entry
          </Link>
        </div>
      )}

      {/* Entry list */}
      {!loading && entries.length > 0 && (
        <ul className="space-y-0">
          {entries.map((entry, i) => (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Link
                to={`/entries/${entry.id}`}
                className="group flex items-start justify-between py-6 border-b transition-colors duration-150"
                style={{
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex-1 min-w-0 pr-6">
                  {/* Date stamp */}
                  <div
                    className="font-mono text-2xs tracking-widest mb-2"
                    style={{ color: 'var(--ghost)' }}
                  >
                    {formatArchivalDate(entry.created_at)}
                  </div>

                  {/* Title */}
                  <h3
                    className="font-display text-xl font-light mb-2 transition-colors duration-150 truncate"
                    style={{ color: 'var(--paper)' }}
                  >
                    {entry.title || <span style={{ color: 'var(--ghost)', fontStyle: 'italic' }}>Untitled</span>}
                  </h3>

                  {/* Excerpt */}
                  {entry.raw_content && (
                    <p
                      className="text-sm leading-relaxed line-clamp-2"
                      style={{ color: 'var(--ghost)' }}
                    >
                      {entry.raw_content.slice(0, 200)}
                    </p>
                  )}

                  {/* Counts */}
                  {(entry.image_count > 0 || entry.entity_count > 0) && (
                    <div className="flex items-center gap-4 mt-3">
                      {entry.image_count > 0 && (
                        <span className="font-mono text-2xs tracking-wide" style={{ color: 'var(--border-2)' }}>
                          {entry.image_count} image{entry.image_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      {entry.entity_count > 0 && (
                        <span className="font-mono text-2xs tracking-wide" style={{ color: 'var(--border-2)' }}>
                          {entry.entity_count} link{entry.entity_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(e, entry)}
                  disabled={deletingId === entry.id}
                  className="flex-shrink-0 mt-1 font-mono text-2xs tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-150 px-2 py-1"
                  style={{ color: 'var(--ghost)' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--danger)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
                  title="Delete entry"
                >
                  {deletingId === entry.id ? '…' : 'DELETE'}
                </button>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
