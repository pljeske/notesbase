import {useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {authApi} from '../../api/auth';
import {useAuthStore} from '../../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const {login, isLoading, error, setError} = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  useEffect(() => {
    authApi.getConfig().then((cfg) => setRegistrationEnabled(cfg.registration_enabled)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({email, password});
      navigate('/');
    } catch {
      // Error is set in the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {registrationEnabled && (
            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-medium text-gray-900 hover:underline">
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
