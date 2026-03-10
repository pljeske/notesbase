import type {ReactNodeViewProps} from '@tiptap/react';
import {NodeViewContent, NodeViewWrapper} from '@tiptap/react';

const LANGUAGES = [
  {value: null, label: 'Auto'},
  {value: 'bash', label: 'Bash'},
  {value: 'c', label: 'C'},
  {value: 'cpp', label: 'C++'},
  {value: 'csharp', label: 'C#'},
  {value: 'css', label: 'CSS'},
  {value: 'go', label: 'Go'},
  {value: 'xml', label: 'HTML'},
  {value: 'java', label: 'Java'},
  {value: 'javascript', label: 'JavaScript'},
  {value: 'json', label: 'JSON'},
  {value: 'kotlin', label: 'Kotlin'},
  {value: 'lua', label: 'Lua'},
  {value: 'makefile', label: 'Makefile'},
  {value: 'markdown', label: 'Markdown'},
  {value: 'php', label: 'PHP'},
  {value: 'python', label: 'Python'},
  {value: 'ruby', label: 'Ruby'},
  {value: 'rust', label: 'Rust'},
  {value: 'scala', label: 'Scala'},
  {value: 'sql', label: 'SQL'},
  {value: 'swift', label: 'Swift'},
  {value: 'typescript', label: 'TypeScript'},
  {value: 'yaml', label: 'YAML'},
];

export function CodeBlockView({node, updateAttributes}: ReactNodeViewProps) {
  const language = (node.attrs.language as string | null) ?? null;

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header" contentEditable={false}>
        <select
          className="code-block-language-select"
          value={language ?? ''}
          onChange={(e) => updateAttributes({language: e.target.value || null})}
        >
          {LANGUAGES.map(({value, label}) => (
            <option key={label} value={value ?? ''}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}
