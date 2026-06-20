import type { ExtractedEntity, EntityType } from '../types';

// ============================================================
// ENTITY EXTRACTION — V2
// Parses #Theme @Character $Place from raw text
// ============================================================

const SYMBOL_PATTERN = /([#@$])([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\-_'\.]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\-_'\.]*)*)/g;

const SYMBOL_TO_TYPE: Record<string, EntityType> = {
  '#': 'theme',
  '@': 'character',
  '$': 'place',
};

export function extractEntitiesFromText(text: string): ExtractedEntity[] {
  const found: ExtractedEntity[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  SYMBOL_PATTERN.lastIndex = 0;

  while ((match = SYMBOL_PATTERN.exec(text)) !== null) {
    const symbol = match[1];
    const name = match[2].trim();
    const type = SYMBOL_TO_TYPE[symbol];

    if (!type || !name) continue;

    const slug = normalizeSlug(name);
    const key = `${type}:${slug}`;

    if (!seen.has(key)) {
      seen.add(key);
      found.push({
        type,
        name,
        slug,
        raw: match[0],
      });
    }
  }

  return found;
}

export function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-àáâãäåèéêëìíîïòóôõöùúûü]/g, '');
}

// Strip all entity symbols from text to get clean readable content
export function stripSymbols(text: string): string {
  return text.replace(/([#@$])([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\-_'\.]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\-_'\.]*)*)/g, '$2');
}

// ============================================================
// ENTITY SUGGESTION — V3 fuzzy matching
// Finds probable entity matches in raw text
// ============================================================
export interface SuggestedMatch {
  entityName: string;
  entitySlug: string;
  entityId: string;
  entityType: EntityType;
  matchedText: string;
  startIndex: number;
  endIndex: number;
}

export function findEntitySuggestions(
  text: string,
  existingEntities: Array<{ id: string; name: string; slug: string; type: EntityType }>
): SuggestedMatch[] {
  const suggestions: SuggestedMatch[] = [];

  for (const entity of existingEntities) {
    const escapedName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedName}\\b`, 'gi');

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      suggestions.push({
        entityName: entity.name,
        entitySlug: entity.slug,
        entityId: entity.id,
        entityType: entity.type,
        matchedText: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return suggestions;
}

// Get a plain-text excerpt with surrounding context
export function getExcerpt(text: string, query: string, contextLength = 120): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, contextLength) + (text.length > contextLength ? '…' : '');

  const start = Math.max(0, idx - Math.floor(contextLength / 2));
  const end = Math.min(text.length, idx + query.length + Math.floor(contextLength / 2));

  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

// Format a date in archival style
export function formatArchivalDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatArchivalTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
