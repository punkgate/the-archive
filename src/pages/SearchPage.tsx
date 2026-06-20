import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores';
import { searchEntries } from '../services/entries';
import { formatArchivalDate, getExcerpt } from '../lib/extraction';
import type { SearchResult } from '../types';

const DEBOUNCE_MS = 350;

export function SearchPage() {
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!user || !q.trim()) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const res = await searchEntries(user.id, q.trim());
    if (res.success) {
      const withExcerpts = res.data.map((r) => ({
        ...r,
        excerpt: getExcerpt(r.content, q.trim()),
      }));
      setResults(withExcerpts);
    }
    setLoading(false);
    setHasSearched(true);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(q), DEBOUNCE_MS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      doSearch(query);
    }
    if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-10 py-12">
      {/* Header */}
      <div className="mb-10">
        <h2
          className="font-display text-3xl font-light mb-1"
          style={{ color: 'var(--paper)', letterSpacing: '0.04em' }}
        >
          Search
        </h2>
        <p className="font-mono text-2xs tracking-widest" style={{ color: 'var(--ghost)' }}>
          Full-text across all entries
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-10">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="A word, a name, a fragment…"
          className="w-full bg-transparent outline-none py-4 pr-10 border-b text-lg"
          style={{
            borderColor: 'var(--border-2)',
            color: 'var(--paper)',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            caretColor: 'var(--amber)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--amber)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}
        />

        {loading && (
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-2xs tracking-widest animate-pulse"
            style={{ color: 'var(--ghost)' }}
          >
            …
          </span>
        )}

        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setHasSearched(false); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs"
            style={{ color: 'var(--ghost)' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {hasSearched && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {results.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-display text-xl italic" style={{ color: 'var(--ghost)' }}>
                  No entries found for "{query}"
                </p>
              </div>
            ) : (
              <>
                <p className="font-mono text-2xs tracking-widest mb-6" style={{ color: 'var(--ghost)' }}>
                  {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                </p>

                <ul className="space-y-0">
                  {results.map((result, i) => (
                    <motion.li
                      key={result.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.18 }}
                    >
                      <Link
                        to={`/entries/${result.id}`}
                        className="block py-6 border-b group transition-colors duration-150"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="font-mono text-2xs tracking-widest mb-2" style={{ color: 'var(--ghost)' }}>
                          {formatArchivalDate(result.created_at)}
                        </div>
                        <h3
                          className="font-display text-xl font-light mb-2 group-hover:opacity-80 transition-opacity"
                          style={{ color: 'var(--paper)' }}
                        >
                          {result.title || <span style={{ fontStyle: 'italic', color: 'var(--ghost)' }}>Untitled</span>}
                        </h3>
                        {result.excerpt && (
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: 'var(--ghost)' }}
                            dangerouslySetInnerHTML={{
                              __html: highlightQuery(result.excerpt, query),
                            }}
                          />
                        )}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        )}

        {!hasSearched && !query && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 text-center"
          >
            <p className="font-display text-2xl italic mb-3" style={{ color: 'var(--ghost)' }}>
              What are you looking for?
            </p>
            <p className="font-mono text-xs leading-loose" style={{ color: 'var(--border-2)' }}>
              Search by word, phrase, name, or fragment.
              <br />
              The archive searches across all titles and text.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark style="background:rgba(139,115,85,0.3);color:var(--parchment);padding:0 2px">$1</mark>'
  );
}
