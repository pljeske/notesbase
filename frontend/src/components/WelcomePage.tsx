import {useNavigate} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';

export function WelcomePage() {
  const navigate = useNavigate();
  const createPage = usePageStore((s) => s.createPage);

  const handleCreate = async () => {
    const page = await createPage(null);
    navigate(`/page/${page.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Notes</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        Create pages and organize them in a tree structure.
        Use slash commands like /h1, /bullet, /quote to format your content.
      </p>
      <button
        onClick={handleCreate}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
      >
        Create your first page
      </button>
    </div>
  );
}
