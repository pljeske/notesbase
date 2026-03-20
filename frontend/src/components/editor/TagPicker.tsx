import {useEffect, useRef, useState} from 'react';
import {useTagStore} from '../../stores/tagStore';
import {usePageStore} from '../../stores/pageStore';
import type {Tag} from '../../types/tag';
import {TAG_COLORS} from '../../types/tag';

const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

interface TagPickerProps {
  pageId: string;
  selectedTags: Tag[];
}

export function TagPicker({pageId, selectedTags}: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {tags, fetchTags, createTag} = useTagStore();
  const {updatePage} = usePageStore();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selectedIds = new Set(selectedTags.map((t) => t.id));

  const handleToggle = async (tagId: string) => {
    const newIds = selectedIds.has(tagId)
      ? [...selectedIds].filter((id) => id !== tagId)
      : [...selectedIds, tagId];
    await updatePage(pageId, {tag_ids: newIds});
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const tag = await createTag({name: newName.trim(), color: getRandomColor()});
    setNewName('');
    await updatePage(pageId, {tag_ids: [...selectedIds, tag.id]});
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        onClick={() => setIsOpen((o) => !o)}
      >
        {selectedTags.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {selectedTags.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                style={{backgroundColor: t.color}}
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">+ Add tags</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-8 z-50 bg-white border border-gray-200 rounded shadow-lg p-2 w-56">
          <div className="flex gap-1 mb-2">
            <input
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
              placeholder="New tag name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={handleCreate}
            >
              Create
            </button>
          </div>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {tags.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-2 px-1 py-1 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(tag.id)}
                  onChange={() => handleToggle(tag.id)}
                  className="w-3 h-3"
                />
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: tag.color}}/>
                <span className="text-xs text-gray-700">{tag.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
