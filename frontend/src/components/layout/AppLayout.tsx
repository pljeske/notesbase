import {Link, Outlet} from 'react-router-dom';
import {Sidebar} from '../sidebar/Sidebar';
import {usePageStore} from '../../stores/pageStore';
import {useAuthStore} from '../../stores/authStore';

export function AppLayout() {
  const saveStatus = usePageStore((s) => s.saveStatus);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-10 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-500">Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-500">Save failed</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-gray-500">{user.name}</span>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
