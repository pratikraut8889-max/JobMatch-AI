import React from 'react';
import { X, Settings, Mail, KeyRound, ExternalLink, ShieldCheck, Sun, Moon } from 'lucide-react';
import { GmailConnectCard } from './GmailConnectCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedEmail?: string;
  isTokenExpired?: boolean;
  onRefreshProfile: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenOAuthInstructions: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  connectedEmail,
  isTokenExpired,
  onRefreshProfile,
  darkMode,
  onToggleDarkMode,
  onOpenOAuthInstructions,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Application Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gmail authorization & appearance preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-slate-300">
          {/* Section 1: Gmail Account Connection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">
                Gmail Dispatch Account
              </h4>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                gmail.send only
              </span>
            </div>

            <GmailConnectCard
              connectedEmail={connectedEmail}
              isTokenExpired={isTokenExpired}
              onRefreshProfile={onRefreshProfile}
            />

            {/* Technical Security & OAuth Details */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1.5 text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>OAuth Security & Account Rules:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>
                  <strong>Scope restricted:</strong> Grants only <code>https://www.googleapis.com/auth/gmail.send</code>. We cannot read your inbox or delete emails.
                </li>
                <li>
                  <strong>Account chooser enabled:</strong> <code>prompt=select_account</code> lets you pick any Gmail account, even one different from your primary sign-in.
                </li>
                <li>
                  <strong>Encrypted at rest:</strong> Refresh tokens are encrypted with AES-256-GCM on the server. Your Gmail password is never requested or stored.
                </li>
                <li>
                  <strong>Token revocation:</strong> Clicking &quot;Disconnect / Switch account&quot; immediately revokes the OAuth token on Google servers.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 2: Appearance & Theme */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">
              Interface Appearance
            </h4>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Dark / Light Mode</p>
                <p className="text-[11px] text-slate-500">Toggle high-contrast theme</p>
              </div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Google Cloud OAuth Guides */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 font-mono">
              Google Cloud Console & Test Users
            </h4>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">OAuth Setup & Test Users Guide</p>
                <p className="text-[11px] text-slate-500">How to add redirect URIs and test users in Google Cloud Console</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOAuthInstructions();
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline cursor-pointer"
              >
                View Setup Guide
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
