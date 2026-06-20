import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { EntryEntityJoin, Annotation, EntityType } from '../../types';
import { ENTITY_TYPE_LABELS } from '../../types';

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

interface EntityPanelProps {
  entityLinks: EntryEntityJoin[];
  annotations: Annotation[];
  onAnnotationDelete?: (id: string) => void;
}

export function EntityPanel({ entityLinks, annotations, onAnnotationDelete }: EntityPanelProps) {
  // Group by entity type
  const grouped = entityLinks.reduce<Record<string, EntryEntityJoin[]>>((acc, link) => {
    const type = link.entity?.type ?? 'concept';
    if (!acc[type]) acc[type] = [];
    acc[type].push(link);
    return acc;
  }, {});

  const hasAny = entityLinks.length > 0 || annotations.length > 0;

  return (
    <div className="h-full">
      {/* Header */}
      <div
        className="px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-mono text-2xs tracking-widest uppercase" style={{ color: 'var(--ghost)' }}>
          Linked
        </span>
      </div>

      {!hasAny && (
        <div className="px-5 py-8">
          <p className="font-mono text-2xs leading-relaxed" style={{ color: 'var(--border-2)' }}>
            Select text and press Tab to annotate.
          </p>
          <p className="font-mono text-2xs leading-relaxed mt-2" style={{ color: 'var(--border-2)' }}>
            Or use #Theme @Character $Place in your text.
          </p>
        </div>
      )}

      {/* Entity groups */}
      <div className="py-3">
        <AnimatePresence>
          {Object.entries(grouped).map(([type, links]) => (
            <motion.div
              key={type}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="mb-4"
            >
              <div
                className="px-5 py-1 font-mono text-2xs tracking-widest uppercase"
                style={{ color: ENTITY_COLORS[type as EntityType] }}
              >
                {ENTITY_TYPE_LABELS[type as EntityType]}
              </div>
              {links.map((link) => (
                <Link
                  key={link.id}
                  to={`/entities/${link.entity_id}`}
                  className="flex items-center gap-2 px-5 py-2 transition-colors duration-100"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                >
                  <span
                    className="w-1 h-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ENTITY_COLORS[link.entity?.type ?? 'concept'] }}
                  />
                  <span className="text-sm font-light truncate" style={{ color: 'var(--parchment)' }}>
                    {link.entity?.name ?? '—'}
                  </span>
                </Link>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Annotations (V3) */}
      {annotations.length > 0 && (
        <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <div
            className="px-5 py-1 font-mono text-2xs tracking-widest uppercase mb-1"
            style={{ color: 'var(--ghost)' }}
          >
            Annotations
          </div>
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="flex items-start justify-between px-5 py-2 group"
            >
              <div className="flex-1 min-w-0">
                <span
                  className="block text-xs italic truncate"
                  style={{ color: 'var(--ghost)', fontFamily: 'var(--font-display)' }}
                >
                  "{ann.selected_text}"
                </span>
                <Link
                  to={`/entities/${ann.entity_id}`}
                  className="block font-mono text-2xs mt-0.5"
                  style={{ color: 'var(--parchment)' }}
                >
                  {ann.entity?.name} · {ENTITY_TYPE_LABELS[ann.entity?.type ?? 'concept']}
                </Link>
              </div>
              {onAnnotationDelete && (
                <button
                  onClick={() => onAnnotationDelete(ann.id)}
                  className="ml-2 font-mono text-2xs opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ color: 'var(--ghost)' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--danger)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* V2 symbol guide */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="font-mono text-2xs leading-loose" style={{ color: 'var(--border-2)' }}>
          <span style={{ color: 'var(--amber)' }}>#Theme</span>
          {'  '}
          <span style={{ color: '#7A8B9A' }}>@Character</span>
          {'  '}
          <span style={{ color: '#5A7A5A' }}>$Place</span>
        </p>
      </div>
    </div>
  );
}
