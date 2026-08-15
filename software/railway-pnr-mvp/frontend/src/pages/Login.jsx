import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('staff'); // 'staff' | 'passenger'
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { loginStaff, loginPassenger } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = mode === 'staff' ? await loginStaff(id, password) : await loginPassenger(id, password);
      const home =
        user.role === 'coach_attendant'
          ? 'attendant'
          : user.role === 'linen_operator'
          ? 'linen-ops'
          : user.role === 'railway_officer'
          ? 'railway'
          : user.role;
      navigate(`/${home}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl text-brass-400">PNR Coach Ledger</div>
          <div className="text-xs uppercase tracking-[0.2em] text-rail-400 mt-1">
            Manifest &amp; boarding register — prototype
          </div>
        </div>

        <div className="flex rounded-lg border border-rail-700 overflow-hidden mb-6">
          {['staff', 'passenger'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setId('');
                setPassword('');
                setError('');
              }}
              className={`flex-1 py-2 text-xs uppercase tracking-[0.15em] transition-colors ${
                mode === m ? 'bg-brass-500/20 text-brass-400' : 'text-rail-400 hover:text-rail-200'
              }`}
            >
              {m === 'staff' ? 'Admin / Attendant' : 'Passenger'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-rail-900/60 border border-rail-700/70 rounded-lg p-6">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">
              {mode === 'staff' ? 'Employee ID' : 'Mobile number'}
            </label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={mode === 'staff' ? 'e.g. CA001' : 'e.g. 9812345678'}
              className="w-full bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm text-rail-100 focus:outline-none focus:border-brass-400"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.15em] text-rail-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-rail-950 border border-rail-700 rounded px-3 py-2 text-sm text-rail-100 focus:outline-none focus:border-brass-400"
              required
            />
          </div>
          {error && <div className="text-signal-red text-xs">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded bg-brass-500 text-rail-950 font-medium text-sm hover:bg-brass-400 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[11px] text-rail-500 mt-6">
          Run <code className="pnr-digits text-rail-400">npm run seed</code> in /backend to create demo logins.
        </p>
      </div>
    </div>
  );
}
