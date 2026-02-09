import {mergeAttributes, Node} from '@tiptap/core';
import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';

function PdfBlockView({node}: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const filename = (node.attrs.filename as string) || 'document.pdf';
  const filesize = (node.attrs.filesize as number) || 0;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <NodeViewWrapper>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="pdf-block"
        contentEditable={false}
      >
        <div className="pdf-icon">PDF</div>
        <div className="pdf-info">
          <div className="pdf-filename">{filename}</div>
          <div className="pdf-size">{formatSize(filesize)}</div>
        </div>
      </a>
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
