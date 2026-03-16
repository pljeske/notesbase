import {useEffect, useRef, useState} from 'react';
import {usePageStore} from '../stores/pageStore';
import {pagesApi} from '../api/pages';
import type {PageTreeNode} from '../types/page';
import {
  pageToMarkdown,
  pageToHtml,
  pageToJson,
  allPagesToMarkdown,
  allPagesToHtml,
  allPagesToJson,
  downloadFile,
  slugify,
} from '../utils/exportContent';

type Format = 'markdown' | 'html' | 'json';
type Mode = 'page' | 'all';

interface ExportDialogProps {
  mode: Mode;
  onClose: () => void;
}

function flattenTree(nodes: PageTreeNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...flattenTree(n.children)]);
}

const FORMAT_OPTIONS: {value: Format; label: string; ext: string}[] = [
  {value: 'markdown', label: 'Markdown', ext: '.md'},
  {value: 'html', label: 'HTML', ext: '.html'},
  {value: 'json', label: 'JSON', ext: '.json'},
];

const MIME: Record<Format, string> = {
  markdown: 'text/markdown',
  html: 'text/html',
  json: 'application/json',
};

export function ExportDialog({mode, onClose}: ExportDialogProps) {
  const {activePage, tree} = usePageStore();
  const [format, setFormat] = useState<Format>('markdown');
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleExport = async () => {
    const ext = FORMAT_OPTIONS.find((f) => f.value === format)!.ext;

    if (mode === 'page' && activePage) {
      const title = activePage.title || 'Untitled';
      const tags = activePage.tags ?? [];
      const content = activePage.content;
      const icon = activePage.icon;
      let text: string;
      if (format === 'markdown') text = pageToMarkdown(title, content, tags);
      else if (format === 'html') text = pageToHtml(title, content, tags);
      else text = pageToJson(title, content, tags, icon);
      downloadFile(text, `${slugify(title)}${ext}`, MIME[format]);
      onClose();
      return;
    }

    // All pages mode
    setLoading(true);
    try {
      const ids = flattenTree(tree);
      const pages = await Promise.all(ids.map((id) => pagesApi.getById(id)));
      const data = pages.map((p) => ({
        title: p.title || 'Untitled',
        content: p.content,
        tags: p.tags ?? [],
        icon: p.icon,
      }));

      let text: string;
      if (format === 'markdown') text = allPagesToMarkdown(data);
      else if (format === 'html') text = allPagesToHtml(data);
      else text = allPagesToJson(data);
      downloadFile(text, `notesbase-export${ext}`, MIME[format]);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const pageCount = mode === 'all' ? flattenTree(tree).length : 1;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-80 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Export</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {mode === 'page'
            ? `Exporting "${activePage?.title || 'Untitled'}"`
            : `Exporting all ${pageCount} page${pageCount !== 1 ? 's' : ''}`}
        </p>

        <div className="flex gap-2 mb-5">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                format === opt.value
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Preparing…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
