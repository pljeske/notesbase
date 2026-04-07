import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';

export function WelcomePage() {
  const navigate = useNavigate();
  const createPage = usePageStore((s) => s.createPage);
  const tree = usePageStore((s) => s.tree);

  useEffect(() => {
    if (tree.length > 0) {
      navigate(`/page/${tree[0].id}`, {replace: true});
    }
  }, [tree, navigate]);

  const handleCreate = async () => {
    const page = await createPage(null);
    navigate(`/page/${page.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <h2 className="nb-serif-heading text-4xl mb-3">Welcome to notesbase</h2>
      <p className="text-gray-400 mb-8 max-w-sm text-sm leading-relaxed">
        Your personal space for notes and ideas.
        Create your first page to get started.
      </p>
      <button
        onClick={handleCreate}
        className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 active:scale-[0.98] transition-all"
      >
        Create a page
      </button>
    </div>
  );
}
