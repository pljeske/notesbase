import {mergeAttributes, Node} from '@tiptap/core';
import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import {useEffect, useRef, useState} from 'react';
import {fetchAuthBlob} from '../../api/fetchFile';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {src: string; alt?: string; title?: string}) => ReturnType;
    };
  }
}

function AuthImageView({node, updateAttributes, selected}: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || '';
  const title = (node.attrs.title as string) || '';
  const width = (node.attrs.width as string | null) ?? '100%';

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [liveWidth, setLiveWidth] = useState(width);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setLiveWidth(width);
  }, [width]);

  // Clean up any active resize listeners when the component unmounts.
  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!src) return;
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      return;
    }
    fetchAuthBlob(src)
      .then(setBlobUrl)
      .catch(() => setError(true));
  }, [src]);

  const startResize = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const container = containerRef.current;
    if (!container) return;

    const parentWidth = container.parentElement?.offsetWidth ?? container.offsetWidth;
    const startWidthPx = container.offsetWidth;

    setResizing(true);

    const onMouseMove = (ev: MouseEvent) => {
      const delta = side === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const clamped = Math.max(80, Math.min(parentWidth, startWidthPx + delta));
      setLiveWidth(`${Math.round((clamped / parentWidth) * 100)}%`);
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      resizeCleanupRef.current = null;
    };

    const onMouseUp = (ev: MouseEvent) => {
      const delta = side === 'right' ? ev.clientX - startX : startX - ev.clientX;
      const clamped = Math.max(80, Math.min(parentWidth, startWidthPx + delta));
      const final = `${Math.round((clamped / parentWidth) * 100)}%`;
      setLiveWidth(final);
      updateAttributes({width: final});
      setResizing(false);
      cleanup();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    resizeCleanupRef.current = cleanup;
  };

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="auth-image-error" contentEditable={false}>
          Failed to load image
        </div>
      </NodeViewWrapper>
    );
  }

  if (!blobUrl) {
    return (
      <NodeViewWrapper>
        <div className="auth-image-loading" contentEditable={false}>
          Loading...
        </div>
      </NodeViewWrapper>
    );
  }

  const showHandles = selected || resizing;

  return (
    <NodeViewWrapper>
      <div className="image-resize-wrapper" contentEditable={false}>
        <div
          ref={containerRef}
          className={`image-resize-container${showHandles ? ' image-selected' : ''}`}
          style={{width: liveWidth}}
        >
          <img src={blobUrl} alt={alt} title={title}/>
          {showHandles && (
            <>
              <div
                className="resize-handle resize-handle-left"
                onMouseDown={(e) => startResize(e, 'left')}
              />
              <div
                className="resize-handle resize-handle-right"
                onMouseDown={(e) => startResize(e, 'right')}
              />
              {resizing && (
                <div className="resize-tooltip">{liveWidth}</div>
              )}
            </>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const AuthImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {default: null},
      alt: {default: null},
      title: {default: null},
      width: {default: null},
    };
  },

  parseHTML() {
    return [{tag: 'img[src]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AuthImageView);
  },

  addCommands() {
    return {
      setImage:
        (options: {src: string; alt?: string; title?: string}) =>
        ({commands}) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
