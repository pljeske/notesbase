import {mergeAttributes, Node} from '@tiptap/core';
import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import type {MouseEvent} from 'react';
import {fetchAuthBlob} from '../../api/fetchFile';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return 'FILE';
  return parts.pop()!.toUpperCase().slice(0, 5);
}

function FileBlockView({node}: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const filename = (node.attrs.filename as string) || 'file';
  const filesize = (node.attrs.filesize as number) || 0;

  const handleDownload = async (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      const blobUrl = await fetchAuthBlob(src);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <NodeViewWrapper>
      <a
        href="#"
        onClick={handleDownload}
        className="file-block"
        contentEditable={false}
      >
        <div className="file-icon">{fileExt(filename)}</div>
        <div className="file-info">
          <div className="file-filename">{filename}</div>
          <div className="file-size">{formatSize(filesize)}</div>
        </div>
        <div className="file-download-icon">↓</div>
      </a>
    </NodeViewWrapper>
  );
}

export const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {default: null},
      filename: {default: 'file'},
      filesize: {default: 0},
    };
  },

  parseHTML() {
    return [{tag: 'div[data-type="file-block"]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes({'data-type': 'file-block'}, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileBlockView);
  },
});
