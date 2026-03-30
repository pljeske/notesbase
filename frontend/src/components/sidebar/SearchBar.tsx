import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {MagnifyingGlassIcon, XIcon} from '@phosphor-icons/react';
import {pagesApi} from '../../api/pages';
import {PageIcon} from '../../utils/icons';
import type {SearchResult} from '../../types/page';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const trimmed = query.trim();
    const myId = ++requestIdRef.current;
    if (!trimmed) return;
    const timer = setTimeout(() => {
      if (requestIdRef.current !== myId) return;
      setLoading(true);
      setSearchError(false);
      pagesApi.search(trimmed)
        .then((r) => {
          if (requestIdRef.current === myId) {
            setResults(r);
            setActiveIndex(-1);
          }
        })
        .catch(() => {
          if (requestIdRef.current === myId) {
            setResults([]);
            setSearchError(true);
          }
        })
        .finally(() => {
          if (requestIdRef.current === myId) setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

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
    <div ref={containerRef} className="relative px-2 pb-1.5">
      <div className={`nb-search-wrap${open ? ' nb-focused' : ''}`}>
        <MagnifyingGlassIcon size={11} weight="bold" className="nb-search-icon shrink-0"/>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search pages…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="nb-search-input"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="nb-search-clear shrink-0"
          >
            <XIcon size={10} weight="bold"/>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 nb-search-dropdown">
          {loading ? (
            <div className="nb-search-meta">Searching…</div>
          ) : searchError ? (
            <div className="nb-search-meta nb-error">Search failed. Try again.</div>
          ) : results.length === 0 ? (
            <div className="nb-search-meta">No results</div>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(r.id);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`nb-search-result${i === activeIndex ? ' nb-active' : ''}`}
                  >
                    <span className="nb-search-result-icon shrink-0">
                      <PageIcon icon={r.icon} color={r.icon_color} size={13} weight="light"/>
                    </span>
                    <span className="nb-search-result-text">{r.title || 'Untitled'}</span>
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
