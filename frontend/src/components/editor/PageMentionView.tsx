import type {NodeViewProps} from '@tiptap/react';
import {NodeViewWrapper} from '@tiptap/react';
import {useNavigate} from 'react-router-dom';

export function PageMentionView({node}: NodeViewProps) {
  const navigate = useNavigate();
  const {id, title} = node.attrs as { id: string; title: string };

  return (
    <NodeViewWrapper as="span" className="page-mention-wrapper">
      <span
        className="page-mention"
        data-page-mention={id}
        onClick={() => navigate(`/page/${id}`)}
        title={`Go to: ${title}`}
      >
        [[{title}]]
      </span>
    </NodeViewWrapper>
  );
}
