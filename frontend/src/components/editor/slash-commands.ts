import type {Editor, Range} from '@tiptap/core';
import {uploadFile} from '../../api/upload';
import {usePageStore} from '../../stores/pageStore';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  searchTerms: string[];
  command: (props: { editor: Editor; range: Range }) => void;
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      resolve(input.files?.[0] ?? null);
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export const slashCommands: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    searchTerms: ['h1', 'heading', 'title', 'large'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).setNode('heading', {level: 1}).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    searchTerms: ['h2', 'heading', 'subtitle', 'medium'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).setNode('heading', {level: 2}).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    searchTerms: ['h3', 'heading', 'small'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).setNode('heading', {level: 3}).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '\u2022',
    searchTerms: ['bullet', 'unordered', 'list', 'ul'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    searchTerms: ['numbered', 'ordered', 'list', 'ol'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Block quote',
    icon: '\u201C',
    searchTerms: ['quote', 'blockquote'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Code with syntax highlighting',
    icon: '</>',
    searchTerms: ['code', 'codeblock', 'pre'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: '---',
    searchTerms: ['divider', 'hr', 'rule', 'separator', 'line'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Text',
    description: 'Plain text paragraph',
    icon: 'Aa',
    searchTerms: ['text', 'paragraph', 'plain', 'p'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Image',
    description: 'Upload an image',
    icon: '\uD83D\uDDBC',
    searchTerms: ['image', 'picture', 'photo', 'img', 'upload'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).run();

      const pageId = usePageStore.getState().activePage?.id;
      if (!pageId) return;

      pickFile('image/jpeg,image/png,image/gif,image/webp,image/svg+xml').then(async (file) => {
        if (!file) return;
        try {
          const result = await uploadFile(file, pageId);
          editor.chain().focus().setImage({src: result.url, alt: result.filename}).run();
        } catch (err) {
          console.error('Image upload failed:', err);
        }
      });
    },
  },
  {
    title: 'PDF',
    description: 'Upload a PDF document',
    icon: '\uD83D\uDCC4',
    searchTerms: ['pdf', 'document', 'file', 'upload'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).run();

      const pageId = usePageStore.getState().activePage?.id;
      if (!pageId) return;

      pickFile('.pdf,application/pdf').then(async (file) => {
        if (!file) return;
        try {
          const result = await uploadFile(file, pageId);
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'pdfBlock',
              attrs: {
                src: result.url,
                filename: result.filename,
                filesize: result.size,
              },
            })
            .run();
        } catch (err) {
          console.error('PDF upload failed:', err);
        }
      });
    },
  },
  {
    title: 'Info',
    description: 'Informational callout block',
    icon: '\u2139\uFE0F',
    searchTerms: ['info', 'callout', 'admonition', 'note', 'information'],
    command: ({editor, range}) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({type: 'callout', attrs: {type: 'info'}, content: [{type: 'paragraph'}]})
        .run();
    },
  },
  {
    title: 'Warning',
    description: 'Warning callout block',
    icon: '\u26A0\uFE0F',
    searchTerms: ['warning', 'callout', 'admonition', 'caution', 'alert'],
    command: ({editor, range}) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({type: 'callout', attrs: {type: 'warning'}, content: [{type: 'paragraph'}]})
        .run();
    },
  },
  {
    title: 'Tip',
    description: 'Tip callout block',
    icon: '\uD83D\uDCA1',
    searchTerms: ['tip', 'callout', 'admonition', 'hint', 'suggestion'],
    command: ({editor, range}) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({type: 'callout', attrs: {type: 'tip'}, content: [{type: 'paragraph'}]})
        .run();
    },
  },
  {
    title: 'File',
    description: 'Upload any file as a download',
    icon: '\uD83D\uDCCE',
    searchTerms: ['file', 'attachment', 'upload', 'download', 'zip', 'doc', 'docx', 'xlsx'],
    command: ({editor, range}) => {
      editor.chain().focus().deleteRange(range).run();

      const pageId = usePageStore.getState().activePage?.id;
      if (!pageId) return;

      pickFile('').then(async (file) => {
        if (!file) return;
        try {
          const result = await uploadFile(file, pageId);
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'fileBlock',
              attrs: {
                src: result.url,
                filename: result.filename,
                filesize: result.size,
              },
            })
            .run();
        } catch (err) {
          console.error('File upload failed:', err);
        }
      });
    },
  },
];
