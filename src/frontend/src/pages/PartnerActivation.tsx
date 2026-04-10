import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export const PartnerActivationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const token = useMemo(() => tokenFromUrl.trim(), [tokenFromUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Activation token is missing or invalid.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const msg = await authService.completePartnerActivation({ token, password });
      setMessage(msg);
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-surface border border-surfaceHighlight rounded-xl p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-text">Activate Partner Account</h1>
          <p className="text-sm text-textMuted mt-2">Set your password to complete account activation.</p>
        </div>

        {error && <div className="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>}
        {message && <div className="p-3 rounded-lg text-sm bg-green-500/10 border border-green-500/20 text-green-400">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-surfaceHighlight text-text focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-surfaceHighlight text-text focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primaryHover text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Activating...' : 'Activate Account'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link to="/login" className="text-primary hover:text-primaryHover">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
