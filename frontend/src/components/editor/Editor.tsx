import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { SlashCommand } from './SlashCommand';
import type { JSONContent } from '../../types/page';
import './editor.css';

interface EditorProps {
  content: JSONContent | null;
  onUpdate: (content: JSONContent) => void;
  pageTitle: string;
  onTitleChange: (title: string) => void;
}

export function Editor({ content, onUpdate, pageTitle, onTitleChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
      }),
      SlashCommand,
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON() as JSONContent);
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentJSON = JSON.stringify(editor.getJSON());
      const newJSON = JSON.stringify(content);
      if (currentJSON !== newJSON) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <div className="editor-wrapper max-w-3xl mx-auto py-12 px-8">
      <input
        className="text-4xl font-bold w-full outline-none border-none bg-transparent mb-4 text-gray-900 placeholder-gray-300"
        value={pageTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled"
      />
      <EditorContent editor={editor} className="prose prose-lg max-w-none" />
    </div>
  );
}
