import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores';
import { getEntity, getEntriesForEntity, deleteEntity, updateEntity } from '../services/entities';
import { formatArchivalDate } from '../lib/extraction';
import type { Entity, EntityType } from '../types';
import { ENTITY_TYPE_LABELS } from '../types';

const ENTITY_COLORS: Record<EntityType, string> = {
  theme:     '#8B7355',
  character: '#7A8B9A',
  place:     '#5A7A5A',
  concept:   '#7A5A8B',
  event:     '#8B5A5A',
  quote:     '#7A7A5A',
  book:      '#5A6A7A',
  film:      '#6A5A7A',
  person:    '#7A6A5A',
};

export function EntityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [entity, setEntity] = useState<Entity | null>(null);
  const [entries, setEntries] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descText, setDescText] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);

    Promise.all([
      getEntity(id, user.id),
      getEntriesForEntity(id, user.id),
    ]).then(([entityRes, entriesRes]) => {
      if (!entityRes.success) {
        navigate('/entities');
        return;
      }

      setEntity(entityRes.data);
      setDescText(entityRes.data.description ?? '');
      if (entriesRes.success) setEntries(entriesRes.data);
      setLoading(false);
    });
  }, [id, user]);

  const handleSaveDescription = async () => {
    if (!entity || !user) return;
    const res = await updateEntity(entity.id, user.id, { description: descText });
    if (res.success) {
      setEntity({ ...entity, description: descText });
    }
    setEditingDescription(false);
  };

  const handleDelete = async () => {
    if (!entity || !user) return;
    if (!confirm(`Remove "${entity.name}" from the index? Links to entries will also be removed.`)) return;
    const res = await deleteEntity(entity.id, user.id);
    if (res.success) navigate('/entities');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="font-mono text-xs tracking-widest animate-pulse" style={{ color: 'var(--ghost)' }}>
          LOADING
        </span>
      </div>
    );
  }

  if (!entity) return null;

  const color = ENTITY_COLORS[entity.type];

  return (
    <div className="max-w-3xl mx-auto px-10 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-10">
        <Link
          to="/entities"
          className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
          style={{ color: 'var(--ghost)' }}
          onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--parchment)')}
          onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
        >
          ← Index
        </Link>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span className="font-mono text-2xs tracking-widest uppercase" style={{ color }}>
          {ENTITY_TYPE_LABELS[entity.type]}
        </span>
      </div>

      {/* Entity header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-10"
      >
        {/* Type accent line */}
        <div
          className="w-12 mb-6"
          style={{ height: '2px', backgroundColor: color }}
        />

        <h1
          className="font-display text-5xl font-light mb-4"
          style={{ color: 'var(--paper)', letterSpacing: '0.04em' }}
        >
          {entity.name}
        </h1>

        {/* Occurrence count */}
        <p className="font-mono text-xs tracking-wide mb-6" style={{ color: 'var(--ghost)' }}>
          Appears in{' '}
          <span style={{ color }}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
          {' '}· Created {formatArchivalDate(entity.created_at)}
        </p>

        {/* Description */}
        {editingDescription ? (
          <div>
            <textarea
              value={descText}
              onChange={e => setDescText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditingDescription(false);
              }}
              placeholder="A note about this entity…"
              className="w-full bg-transparent border p-3 text-sm leading-relaxed outline-none resize-none"
              style={{
                borderColor: color,
                color: 'var(--parchment)',
                fontFamily: 'var(--font-body)',
                minHeight: '80px',
              }}
              autoFocus
            />
            <div className="flex gap-3 mt-2">
              <button
                onClick={handleSaveDescription}
                className="font-mono text-2xs tracking-widest uppercase px-4 py-1.5 border"
                style={{ borderColor: color, color }}
              >
                Save
              </button>
              <button
                onClick={() => setEditingDescription(false)}
                className="font-mono text-2xs tracking-widest uppercase px-4 py-1.5 border"
                style={{ borderColor: 'var(--border)', color: 'var(--ghost)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            {entity.description ? (
              <p
                className="font-display italic text-lg leading-relaxed cursor-text"
                style={{ color: 'var(--ghost)' }}
                onClick={() => setEditingDescription(true)}
              >
                {entity.description}
              </p>
            ) : (
              <button
                onClick={() => setEditingDescription(true)}
                className="font-mono text-2xs tracking-wide transition-colors duration-150"
                style={{ color: 'var(--border-2)' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--border-2)')}
              >
                Add a description…
              </button>
            )}
          </div>
        )}
      </motion.div>

      <hr className="hairline mb-10" />

      {/* Entries list */}
      <div className="mb-8">
        <h2
          className="font-mono text-2xs tracking-widest uppercase mb-6"
          style={{ color: 'var(--ghost)' }}
        >
          Appears in
        </h2>

        {entries.length === 0 ? (
          <p className="font-display italic" style={{ color: 'var(--ghost)' }}>
            No entries yet.
          </p>
        ) : (
          <ul className="space-y-0">
            {entries.map((entry, i) => (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.18 }}
              >
                <Link
                  to={`/entries/${entry.id}`}
                  className="flex items-center justify-between py-4 border-b transition-colors duration-150 group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span
                      className="font-display text-xl font-light group-hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--paper)' }}
                    >
                      {entry.title || <em style={{ color: 'var(--ghost)' }}>Untitled</em>}
                    </span>
                  </div>
                  <span className="font-mono text-2xs" style={{ color: 'var(--ghost)' }}>
                    {formatArchivalDate(entry.created_at)}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-16 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleDelete}
          className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
          style={{ color: 'var(--ghost)' }}
          onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--danger)')}
          onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
        >
          Remove from index
        </button>
      </div>
    </div>
  );
}
