import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';

export interface PageMentionItem {
  id: string;
  title: string;
}

interface Props {
  items: PageMentionItem[];
  command: (item: PageMentionItem) => void;
}

export const PageMentionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  Props
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSelectedIndex(0), 0);
    return () => clearTimeout(timeout);
  }, [props.items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const selectedEl = container.querySelector<HTMLButtonElement>(
      `button[data-mention-index="${selectedIndex}"]`
    );
    if (!selectedEl) return;

    selectedEl.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }, [selectedIndex, props.items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = props.items[index];
      if (item) props.command(item);
    },
    [props]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({event}: { event: KeyboardEvent }) => {
      if (props.items.length === 0) return false;

      if (event.key === 'ArrowUp') {
        setSelectedIndex(
          (i) => (i + props.items.length - 1) % props.items.length
        );
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-64">
        <div className="px-3 py-2 text-sm text-gray-400">No pages found</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-1 w-64 max-h-80 overflow-y-auto"
    >
      {props.items.map((item, index) => (
        <button
          key={item.id}
          data-mention-index={index}
          className={`flex items-center gap-3 w-full px-3 py-2 text-left rounded text-sm transition-colors ${
            index === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
          onClick={() => selectItem(index)}
        >
          <div className="min-w-0">
            <div className="font-medium text-gray-900">{item.title}</div>
          </div>
        </button>
      ))}
    </div>
  );
});

PageMentionList.displayName = 'PageMentionList';
