import {Link, Outlet} from 'react-router-dom';
import {Sidebar} from '../sidebar/Sidebar';
import {usePageStore} from '../../stores/pageStore';
import {useAuthStore} from '../../stores/authStore';
import {LockSimpleIcon, LockSimpleOpenIcon} from '@phosphor-icons/react';
import {useState} from 'react';

export function AppLayout() {
  const saveStatus = usePageStore((s) => s.saveStatus);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const encryptionKey = useAuthStore((s) => s.encryptionKey);
  const lockEncryption = useAuthStore((s) => s.lockEncryption);
  const unlockEncryption = useAuthStore((s) => s.unlockEncryption);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockWorking, setUnlockWorking] = useState(false);

  const handleUnlockSubmit = async () => {
    if (!unlockPassword) return;
    setUnlockWorking(true);
    setUnlockError(null);
    try {
      await unlockEncryption(unlockPassword);
      setShowUnlockModal(false);
      setUnlockPassword('');
    } catch {
      setUnlockError('Incorrect password. Please try again.');
    } finally {
      setUnlockWorking(false);
    }
  };

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
            <button
              onClick={encryptionKey ? lockEncryption : () => setShowUnlockModal(true)}
              className="nb-header-action flex items-center gap-1"
              title={encryptionKey ? 'Lock encrypted pages' : 'Unlock encrypted pages'}
            >
              {encryptionKey
                ? <LockSimpleOpenIcon size={13} weight="light"/>
                : <LockSimpleIcon size={13} weight="light"/>
              }
            </button>
            <button onClick={logout} className="nb-header-action">
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet/>
        </main>
      </div>

      {showUnlockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background: 'rgba(0,0,0,0.35)'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUnlockModal(false);
              setUnlockPassword('');
              setUnlockError(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{background: '#f3f4f6'}}
              >
                <LockSimpleIcon size={17} weight="fill" style={{color: '#374151'}}/>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Unlock encrypted pages</h2>
                <p className="text-xs text-gray-500">Enter your account password to decrypt.</p>
              </div>
            </div>
            <input
              type="password"
              placeholder="Account password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleUnlockSubmit();
              }}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 mb-3"
              style={{fontFamily: 'inherit'}}
            />
            {unlockError && (
              <p className="text-xs text-red-500 mb-3">{unlockError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockPassword('');
                  setUnlockError(null);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                style={{fontFamily: 'inherit'}}
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockSubmit}
                disabled={!unlockPassword || unlockWorking}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: unlockPassword && !unlockWorking ? '#1a1d18' : '#e5e7eb',
                  color: unlockPassword && !unlockWorking ? '#fff' : '#9ca3af',
                  cursor: unlockPassword && !unlockWorking ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {unlockWorking ? 'Unlocking…' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
