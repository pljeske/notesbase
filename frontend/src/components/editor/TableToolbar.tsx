import {BubbleMenu} from '@tiptap/react/menus';
import type {Editor} from '@tiptap/core';
import {ColumnsPlusRightIcon, RowsPlusBottomIcon, TrashSimpleIcon} from '@phosphor-icons/react';

interface TableToolbarProps {
  editor: Editor;
}

export function TableToolbar({editor}: TableToolbarProps) {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({editor: e}) => e.isActive('table')}
      options={{placement: 'top'}}
    >
      <div className="table-toolbar">
        <button
          className="table-toolbar-btn"
          title="Add row below"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <RowsPlusBottomIcon size={14}/>
          <span>Row</span>
        </button>
        <button
          className="table-toolbar-btn table-toolbar-btn-danger"
          title="Delete current row"
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <TrashSimpleIcon size={14}/>
          <span>Row</span>
        </button>

        <div className="formatting-toolbar-divider"/>

        <button
          className="table-toolbar-btn"
          title="Add column to the right"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <ColumnsPlusRightIcon size={14}/>
          <span>Col</span>
        </button>
        <button
          className="table-toolbar-btn table-toolbar-btn-danger"
          title="Delete current column"
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <TrashSimpleIcon size={14}/>
          <span>Col</span>
        </button>

        <div className="formatting-toolbar-divider"/>

        <button
          className="table-toolbar-btn table-toolbar-btn-toggle"
          title="Toggle header row"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          <span>Header</span>
        </button>

        <div className="formatting-toolbar-divider"/>

        <button
          className="table-toolbar-btn table-toolbar-btn-danger"
          title="Delete entire table"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <TrashSimpleIcon size={14}/>
          <span>Table</span>
        </button>
      </div>
    </BubbleMenu>
  );
}
