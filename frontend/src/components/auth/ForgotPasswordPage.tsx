import {useState} from 'react';
import {Link} from 'react-router-dom';
import {authApi} from '../../api/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {submitted ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Check your email</h1>
              <p className="text-sm text-gray-500 mb-6">
                If <span className="font-medium text-gray-700">{email}</span> is registered, you'll
                receive a reset link within a few minutes.
              </p>
              <Link
                to="/login"
                className="block text-center w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot your password?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

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

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link to="/login" className="font-medium text-gray-900 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
