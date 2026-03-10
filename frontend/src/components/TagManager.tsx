import {useState} from 'react';
import {useTagStore} from '../stores/tagStore';
import {TAG_COLORS} from '../types/tag';

interface TagManagerProps {
  onClose: () => void;
}

export function TagManager({onClose}: TagManagerProps) {
  const {tags, createTag, updateTag, deleteTag} = useTagStore();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createTag({name: newName.trim(), color: newColor});
    setNewName('');
  };

  const startEdit = (id: string, name: string, color: string) => {
    setEditingId(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    await updateTag(editingId, {name: editName.trim() || undefined, color: editColor});
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-96 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Manage Tags</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        {/* Create new tag */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
            placeholder="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                className={`w-5 h-5 rounded-full ${newColor === c ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
                style={{backgroundColor: c}}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <button
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleCreate}
          >
            Add
          </button>
        </div>

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50">
              {editingId === tag.id ? (
                <>
                  <div className="flex gap-1">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-4 h-4 rounded-full ${editColor === c ? 'ring-2 ring-offset-1 ring-gray-500' : ''}`}
                        style={{backgroundColor: c}}
                        onClick={() => setEditColor(c)}
                      />
                    ))}
                  </div>
                  <input
                    className="flex-1 border border-gray-300 rounded px-1 py-0.5 text-sm focus:outline-none"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                    autoFocus
                  />
                  <button className="text-xs text-blue-600 hover:text-blue-800" onClick={handleUpdate}>Save</button>
                  <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: tag.color}}/>
                  <span className="flex-1 text-sm text-gray-700">{tag.name}</span>
                  <button
                    className="text-xs text-gray-400 hover:text-gray-600"
                    onClick={() => startEdit(tag.id, tag.name, tag.color)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-red-400 hover:text-red-600"
                    onClick={() => deleteTag(tag.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
