// ============================================================
// THE ARCHIVE — TypeScript Interfaces
// Complete type system for V1, V2, V3
// ============================================================

// ============================================================
// ENTRIES
// ============================================================
export interface Entry {
  id: string;
  user_id: string;
  title: string;
  content: string;      // HTML content from editor
  raw_content: string;  // Plain text for search
  created_at: string;
  updated_at: string;
  // Joined data
  images?: EntryImage[];
  entities?: EntryEntityJoin[];
  annotations?: Annotation[];
}

export interface EntryImage {
  id: string;
  entry_id: string;
  user_id: string;
  storage_key: string;
  url: string | null;
  caption: string | null;
  position: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface EntryListItem {
  id: string;
  title: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
  image_count: number;
  entity_count: number;
}

// ============================================================
// ENTITY SYSTEM
// ============================================================
export type EntityType =
  | 'theme'
  | 'character'
  | 'place'
  | 'concept'
  | 'event'
  | 'quote'
  | 'book'
  | 'film'
  | 'person';

export const ENTITY_TYPES: EntityType[] = [
  'theme',
  'character',
  'place',
  'concept',
  'event',
  'quote',
  'book',
  'film',
  'person',
];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  theme: 'Theme',
  character: 'Character',
  place: 'Place',
  concept: 'Concept',
  event: 'Event',
  quote: 'Quote',
  book: 'Book',
  film: 'Film',
  person: 'Person',
};

// V2 symbols for extraction
export const ENTITY_SYMBOLS: Partial<Record<EntityType, string>> = {
  theme: '#',
  character: '@',
  place: '$',
};

export interface Entity {
  id: string;
  user_id: string;
  type: EntityType;
  name: string;
  slug: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EntityWithCount extends Entity {
  occurrence_count: number;
}

export interface EntryEntityJoin {
  id: string;
  entry_id: string;
  entity_id: string;
  user_id: string;
  source: 'symbol' | 'annotation' | 'manual';
  created_at: string;
  entity?: Entity;
}

// ============================================================
// ANNOTATIONS — V3
// ============================================================
export interface Annotation {
  id: string;
  entry_id: string;
  entity_id: string;
  user_id: string;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  created_at: string;
  entity?: Entity;
}

export interface AnnotationSelection {
  text: string;
  start: number;
  end: number;
  rect: DOMRect;
}

// ============================================================
// ENTITY EXTRACTION (V2 — symbol-based)
// ============================================================
export interface ExtractedEntity {
  type: EntityType;
  name: string;
  slug: string;
  raw: string; // the original symbol+name string
}

// ============================================================
// SEARCH
// ============================================================
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  created_at: string;
  rank: number;
  excerpt?: string;
}

// ============================================================
// UI STATE
// ============================================================
export interface EditorState {
  entryId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

export interface AnnotationPopupState {
  visible: boolean;
  selection: AnnotationSelection | null;
  position: { x: number; y: number } | null;
}

export interface EntitySuggestion {
  entity: Entity;
  confidence: number;
  matchedText: string;
}

// ============================================================
// AUTH
// ============================================================
export interface AuthUser {
  id: string;
  email: string | undefined;
  created_at: string;
}

// ============================================================
// SUPABASE RESPONSES
// ============================================================
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
