import {BubbleMenu} from '@tiptap/react/menus';
import type {Editor} from '@tiptap/react';
import type {EditorState} from '@tiptap/pm/state';
import type {EditorView} from '@tiptap/pm/view';
import {CodeIcon, LinkIcon, TextBIcon, TextItalicIcon, TextStrikethroughIcon, TextUnderlineIcon} from '@phosphor-icons/react';
import {useCallback, useRef, useState} from 'react';

interface FormattingToolbarProps {
  editor: Editor;
}

export function FormattingToolbar({editor}: FormattingToolbarProps) {
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const openLinkMode = useCallback(() => {
    const existingHref = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(existingHref ?? '');
    setLinkMode(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({href: linkUrl.trim()}).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkMode(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const cancelLink = useCallback(() => {
    setLinkMode(false);
    setLinkUrl('');
    editor.chain().focus().run();
  }, [editor]);

  const removeLink = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setLinkMode(false);
    setLinkUrl('');
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      options={{placement: 'top'}}
      shouldShow={({editor, state}: {editor: Editor; element: HTMLElement; view: EditorView; state: EditorState; from: number; to: number}) => {
        const {from, to} = state.selection;
        if (from === to) return false;
        return !editor.isActive('codeBlock') && !editor.isActive('image');
      }}
    >
      <div className="formatting-toolbar">
        {linkMode ? (
          <>
            <input
              ref={inputRef}
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="formatting-toolbar-link-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyLink();
                if (e.key === 'Escape') cancelLink();
              }}
            />
            <button className="formatting-toolbar-btn formatting-toolbar-link-apply" onClick={applyLink}>
              Apply
            </button>
            {editor.isActive('link') && (
              <button className="formatting-toolbar-btn formatting-toolbar-link-remove" onClick={removeLink}>
                Remove
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className={`formatting-toolbar-btn${editor.isActive('bold') ? ' active' : ''}`}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold (Ctrl+B)"
            >
              <TextBIcon size={14} weight="bold"/>
            </button>
            <button
              className={`formatting-toolbar-btn${editor.isActive('italic') ? ' active' : ''}`}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic (Ctrl+I)"
            >
              <TextItalicIcon size={14} weight="bold"/>
            </button>
            <button
              className={`formatting-toolbar-btn${editor.isActive('underline') ? ' active' : ''}`}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline (Ctrl+U)"
            >
              <TextUnderlineIcon size={14} weight="bold"/>
            </button>
            <button
              className={`formatting-toolbar-btn${editor.isActive('strike') ? ' active' : ''}`}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
            >
              <TextStrikethroughIcon size={14} weight="bold"/>
            </button>
            <div className="formatting-toolbar-divider"/>
            <button
              className={`formatting-toolbar-btn${editor.isActive('code') ? ' active' : ''}`}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Inline code"
            >
              <CodeIcon size={14} weight="bold"/>
            </button>
            <button
              className={`formatting-toolbar-btn${editor.isActive('link') ? ' active' : ''}`}
              onClick={openLinkMode}
              title="Link"
            >
              <LinkIcon size={14} weight="bold"/>
            </button>
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
