import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  FolderGit2,
  Kanban,
  FileSearch,
  Settings,
  Mail,
  AlertTriangle,
  User,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  activeView: 'analyze' | 'resumes' | 'tracker';
  onViewChange: (view: 'analyze' | 'resumes' | 'tracker') => void;
  onLoadSample: () => void;
  onReset: () => void;
  hasResults: boolean;
  resumeCount: number;
  trackerCount: number;
  onOpenPrivacyModal: () => void;
  onOpenOAuthModal: () => void;
  onOpenSettings: () => void;
  connectedEmail?: string;
  isTokenExpired?: boolean;
  currentUser?: { id: string; email: string; name: string; picture?: string } | null;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  onLoadSample,
  onReset,
  hasResults,
  resumeCount,
  trackerCount,
  onOpenPrivacyModal,
  onOpenOAuthModal,
  onOpenSettings,
  connectedEmail,
  isTokenExpired,
  currentUser,
  isAuthenticated,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onViewChange('analyze');
              if (hasResults) onReset();
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>JobMatch AI</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
              v2.0
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => onViewChange('analyze')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'analyze'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Analyze Role</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('resumes')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'resumes'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Resumes ({resumeCount}/3)</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('tracker')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'tracker'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Tracker ({trackerCount})</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrivacyModal}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Privacy</span>
          </button>
        </nav>

        {/* Zone 3: Actions, Gmail Status & Settings */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Gmail Sending As Status Pill */}
          {connectedEmail && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${
                isTokenExpired
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100'
                  : 'border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100'
              }`}
              title="Click to manage Gmail connection in Settings"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isTokenExpired ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span className="truncate max-w-[140px] font-mono">
                {isTokenExpired ? 'Reconnect Gmail' : `Sending as: ${connectedEmail}`}
              </span>
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Settings (Gmail Connection & Preferences)"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Sign-In or Profile Badge */}
          {isAuthenticated && currentUser ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden md:inline font-medium max-w-[120px] truncate">
                {currentUser.name}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <a
              href="/api/auth/login"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              title="Sign in with your Google Account"
            >
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Sign In</span>
            </a>
          )}

          {/* Quick Sample Action */}
          {activeView === 'analyze' && !hasResults && (
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Load Sample Data</span>
              <span className="sm:hidden">Sample</span>
            </button>
          )}

          {hasResults && activeView === 'analyze' && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Analysis</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
