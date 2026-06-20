import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ENTITY_TYPES, ENTITY_TYPE_LABELS, type EntityType, type Annotation } from '../../types';

// ============================================================
// ENTITY TYPE COLORS
// ============================================================
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

// ============================================================
// ANNOTATION POPUP — V3
// Appears when user selects text in the manuscript
// ============================================================
interface AnnotationPopupProps {
  position: { x: number; y: number };
  selectedText: string;
  onSelect: (type: EntityType) => void;
  onDismiss: () => void;
}

function AnnotationPopup({ position, selectedText, onSelect, onDismiss }: AnnotationPopupProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="annotation-popup fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Selected text preview */}
      <div
        className="px-4 py-2 border-b text-xs italic"
        style={{
          borderColor: 'var(--border-2)',
          color: 'var(--parchment)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          maxWidth: '220px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        "{selectedText}"
      </div>

      {/* Entity type options */}
      <div className="py-1">
        {ENTITY_TYPES.slice(0, 6).map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-100"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: ENTITY_COLORS[type] }}
            />
            <span
              className="font-mono text-xs tracking-wide"
              style={{ color: 'var(--parchment)' }}
            >
              {ENTITY_TYPE_LABELS[type]}
            </span>
          </button>
        ))}
      </div>

      {/* Dismiss hint */}
      <div
        className="px-4 py-2 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="font-mono text-2xs" style={{ color: 'var(--ghost)' }}>
          Esc to dismiss
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================
// ENTITY NAME DIALOG — V3
// After picking a type, user names the entity
// ============================================================
interface EntityNameDialogProps {
  type: EntityType;
  suggestedName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

function EntityNameDialog({ type, suggestedName, onConfirm, onCancel }: EntityNameDialogProps) {
  const [name, setName] = useState(suggestedName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      onConfirm(name.trim());
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        className="p-8 w-80"
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-2)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="font-mono text-2xs tracking-widest uppercase mb-1"
          style={{ color: ENTITY_COLORS[type] }}
        >
          {ENTITY_TYPE_LABELS[type]}
        </div>
        <p
          className="font-display text-sm italic mb-5"
          style={{ color: 'var(--ghost)' }}
        >
          Name this {type}:
        </p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKey}
          className="w-full bg-transparent border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--border-2)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-body)',
          }}
          onFocus={e => (e.target.style.borderColor = ENTITY_COLORS[type])}
          onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="flex-1 py-2 font-mono text-xs tracking-widest uppercase border transition-colors duration-150 disabled:opacity-40"
            style={{ borderColor: ENTITY_COLORS[type], color: ENTITY_COLORS[type] }}
          >
            Link ↵
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 font-mono text-xs tracking-widest uppercase border"
            style={{ borderColor: 'var(--border)', color: 'var(--ghost)' }}
          >
            Esc
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// MAIN EDITOR
// ============================================================
export interface ManuscriptEditorHandle {
  getContent: () => string;
  getRawText: () => string;
  setContent: (html: string) => void;
  focus: () => void;
}

interface ManuscriptEditorProps {
  initialContent?: string;
  annotations?: Annotation[];
  onAnnotate?: (
    type: EntityType,
    name: string,
    startOffset: number,
    endOffset: number,
    selectedText: string,
  ) => void;
  onChange?: () => void;
  readOnly?: boolean;
}

interface SelectionState {
  text: string;
  startOffset: number;
  endOffset: number;
  position: { x: number; y: number };
}

type PopupPhase =
  | { kind: 'none' }
  | { kind: 'type-select'; sel: SelectionState }
  | { kind: 'name-input'; sel: SelectionState; type: EntityType };

export const ManuscriptEditor = forwardRef<ManuscriptEditorHandle, ManuscriptEditorProps>(
  ({ initialContent = '', annotations = [], onAnnotate, onChange, readOnly = false }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [popup, setPopup] = useState<PopupPhase>({ kind: 'none' });

    useImperativeHandle(ref, () => ({
      getContent: () => editorRef.current?.innerHTML ?? '',
      getRawText: () => editorRef.current?.innerText ?? '',
      setContent: (html: string) => {
        if (editorRef.current) editorRef.current.innerHTML = html;
      },
      focus: () => editorRef.current?.focus(),
    }));

    // Initialise content once
    useEffect(() => {
      if (editorRef.current && initialContent) {
        editorRef.current.innerHTML = initialContent;
      }
    }, []);

    // Handle Tab key → trigger annotation popup on selection
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Tab' && !readOnly) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const text = selection.toString().trim();
        if (!text) return;

        e.preventDefault();

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Calculate text offset relative to editor
        const editorEl = editorRef.current!;
        const editorRange = document.createRange();
        editorRange.setStart(editorEl, 0);
        editorRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = editorRange.toString().length;
        const endOffset = startOffset + text.length;

        setPopup({
          kind: 'type-select',
          sel: {
            text,
            startOffset,
            endOffset,
            position: {
              x: rect.left + rect.width / 2,
              y: rect.top - 8,
            },
          },
        });
      }
    }, [readOnly]);

    const handleTypeSelect = (type: EntityType) => {
      if (popup.kind !== 'type-select') return;
      setPopup({ kind: 'name-input', sel: popup.sel, type });
    };

    const handleNameConfirm = (name: string) => {
      if (popup.kind !== 'name-input') return;
      const { sel, type } = popup;

      onAnnotate?.(type, name, sel.startOffset, sel.endOffset, sel.text);
      setPopup({ kind: 'none' });
    };

    const handleDismiss = () => setPopup({ kind: 'none' });

    return (
      <>
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          className="archive-editor"
          data-placeholder="Begin writing. Select text and press Tab to annotate."
          onKeyDown={handleKeyDown}
          onInput={onChange}
          spellCheck={false}
          style={{
            outline: 'none',
            minHeight: '60vh',
            paddingBottom: '8rem',
          }}
        />

        <AnimatePresence>
          {popup.kind === 'type-select' && (
            <AnnotationPopup
              key="popup"
              position={popup.sel.position}
              selectedText={popup.sel.text}
              onSelect={handleTypeSelect}
              onDismiss={handleDismiss}
            />
          )}
          {popup.kind === 'name-input' && (
            <EntityNameDialog
              key="dialog"
              type={popup.type}
              suggestedName={popup.sel.text}
              onConfirm={handleNameConfirm}
              onCancel={handleDismiss}
            />
          )}
        </AnimatePresence>
      </>
    );
  }
);

ManuscriptEditor.displayName = 'ManuscriptEditor';
