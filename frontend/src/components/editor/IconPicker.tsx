import {useEffect, useMemo, useRef, useState} from 'react';
import {ICON_REGISTRY} from '../../utils/icons';

const ICON_COLORS = [
  {name: 'Gray',   value: '#6b7280'},
  {name: 'Red',    value: '#ef4444'},
  {name: 'Orange', value: '#f97316'},
  {name: 'Amber',  value: '#f59e0b'},
  {name: 'Yellow', value: '#eab308'},
  {name: 'Green',  value: '#22c55e'},
  {name: 'Teal',   value: '#14b8a6'},
  {name: 'Blue',   value: '#3b82f6'},
  {name: 'Indigo', value: '#6366f1'},
  {name: 'Purple', value: '#a855f7'},
  {name: 'Pink',   value: '#ec4899'},
  {name: 'Rose',   value: '#f43f5e'},
];

interface IconPickerProps {
  currentIcon: string | null;
  currentColor: string | null;
  onSelect: (icon: string | null) => void;
  onColorChange: (color: string | null) => void;
  onClose: () => void;
}

export function IconPicker({currentIcon, currentColor, onSelect, onColorChange, onClose}: IconPickerProps) {
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
      <div className="p-2 border-b border-gray-100 flex flex-col gap-2">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons..."
          className="w-full text-sm px-2.5 py-1.5 border border-gray-200 rounded-md outline-none focus:border-gray-400 bg-gray-50"
        />
        <div className="flex items-center gap-1">
          <button
            title="Default"
            onClick={() => onColorChange(null)}
            className={`w-5 h-5 rounded-full border-2 bg-gray-400 transition-transform hover:scale-110 ${
              !currentColor ? 'border-gray-600 scale-110' : 'border-transparent'
            }`}
          />
          {ICON_COLORS.map((c) => (
            <button
              key={c.value}
              title={c.name}
              onClick={() => onColorChange(c.value)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                currentColor === c.value ? 'border-gray-600 scale-110' : 'border-transparent'
              }`}
              style={{backgroundColor: c.value}}
            />
          ))}
        </div>
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
                      <IconComp size={16} weight="light" style={currentColor ? {color: currentColor} : undefined}/>
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
