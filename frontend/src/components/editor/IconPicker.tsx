import {useEffect, useMemo, useRef, useState} from 'react';
import {ICON_REGISTRY} from '../../utils/icons';

interface IconPickerProps {
  currentIcon: string | null;
  onSelect: (icon: string | null) => void;
  onClose: () => void;
}

export function IconPicker({currentIcon, onSelect, onClose}: IconPickerProps) {
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_REGISTRY;
    const q = search.toLowerCase();
    return ICON_REGISTRY.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof ICON_REGISTRY> = {};
    for (const entry of filtered) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return groups;
  }, [filtered]);

  return (
    <div
      ref={containerRef}
      className="absolute z-50 top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col"
      style={{maxHeight: '360px'}}
    >
      <div className="p-2 border-b border-gray-100">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-md outline-none focus:border-gray-400 bg-gray-50"
        />
      </div>

      <div className="overflow-y-auto flex-1 p-2">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No icons found</p>
        ) : (
          Object.entries(grouped).map(([category, icons]) => (
            <div key={category} className="mb-3">
              {(!search.trim() || Object.keys(grouped).length > 1) && (
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                  {category}
                </p>
              )}
              <div className="grid grid-cols-8 gap-0.5">
                {icons.map((entry) => {
                  const IconComp = entry.component;
                  return (
                    <button
                      key={entry.name}
                      title={entry.label}
                      onClick={() => {
                        onSelect(entry.name);
                        onClose();
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${
                        currentIcon === entry.name ? 'bg-gray-100 ring-1 ring-gray-300' : ''
                      }`}
                    >
                      <IconComp size={16} weight="light"/>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {currentIcon && (
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-1.5 hover:bg-gray-50 rounded transition-colors"
          >
            Remove icon
          </button>
        </div>
      )}
    </div>
  );
}
