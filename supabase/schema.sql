-- ============================================================
-- THE ARCHIVE — Complete Database Schema
-- V1: Entries + Images
-- V2: Entities (Themes, Characters, Places, Concepts, etc.)
-- V3: Annotations (manuscript-style entity linking)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ============================================================
-- ENTRIES
-- ============================================================
CREATE TABLE entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  raw_content TEXT NOT NULL DEFAULT '', -- plain text for search/extraction
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX entries_user_id_idx ON entries(user_id);
CREATE INDEX entries_created_at_idx ON entries(created_at DESC);
CREATE INDEX entries_content_search_idx ON entries USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(raw_content, '')));
CREATE INDEX entries_title_trgm_idx ON entries USING gin(title gin_trgm_ops);

-- ============================================================
-- ENTRY IMAGES
-- ============================================================
CREATE TABLE entry_images (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id    UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL, -- path in Supabase Storage
  url         TEXT,          -- cached public URL
  caption     TEXT,
  position    INTEGER NOT NULL DEFAULT 0, -- ordering within entry
  width       INTEGER,
  height      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX entry_images_entry_id_idx ON entry_images(entry_id);
CREATE INDEX entry_images_user_id_idx ON entry_images(user_id);

-- ============================================================
-- ENTITY SYSTEM — V2
-- Central entity table with discriminated type
-- ============================================================
CREATE TYPE entity_type AS ENUM (
  'theme',
  'character',
  'place',
  'concept',
  'event',
  'quote',
  'book',
  'film',
  'person'
);

CREATE TABLE entities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        entity_type NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL, -- normalized lowercase for dedup
  description TEXT,
  metadata    JSONB DEFAULT '{}', -- flexible per-type metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, type, slug)
);

CREATE INDEX entities_user_id_idx ON entities(user_id);
CREATE INDEX entities_type_idx ON entities(type);
CREATE INDEX entities_slug_idx ON entities(slug);
CREATE INDEX entities_name_trgm_idx ON entities USING gin(name gin_trgm_ops);

-- ============================================================
-- ENTRY <-> ENTITY RELATIONSHIP
-- Single join table for all entity types
-- ============================================================
CREATE TABLE entry_entities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  entity_id  UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source     TEXT NOT NULL DEFAULT 'symbol', -- 'symbol' | 'annotation' | 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entry_id, entity_id)
);

CREATE INDEX entry_entities_entry_id_idx ON entry_entities(entry_id);
CREATE INDEX entry_entities_entity_id_idx ON entry_entities(entity_id);
CREATE INDEX entry_entities_user_id_idx ON entry_entities(user_id);

-- ============================================================
-- ANNOTATIONS — V3
-- Manuscript-style text highlights linked to entities
-- ============================================================
CREATE TABLE annotations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id     UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  entity_id    UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- character offsets in the raw content
  start_offset INTEGER NOT NULL,
  end_offset   INTEGER NOT NULL,
  selected_text TEXT NOT NULL, -- the actual text highlighted
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entry_id, start_offset, end_offset)
);

CREATE INDEX annotations_entry_id_idx ON annotations(entry_id);
CREATE INDEX annotations_entity_id_idx ON annotations(entity_id);
CREATE INDEX annotations_user_id_idx ON annotations(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Entries policies
CREATE POLICY "users_own_entries" ON entries
  FOR ALL USING (auth.uid() = user_id);

-- Entry images policies
CREATE POLICY "users_own_entry_images" ON entry_images
  FOR ALL USING (auth.uid() = user_id);

-- Entities policies
CREATE POLICY "users_own_entities" ON entities
  FOR ALL USING (auth.uid() = user_id);

-- Entry entities policies
CREATE POLICY "users_own_entry_entities" ON entry_entities
  FOR ALL USING (auth.uid() = user_id);

-- Annotations policies
CREATE POLICY "users_own_annotations" ON annotations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Entity slug normalization
CREATE OR REPLACE FUNCTION normalize_entity_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(name), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Full-text search across entries
CREATE OR REPLACE FUNCTION search_entries(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.raw_content,
    e.created_at,
    ts_rank(
      to_tsvector('english', coalesce(e.title, '') || ' ' || coalesce(e.raw_content, '')),
      plainto_tsquery('english', p_query)
    ) AS rank
  FROM entries e
  WHERE e.user_id = p_user_id
    AND to_tsvector('english', coalesce(e.title, '') || ' ' || coalesce(e.raw_content, ''))
        @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC, e.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Entity frequency stats (for recurring motifs)
CREATE OR REPLACE FUNCTION get_entity_frequencies(p_user_id UUID)
RETURNS TABLE(
  entity_id UUID,
  entity_name TEXT,
  entity_type entity_type,
  occurrence_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    en.id AS entity_id,
    en.name AS entity_name,
    en.type AS entity_type,
    COUNT(ee.id) AS occurrence_count
  FROM entities en
  LEFT JOIN entry_entities ee ON ee.entity_id = en.id
  WHERE en.user_id = p_user_id
  GROUP BY en.id, en.name, en.type
  ORDER BY occurrence_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Run this in Supabase dashboard or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('archive-images', 'archive-images', false);

-- Storage RLS for archive-images bucket
CREATE POLICY "users_own_archive_images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'archive-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
