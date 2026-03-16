import {useEffect, useState} from 'react';
import {adminApi, type AdminUser, type AdminSettings} from '../../api/admin';
import {useAuthStore} from '../../stores/authStore';

export function AdminPanel() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, settingsData] = await Promise.all([
        adminApi.listUsers(),
        adminApi.getSettings(),
      ]);
      setUsers(usersData);
      setSettings(settingsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(user: AdminUser, newRole: string) {
    setActionError(null);
    try {
      await adminApi.updateUserRole(user.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? {...u, role: newRole} : u)),
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update role');
    }
  }

  async function handleToggleDisabled(user: AdminUser) {
    setActionError(null);
    try {
      await adminApi.setUserDisabled(user.id, !user.disabled);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? {...u, disabled: !u.disabled} : u,
        ),
      );
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Failed to update user',
      );
    }
  }

  async function handleToggleRegistration() {
    if (!settings) return;
    setActionError(null);
    try {
      const updated = await adminApi.updateSettings({
        registration_enabled: !settings.registration_enabled,
      });
      setSettings(updated);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Failed to update settings',
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Admin Panel</h1>

      {actionError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {actionError}
        </div>
      )}

      {/* App Settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Settings
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm text-gray-700">User registration</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Allow new users to create accounts
              </p>
            </div>
            <button
              onClick={handleToggleRegistration}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                settings?.registration_enabled ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  settings?.registration_enabled
                    ? 'translate-x-4'
                    : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* User Management */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Users ({users.length})
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">
                  User
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">
                  Role
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">
                  Status
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">
                  Joined
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <tr
                    key={user.id}
                    className={user.disabled ? 'opacity-50' : ''}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {user.name}
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-gray-400">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        disabled={isSelf}
                        onChange={(e) => handleRoleChange(user, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          user.disabled
                            ? 'bg-red-50 text-red-600'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {user.disabled ? 'disabled' : 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleDisabled(user)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {user.disabled ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
