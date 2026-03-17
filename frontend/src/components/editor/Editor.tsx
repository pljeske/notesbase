import {EditorContent, ReactNodeViewRenderer, useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {createLowlight, common} from 'lowlight';
import {AuthImage} from './AuthImage';
import {useEffect, useRef, useState} from 'react';
import {SlashCommand} from './SlashCommand';
import {PdfBlock} from './PdfBlock';
import {FileBlock} from './FileBlock';
import {CodeBlockView} from './CodeBlockView';
import {IconPicker} from './IconPicker';
import {PageIcon} from '../../utils/icons';
import type {JSONContent} from '../../types/page';
import {uploadFile} from '../../api/upload';
import 'highlight.js/styles/github-dark.css';
import './editor.css';

const lowlight = createLowlight(common);
const CodeBlockWithLanguage = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({lowlight, defaultLanguage: null});

interface EditorProps {
  content: JSONContent | null;
  onUpdate: (content: JSONContent) => void;
  pageTitle: string;
  onTitleChange: (title: string) => void;
  pageId: string;
  pageIcon: string | null;
  pageIconColor: string | null;
  onIconChange: (icon: string | null) => void;
  onIconColorChange: (color: string | null) => void;
}

export function Editor({content, onUpdate, pageTitle, onTitleChange, pageId, pageIcon, pageIconColor, onIconChange, onIconColorChange}: EditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const iconButtonRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({codeBlock: false}),
      CodeBlockWithLanguage,
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
      }),
      AuthImage,
      PdfBlock,
      FileBlock,
      SlashCommand,
    ],
    content: content ?? undefined,
    onUpdate: ({editor}) => {
      onUpdate(editor.getJSON() as JSONContent);
    },
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files.length) {
          return false;
        }

        const files = Array.from(event.dataTransfer.files);
        const pos = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;

        for (const file of files) {
          const isImage = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf';
          const insertPos = pos ?? view.state.doc.content.size;

          uploadFile(file, pageId)
            .then((result) => {
              let node;
              if (isImage) {
                node = view.state.schema.nodes.image.create({
                  src: result.url,
                  alt: result.filename,
                });
              } else if (isPdf) {
                node = view.state.schema.nodes.pdfBlock.create({
                  src: result.url,
                  filename: result.filename,
                  filesize: result.size,
                });
              } else {
                node = view.state.schema.nodes.fileBlock.create({
                  src: result.url,
                  filename: result.filename,
                  filesize: result.size,
                });
              }
              view.dispatch(view.state.tr.insert(insertPos, node));
            })
            .catch((err) => {
              console.error('Upload failed:', err);
            });
        }

        return true;
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));

        if (!imageItem) return false;

        const file = imageItem.getAsFile();
        if (!file) return false;

        uploadFile(file, pageId)
          .then((result) => {
            const node = view.state.schema.nodes.image.create({
              src: result.url,
              alt: result.filename,
            });
            const transaction = view.state.tr.replaceSelectionWith(node);
            view.dispatch(transaction);
          })
          .catch((err) => {
            console.error('Upload failed:', err);
          });

        return true;
      },
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
      <div className="group mb-2">
        <div ref={iconButtonRef} className="relative inline-block">
          {pageIcon ? (
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="p-1 -ml-1 rounded hover:bg-gray-100 transition-colors text-gray-700"
              title="Change icon"
            >
              <PageIcon icon={pageIcon} color={pageIconColor} size={48} weight="light"/>
            </button>
          ) : (
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 py-1 px-2 rounded hover:bg-gray-100"
            >
              <span>+</span>
              <span>Add icon</span>
            </button>
          )}
          {pickerOpen && (
            <IconPicker
              currentIcon={pageIcon}
              currentColor={pageIconColor}
              onSelect={onIconChange}
              onColorChange={onIconColorChange}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </div>
      <input
        className="text-4xl font-bold w-full outline-none border-none bg-transparent mb-4 text-gray-900 placeholder-gray-300"
        value={pageTitle}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled"
      />
      <EditorContent editor={editor} className="prose prose-lg max-w-none"/>
    </div>
  );
}
