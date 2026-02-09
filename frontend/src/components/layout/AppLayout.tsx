import {Outlet} from 'react-router-dom';
import {Sidebar} from '../sidebar/Sidebar';
import {usePageStore} from '../../stores/pageStore';

export function AppLayout() {
  const saveStatus = usePageStore((s) => s.saveStatus);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar/>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-10 flex items-center justify-end px-4 border-b border-gray-100 shrink-0">
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-500">Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Save failed</span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
