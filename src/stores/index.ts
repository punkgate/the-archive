import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { AuthUser, EntryListItem, Entity, EntityWithCount } from '../types';

// ============================================================
// AUTH STORE
// ============================================================
interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({
        user: {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
        },
        initialized: true,
      });
    } else {
      set({ initialized: true });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at,
          },
        });
      } else {
        set({ user: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return error?.message ?? null;
  },

  signUp: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ loading: false });
    return error?.message ?? null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

// ============================================================
// ENTRIES STORE
// ============================================================
interface EntriesStore {
  entries: EntryListItem[];
  loading: boolean;
  searchQuery: string;
  searchResults: EntryListItem[];
  setEntries: (entries: EntryListItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (results: EntryListItem[]) => void;
  removeEntry: (id: string) => void;
  upsertEntry: (entry: EntryListItem) => void;
}

export const useEntriesStore = create<EntriesStore>((set, get) => ({
  entries: [],
  loading: false,
  searchQuery: '',
  searchResults: [],

  setEntries: (entries) => set({ entries }),
  setLoading: (loading) => set({ loading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),

  removeEntry: (id) =>
    set({ entries: get().entries.filter((e) => e.id !== id) }),

  upsertEntry: (entry) => {
    const entries = get().entries;
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      const next = [...entries];
      next[idx] = entry;
      set({ entries: next });
    } else {
      set({ entries: [entry, ...entries] });
    }
  },
}));

// ============================================================
// ENTITIES STORE
// ============================================================
interface EntitiesStore {
  entities: EntityWithCount[];
  loading: boolean;
  setEntities: (entities: EntityWithCount[]) => void;
  setLoading: (loading: boolean) => void;
  upsertEntity: (entity: Entity) => void;
}

export const useEntitiesStore = create<EntitiesStore>((set, get) => ({
  entities: [],
  loading: false,

  setEntities: (entities) => set({ entities }),
  setLoading: (loading) => set({ loading }),

  upsertEntity: (entity) => {
    const entities = get().entities;
    const idx = entities.findIndex((e) => e.id === entity.id);
    if (idx >= 0) {
      const next = [...entities];
      next[idx] = { ...next[idx], ...entity };
      set({ entities: next });
    } else {
      set({
        entities: [{ ...entity, occurrence_count: 0 }, ...entities],
      });
    }
  },
}));

// ============================================================
// EDITOR STORE
// ============================================================
interface EditorStore {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (date: Date) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  isDirty: false,
  isSaving: false,
  lastSaved: null,
  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: (lastSaved) => set({ lastSaved, isDirty: false }),
}));
