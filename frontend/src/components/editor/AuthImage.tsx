import {mergeAttributes, Node} from '@tiptap/core';
import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import {useEffect, useState} from 'react';
import {fetchAuthBlob} from '../../api/fetchFile';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {src: string; alt?: string; title?: string}) => ReturnType;
    };
  }
}

function AuthImageView({node}: ReactNodeViewProps) {
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) || '';
  const title = (node.attrs.title as string) || '';
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    // If it's already a blob/data URL, use directly
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setBlobUrl(src);
      return;
    }

    fetchAuthBlob(src)
      .then(setBlobUrl)
      .catch(() => setError(true));
  }, [src]);

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

  return (
    <NodeViewWrapper>
      <img src={blobUrl} alt={alt} title={title} contentEditable={false}/>
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
