import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore, useEditorStore } from '../stores';
import { getEntry, updateEntry, deleteEntry } from '../services/entries';
import { syncExtractedEntities, linkEntityToEntry, upsertEntity, getEntitiesForEntry } from '../services/entities';
import { createAnnotation, deleteAnnotation } from '../services/images';
import { getImagesForEntry } from '../services/images';
import { extractEntitiesFromText, formatArchivalDate, formatArchivalTime } from '../lib/extraction';
import { ManuscriptEditor, type ManuscriptEditorHandle } from '../components/editor/ManuscriptEditor';
import { ImageStrip } from '../components/images/ImageStrip';
import { EntityPanel } from '../components/entities/EntityPanel';
import type { Entry, EntryImage, EntryEntityJoin, Annotation, EntityType } from '../types';

const AUTOSAVE_MS = 2000;

export function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isDirty, isSaving, lastSaved, setDirty, setSaving, setLastSaved } = useEditorStore();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [title, setTitle] = useState('');
  const [images, setImages] = useState<EntryImage[]>([]);
  const [entityLinks, setEntityLinks] = useState<EntryEntityJoin[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const editorRef = useRef<ManuscriptEditorHandle>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Load entry
  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);

    getEntry(id, user.id).then((res) => {
      if (!res.success) {
        navigate('/entries');
        return;
      }

      const e = res.data;
      setEntry(e);
      setTitle(e.title);
      setImages(e.images ?? []);
      setEntityLinks(e.entities ?? []);
      setAnnotations(e.annotations ?? []);
      setLoading(false);

      // Load images separately if needed
      if (!e.images?.length) {
        getImagesForEntry(id, user.id).then((imgRes) => {
          if (imgRes.success) setImages(imgRes.data);
        });
      }
    });

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [id, user]);

  // Autosave
  const scheduleSave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(save, AUTOSAVE_MS);
  }, []);

  const save = useCallback(async () => {
    if (!id || !user || !editorRef.current) return;
    setSaving(true);

    const content = editorRef.current.getContent();
    const rawText = editorRef.current.getRawText();
    const currentTitle = titleRef.current?.value ?? title;

    const res = await updateEntry(id, user.id, {
      title: currentTitle || 'Untitled',
      content,
      raw_content: rawText,
    });

    if (res.success) {
      setLastSaved(new Date());

      // V2: extract and sync entities from symbols
      const extracted = extractEntitiesFromText(rawText);
      if (extracted.length > 0) {
        const syncRes = await syncExtractedEntities(id, user.id, extracted);
        if (syncRes.success) {
          // Reload entity links
          const linksRes = await getEntitiesForEntry(id, user.id);
          if (linksRes.success) setEntityLinks(linksRes.data);
        }
      }
    }

    setSaving(false);
  }, [id, user, title]);

  const handleEditorChange = () => {
    setDirty(true);
    scheduleSave();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setDirty(true);
    scheduleSave();
  };

  // V3: handle annotation creation
  const handleAnnotate = async (
    type: EntityType,
    name: string,
    startOffset: number,
    endOffset: number,
    selectedText: string,
  ) => {
    if (!id || !user) return;

    // Upsert entity
    const entityRes = await upsertEntity(user.id, type, name);
    if (!entityRes.success) return;

    const entity = entityRes.data;

    // Create annotation
    const annRes = await createAnnotation(
      id,
      entity.id,
      user.id,
      startOffset,
      endOffset,
      selectedText,
    );

    if (annRes.success) {
      setAnnotations((prev) => [...prev, { ...annRes.data, entity }]);

      // Update entity links
      const alreadyLinked = entityLinks.some((l) => l.entity_id === entity.id);
      if (!alreadyLinked) {
        const linkRes = await linkEntityToEntry(id, entity.id, user.id, 'annotation');
        if (linkRes.success) {
          setEntityLinks((prev) => [...prev, { ...linkRes.data, entity }]);
        }
      }
    }
  };

  // Delete annotation
  const handleAnnotationDelete = async (annotationId: string) => {
    if (!user) return;
    const res = await deleteAnnotation(annotationId, user.id);
    if (res.success) {
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    }
  };

  // Delete entry
  const handleDeleteEntry = async () => {
    if (!id || !user || !entry) return;
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
    const res = await deleteEntry(id, user.id);
    if (res.success) navigate('/entries');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="font-mono text-xs tracking-widest animate-pulse" style={{ color: 'var(--ghost)' }}>
          OPENING ENTRY
        </span>
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="flex min-h-screen">
      {/* ---- MANUSCRIPT AREA ---- */}
      <article
        className="flex-1 min-w-0"
        style={{ maxWidth: rightPanelOpen ? 'calc(100% - 240px)' : '100%' }}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-10 py-4 border-b"
          style={{
            backgroundColor: 'rgba(10,10,10,0.92)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Status */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/entries')}
              className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
              style={{ color: 'var(--ghost)' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--parchment)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
            >
              ← Archive
            </button>
            <span className="font-mono text-2xs" style={{ color: 'var(--border-2)' }}>
              {formatArchivalDate(entry.created_at)} · {formatArchivalTime(entry.created_at)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isSaving && (
              <span className="font-mono text-2xs tracking-widest animate-pulse" style={{ color: 'var(--ghost)' }}>
                SAVING
              </span>
            )}
            {!isSaving && lastSaved && (
              <span className="font-mono text-2xs" style={{ color: 'var(--border-2)' }}>
                Saved
              </span>
            )}
            {isDirty && !isSaving && (
              <button
                onClick={save}
                className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
                style={{ color: 'var(--amber)' }}
              >
                Save
              </button>
            )}
            <button
              onClick={() => setRightPanelOpen(o => !o)}
              className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
              style={{ color: 'var(--ghost)' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--parchment)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
            >
              {rightPanelOpen ? 'Links ▸' : '◂ Links'}
            </button>
            <button
              onClick={handleDeleteEntry}
              className="font-mono text-2xs tracking-widest uppercase transition-colors duration-150"
              style={{ color: 'var(--ghost)' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--danger)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--ghost)')}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Writing area */}
        <div className="px-10 py-12" style={{ maxWidth: '720px', margin: '0 auto' }}>
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full bg-transparent outline-none mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 300,
              lineHeight: 1.2,
              color: 'var(--paper)',
              letterSpacing: '0.02em',
              caretColor: 'var(--amber)',
            }}
          />

          <hr className="hairline mb-8" />

          {/* Editor */}
          <ManuscriptEditor
            ref={editorRef}
            initialContent={entry.content}
            annotations={annotations}
            onAnnotate={handleAnnotate}
            onChange={handleEditorChange}
          />

          {/* Images */}
          <div className="mt-10">
            <ImageStrip
              entryId={entry.id}
              userId={user!.id}
              images={images}
              onImagesChange={setImages}
            />
          </div>
        </div>
      </article>

      {/* ---- RIGHT PANEL — Entities ---- */}
      {rightPanelOpen && (
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2 }}
          className="w-60 flex-shrink-0 border-l sticky top-0 h-screen overflow-y-auto"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
          }}
        >
          <EntityPanel
            entityLinks={entityLinks}
            annotations={annotations}
            onAnnotationDelete={handleAnnotationDelete}
          />
        </motion.aside>
      )}
    </div>
  );
}
