import {useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {authApi} from '../../api/auth';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#f8f6f1'}}>
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/favicon/favicon.svg" alt="" className="w-6 h-6"/>
            <span className="nb-brand" style={{color: '#1a1d18'}}>notesbase</span>
          </div>
          <div className="bg-white rounded-2xl p-8 text-center border"
               style={{borderColor: 'rgba(0,0,0,0.06)'}}>
            <h1 className="nb-serif-heading text-3xl mb-2">Invalid link</h1>
            <p className="text-sm text-gray-500 mb-6">This reset link is missing or malformed.</p>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-gray-900 hover:underline"
            >
              Request a new one
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', {state: {message: 'Password updated. You can now sign in.'}});
    } catch {
      setError('This link is invalid or has expired. Please request a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: '#f8f6f1'}}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src="/favicon/favicon.svg" alt="" className="w-6 h-6"/>
          <span className="nb-brand" style={{color: '#1a1d18'}}>notesbase</span>
        </div>
        <div className="bg-white rounded-2xl p-8 border" style={{borderColor: 'rgba(0,0,0,0.06)'}}>
          <h1 className="nb-serif-heading text-3xl mb-2">Set new password</h1>
          <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}{' '}
              {error.includes('expired') && (
                <Link to="/forgot-password" className="underline font-medium">
                  Request a new link.
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
                placeholder="Repeat your new password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
