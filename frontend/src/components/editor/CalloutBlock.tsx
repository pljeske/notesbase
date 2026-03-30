import {mergeAttributes, Node} from '@tiptap/core';
import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer} from '@tiptap/react';
import {InfoIcon, LightbulbIcon, WarningIcon} from '@phosphor-icons/react';

export type CalloutType = 'info' | 'warning' | 'tip';

function CalloutView({node, updateAttributes}: ReactNodeViewProps) {
  const type = ((node.attrs.type as string) || 'info') as CalloutType;

  return (
    <NodeViewWrapper>
      <div className={`callout callout-${type}`}>
        <div className="callout-header" contentEditable={false}>
          <span className="callout-icon">
            {type === 'info' && <InfoIcon size={14} weight="fill"/>}
            {type === 'warning' && <WarningIcon size={14} weight="fill"/>}
            {type === 'tip' && <LightbulbIcon size={14} weight="fill"/>}
          </span>
          <select
            className="callout-type-select"
            value={type}
            onChange={(e) => updateAttributes({type: e.target.value})}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="tip">Tip</option>
          </select>
        </div>
        <NodeViewContent className="callout-content"/>
      </div>
    </NodeViewWrapper>
  );
}

export const CalloutBlock = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-callout-type') ?? 'info',
        renderHTML: (attrs) => ({'data-callout-type': attrs.type as string}),
      },
    };
  },

  parseHTML() {
    return [{tag: 'div[data-callout-type]'}];
  },

  renderHTML({HTMLAttributes}) {
    return ['div', mergeAttributes({'data-type': 'callout'}, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
