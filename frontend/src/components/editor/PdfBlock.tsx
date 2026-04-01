import {mergeAttributes, Node} from '@tiptap/core';
import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import {fetchAuthBlob} from '../../api/fetchFile';
import type {MouseEvent} from 'react';
import {useEffect, useState} from 'react';

function PdfBlockView({node}: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const filename = (node.attrs.filename as string) || 'document.pdf';
  const filesize = (node.attrs.filesize as number) || 0;
  const [expanded, setExpanded] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!expanded || blobUrl) return;
    fetchAuthBlob(src)
      .then(url => setBlobUrl(url))
      .catch(err => console.error('Failed to load PDF:', err));
  }, [expanded, blobUrl, src]);

  const handleOpen = (e: MouseEvent) => {
    e.preventDefault();
    if (blobUrl) {
      window.open(blobUrl, '_blank');
      return;
    }
    fetchAuthBlob(src)
      .then(url => window.open(url, '_blank'))
      .catch(err => console.error('Failed to open PDF:', err));
  };

  return (
    <NodeViewWrapper>
      <div className={`pdf-block${expanded ? ' pdf-block--expanded' : ''}`} contentEditable={false}>
        <div className="pdf-block-header">
          <div className="pdf-icon">PDF</div>
          <div className="pdf-info">
            <div className="pdf-filename">{filename}</div>
            <div className="pdf-size">{formatSize(filesize)}</div>
          </div>
          <div className="pdf-actions">
            <button
              className="pdf-action-btn"
              onClick={() => setExpanded(v => !v)}
              title={expanded ? 'Collapse' : 'View inline'}
            >
              {expanded ? '▲' : '▼'}
            </button>
            <button
              className="pdf-action-btn"
              onClick={handleOpen}
              title="Open in new tab"
            >
              ↗
            </button>
          </div>
        </div>
        {expanded && (
          <div className="pdf-viewer">
            {!blobUrl && <div className="pdf-loading">Loading…</div>}
            {blobUrl && <iframe src={blobUrl} className="pdf-iframe" title={filename}/>}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const PdfBlock = Node.create({
  name: 'pdfBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {default: null},
      filename: {default: 'document.pdf'},
      filesize: {default: 0},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pdf-block"]',
      },
    ];
  },

  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes({'data-type': 'pdf-block'}, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfBlockView);
  },
});
