import type {Editor, Range} from '@tiptap/core';
import {Node} from '@tiptap/core';
import {PluginKey} from '@tiptap/pm/state';
import {ReactNodeViewRenderer, ReactRenderer} from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy, {type Instance} from 'tippy.js';
import {pagesApi} from '../../api/pages';
import {usePageStore} from '../../stores/pageStore';
import type {PageMentionItem} from './PageMentionList';
import {PageMentionList} from './PageMentionList';
import {PageMentionView} from './PageMentionView';

const pageMentionPluginKey = new PluginKey('pageMentionSuggestion');

const suggestionOptions = {
  char: '[[',
  allowSpaces: true,

  items: async ({query}: { query: string }): Promise<PageMentionItem[]> => {
    if (query.length >= 1) {
      try {
        const results = await pagesApi.search(query);
        return results.map((r) => ({id: r.id, title: r.title || 'Untitled'}));
      } catch {
        return [];
      }
    }
    // Empty query: return first 8 pages from tree (flattened)
    const tree = usePageStore.getState().tree;
    const flat: PageMentionItem[] = [];
    const walk = (nodes: typeof tree) => {
      for (const n of nodes) {
        flat.push({id: n.id, title: n.title || 'Untitled'});
        if (n.children.length) walk(n.children);
      }
    };
    walk(tree);
    return flat.slice(0, 8);
  },

  command: ({editor, range, props}: { editor: Editor; range: Range; props: PageMentionItem }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({type: 'pageMention', attrs: {id: props.id, title: props.title}})
      .run();
  },

  render: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let component: ReactRenderer<any, any>;
    let popup: Instance[];

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onStart: (props: any) => {
        component = new ReactRenderer(PageMentionList, {
          props,
          editor: props.editor as Editor,
        });

        if (!props.clientRect) return;

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate: (props: any) => {
        component?.updateProps(props);
        if (popup?.[0] && props.clientRect) {
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        }
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (component?.ref as any)?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};

export const PageMention = Node.create({
  name: 'pageMention',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {default: null},
      title: {default: ''},
    };
  },

  parseHTML() {
    return [{tag: 'span[data-page-mention]'}];
  },

  renderHTML({node}) {
    return [
      'span',
      {'data-page-mention': node.attrs.id as string, class: 'page-mention'},
      `[[${node.attrs.title as string}]]`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageMentionView);
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: pageMentionPluginKey,
        ...suggestionOptions,
      }),
    ];
  },
});
