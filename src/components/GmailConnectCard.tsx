import React, { useState } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  LogOut,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface GmailConnectCardProps {
  connectedEmail?: string;
  isTokenExpired?: boolean;
  onRefreshProfile: () => void;
  onOpenSettingsModal?: () => void;
  compact?: boolean;
}

export const GmailConnectCard: React.FC<GmailConnectCardProps> = ({
  connectedEmail,
  isTokenExpired,
  onRefreshProfile,
  onOpenSettingsModal,
  compact = false,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoInputOpen, setDemoInputOpen] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');

  // Handle OAuth code flow (full-page redirect - no popup, no window.opener, no postMessage)
  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();

      if (!data.configured) {
        // If GOOGLE_CLIENT_ID not set, offer modal or test connection
        setError(data.error || 'Google OAuth credentials not configured in server environment.');
        setDemoInputOpen(true);
        setIsConnecting(false);
        return;
      }

      // Full-page redirect (no popup, no window.opener, no postMessage)
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Failed to initiate Gmail OAuth:', err);
      setError(err.message || 'Failed to start Google authorization.');
      setIsConnecting(false);
    }
  };

  // Disconnect & Revoke token
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/disconnect-gmail', { method: 'POST' });
      if (res.ok) {
        onRefreshProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect account.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Simulated / Test connect for local testing
  const handleDemoConnect = async () => {
    if (!demoEmail.trim()) return;
    setIsConnecting(true);
    try {
      const res = await fetch('/api/auth/google/demo-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail.trim() }),
      });
      if (res.ok) {
        setDemoInputOpen(false);
        setDemoEmail('');
        onRefreshProfile();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect test email.');
    } finally {
      setIsConnecting(false);
    }
  };

  // STATE 1: Connected & Active
  if (connectedEmail && !isTokenExpired) {
    return (
      <div
        className={`rounded-2xl border transition-all ${
          compact
            ? 'p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'p-4 sm:p-5 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 shadow-2xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                  Sending as: <strong className="font-mono text-emerald-950 dark:text-emerald-100">{connectedEmail}</strong>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                  GMAIL AUTHORIZED
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                Emails are sent directly from your connected address via official Gmail API.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect / Switch account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STATE 2: Token Missing or Expired
  if (connectedEmail && isTokenExpired) {
    return (
      <div className="rounded-2xl border border-amber-300 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/40 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Gmail Connection Expired or Revoked
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Session for <strong>{connectedEmail}</strong> has expired. Please re-authorize to continue sending in-app emails.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs cursor-pointer shrink-0 self-end sm:self-auto"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Opening Google...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reconnect Gmail</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: Not Connected
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Connect Your Gmail Account
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                OAuth 2.0 · gmail.send only
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Send tailored job applications directly from your own Gmail account. You can choose any Gmail address (personal or professional). We never ask for or store passwords.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 text-rose-400" />
                <span>Connect Gmail</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error or Missing Credentials Warning */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Google Cloud OAuth Credentials Not Set</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {error} To connect live via Google Cloud, add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your <code>.env</code> file.
          </p>
          {!demoInputOpen && (
            <button
              type="button"
              onClick={() => setDemoInputOpen(true)}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 underline cursor-pointer"
            >
              Or enter any Gmail address for instant local testing
            </button>
          )}
        </div>
      )}

      {/* Demo Input Fallback */}
      {demoInputOpen && (
        <div className="mt-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2.5">
          <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
            Instant Test Connection (Simulated Sender Address):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              placeholder="e.g. yourname.dev@gmail.com"
              className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleDemoConnect}
              disabled={isConnecting || !demoEmail.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              Set Active Sender
            </button>
            <button
              type="button"
              onClick={() => setDemoInputOpen(false)}
              className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
