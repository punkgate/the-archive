import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores';
import { getAllEntities } from '../services/entities';
import type { EntityType, EntityWithCount } from '../types';
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

type FilterType = 'all' | EntityType;

export function EntitiesPage() {
  const { user } = useAuthStore();
  const [entities, setEntities] = useState<EntityWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getAllEntities(user.id).then((res) => {
      if (res.success) setEntities(res.data);
      setLoading(false);
    });
  }, [user]);

  const filtered = filter === 'all'
    ? entities
    : entities.filter((e) => e.type === filter);

  // Count by type for tabs
  const counts: Partial<Record<FilterType, number>> = { all: entities.length };
  for (const e of entities) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }

  const availableTypes = Array.from(new Set(entities.map((e) => e.type))) as EntityType[];

  return (
    <div className="max-w-3xl mx-auto px-10 py-12">
      {/* Header */}
      <div className="mb-10">
        <h2
          className="font-display text-3xl font-light mb-1"
          style={{ color: 'var(--paper)', letterSpacing: '0.04em' }}
        >
          Index
        </h2>
        <p className="font-mono text-2xs tracking-widest" style={{ color: 'var(--ghost)' }}>
          Themes · Characters · Places · Concepts
        </p>
      </div>

      <hr className="hairline mb-6" />

      {/* Filter tabs */}
      {!loading && entities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setFilter('all')}
            className="px-3 py-1 font-mono text-2xs tracking-widest uppercase border transition-colors duration-150"
            style={{
              borderColor: filter === 'all' ? 'var(--amber)' : 'var(--border)',
              color: filter === 'all' ? 'var(--amber)' : 'var(--ghost)',
            }}
          >
            All ({counts.all})
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="px-3 py-1 font-mono text-2xs tracking-widest uppercase border transition-colors duration-150"
              style={{
                borderColor: filter === type ? ENTITY_COLORS[type] : 'var(--border)',
                color: filter === type ? ENTITY_COLORS[type] : 'var(--ghost)',
              }}
            >
              {ENTITY_TYPE_LABELS[type]} ({counts[type] ?? 0})
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-24 text-center">
          <span className="font-mono text-xs tracking-widest animate-pulse" style={{ color: 'var(--ghost)' }}>
            LOADING INDEX
          </span>
        </div>
      )}

      {/* Empty */}
      {!loading && entities.length === 0 && (
        <div className="py-24 text-center">
          <p className="font-display text-2xl italic mb-4" style={{ color: 'var(--ghost)' }}>
            The index is empty.
          </p>
          <p className="font-mono text-xs leading-loose" style={{ color: 'var(--border-2)' }}>
            Use <span style={{ color: 'var(--amber)' }}>#Theme</span>{' '}
            <span style={{ color: '#7A8B9A' }}>@Character</span>{' '}
            <span style={{ color: '#5A7A5A' }}>$Place</span> in entries.
            <br />
            Or select text and press Tab to annotate.
          </p>
        </div>
      )}

      {/* Entity grid */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-0">
          {filtered.map((entity, i) => (
            <motion.div
              key={entity.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025, duration: 0.18 }}
            >
              <Link
                to={`/entities/${entity.id}`}
                className="flex items-center justify-between py-5 border-b transition-colors duration-150 group"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Type dot */}
                  <span
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: ENTITY_COLORS[entity.type] }}
                  />

                  {/* Name */}
                  <span
                    className="font-display text-xl font-light transition-colors duration-150"
                    style={{ color: 'var(--paper)' }}
                  >
                    {entity.name}
                  </span>

                  {/* Type label */}
                  <span
                    className="font-mono text-2xs tracking-widest uppercase"
                    style={{ color: ENTITY_COLORS[entity.type], opacity: 0.7 }}
                  >
                    {ENTITY_TYPE_LABELS[entity.type]}
                  </span>
                </div>

                {/* Occurrence count */}
                <div className="flex items-center gap-4">
                  {entity.description && (
                    <span
                      className="font-mono text-2xs truncate max-w-32 hidden md:block"
                      style={{ color: 'var(--ghost)' }}
                    >
                      {entity.description}
                    </span>
                  )}
                  <span className="font-mono text-xs" style={{ color: 'var(--ghost)' }}>
                    {entity.occurrence_count > 0 ? (
                      <>{entity.occurrence_count} {entity.occurrence_count === 1 ? 'entry' : 'entries'}</>
                    ) : (
                      <span style={{ color: 'var(--border-2)' }}>unused</span>
                    )}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
