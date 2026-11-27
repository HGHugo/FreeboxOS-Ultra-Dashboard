import React, { useEffect, useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

/**
 * SECURITY: dashboard password gate.
 * Nothing in <App/> (API calls, WebSocket) runs until the server confirms a
 * valid dashboard session cookie.
 */
export const DashboardGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<'loading' | 'locked' | 'unlocked'>('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard-auth/status', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setState(d?.result?.authenticated ? 'unlocked' : 'locked'))
      .catch(() => setState('locked'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/dashboard-auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const d = await r.json();
      if (r.ok && d?.success) {
        setPassword('');
        setState('unlocked');
      } else {
        setError(d?.error?.message || 'Connexion refusée');
      }
    } catch {
      setError('Serveur injoignable');
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'unlocked') return <>{children}</>;

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-[#151515] border border-gray-800 rounded-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Freebox Dashboard</h1>
            <p className="text-xs text-gray-500">Mot de passe du dashboard requis</p>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="w-full px-3 py-2 rounded-lg bg-[#0a0a0a] border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Au premier démarrage, un mot de passe est généré et affiché dans les logs du serveur.
          Vous pouvez le remplacer avec la variable <code>DASHBOARD_PASSWORD</code>.
        </p>
      </form>
    </div>
  );
};
