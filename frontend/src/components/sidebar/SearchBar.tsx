import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {MagnifyingGlass, X} from '@phosphor-icons/react';
import {pagesApi} from '../../api/pages';
import {PageIcon} from '../../utils/icons';
import type {SearchResult} from '../../types/page';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    const myId = ++requestIdRef.current;
    if (!trimmed) return;
    const timer = setTimeout(() => {
      if (requestIdRef.current !== myId) return;
      setLoading(true);
      pagesApi.search(trimmed)
        .then((r) => { if (requestIdRef.current === myId) { setResults(r); setActiveIndex(-1); } })
        .catch(() => { if (requestIdRef.current === myId) setResults([]); })
        .finally(() => { if (requestIdRef.current === myId) setLoading(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: string) => {
    navigate(`/page/${id}`);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative px-2 pb-2">
      <div className={`flex items-center gap-1.5 h-7 px-2 rounded border text-xs transition-colors ${
        open ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-100 hover:bg-gray-200'
      }`}>
        <MagnifyingGlass size={12} weight="bold" className="text-gray-400 shrink-0"/>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pages..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X size={10} weight="bold"/>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-2 right-2 top-full z-50 mt-0.5 bg-white border border-gray-200 rounded shadow-md overflow-hidden">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No results</div>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(r.id); }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      i === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="shrink-0 text-gray-400">
                      <PageIcon icon={r.icon} color={r.icon_color} size={13} weight="light"/>
                    </span>
                    <span className="truncate text-gray-700">{r.title || 'Untitled'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
