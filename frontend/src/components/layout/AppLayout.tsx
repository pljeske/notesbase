import {Link, Outlet} from 'react-router-dom';
import {Sidebar} from '../sidebar/Sidebar';
import {usePageStore} from '../../stores/pageStore';
import {useAuthStore} from '../../stores/authStore';

export function AppLayout() {
  const saveStatus = usePageStore((s) => s.saveStatus);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex h-screen" style={{background: 'var(--content-bg)'}}>
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-9 flex items-center justify-between px-4 shrink-0 nb-content-header">
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="nb-save-status" style={{color: '#a3b3a0'}}>Saving…</span>
            )}
            {saveStatus === 'saved' && (
              <span className="nb-save-status" style={{color: '#6ba07a'}}>Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="nb-save-status" style={{color: '#f87171'}}>Save failed</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="nb-header-user">{user.name}</span>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="nb-header-action">
                Admin
              </Link>
            )}
            <button onClick={logout} className="nb-header-action">
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
