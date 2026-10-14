import React, { useState } from 'react';
import {
  Mail,
  CheckCircle2,
  FolderGit2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
  Settings,
} from 'lucide-react';
import { GmailConnectCard } from './GmailConnectCard';

interface OnboardingFlowProps {
  connectedEmail?: string;
  isTokenExpired?: boolean;
  onRefreshProfile: () => void;
  hasResume: boolean;
  onOpenResumeModal: () => void;
  onOpenSettings: () => void;
  onLoadSample: () => void;
  onDismiss?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  connectedEmail,
  isTokenExpired,
  onRefreshProfile,
  hasResume,
  onOpenResumeModal,
  onOpenSettings,
  onLoadSample,
  onDismiss,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const isStep1Done = !!connectedEmail && !isTokenExpired;
  const isStep2Done = hasResume;

  return (
    <div className="mb-8 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/70 to-white dark:from-indigo-950/30 dark:to-slate-900 p-5 sm:p-6 shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-indigo-100 dark:border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-indigo-600 text-white font-mono">
              Quick Onboarding · Step 1
            </span>
            <span className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              OAuth 2.0 (gmail.send only)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-1.5">
            Get Ready to Send Tailored Outreach in 3 Quick Steps
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed max-w-2xl">
            Connect your Gmail account to enable in-app outreach from your personal or professional email address.
            You can always modify or switch this in <strong>Settings</strong> at any time.
          </p>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={() => {
              setIsDismissed(true);
              onDismiss();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            title="Dismiss onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stepper Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
        {/* Step 1: Connect Gmail */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isStep1Done
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
              : 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800/80 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                isStep1Done
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {isStep1Done ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-500" />
                <span>Connect Gmail</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isStep1Done ? `Sending as: ${connectedEmail}` : 'Select your sending Gmail'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Upload / Select Resume */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            isStep2Done
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                isStep2Done
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isStep2Done ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Add Target Resume</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isStep2Done ? 'Resume version active' : 'Upload PDF/DOCX or paste text'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Match Role & Outreach */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Analyze & Dispatch</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Research company & review email draft
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 Interactive Component: Connect Gmail Card */}
      <div className="mt-2">
        <GmailConnectCard
          connectedEmail={connectedEmail}
          isTokenExpired={isTokenExpired}
          onRefreshProfile={onRefreshProfile}
          onOpenSettingsModal={onOpenSettings}
        />
      </div>

      {/* Onboarding Footer Actions */}
      <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Google account chooser (<code className="text-[11px]">prompt=select_account</code>) lets you pick any Gmail address. Passwords are never stored.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isStep2Done && (
            <button
              type="button"
              onClick={onOpenResumeModal}
              className="px-3 py-1.5 font-semibold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
            >
              Step 2: Add Resume →
            </button>
          )}
          <button
            type="button"
            onClick={onLoadSample}
            className="px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Or try with sample data
          </button>
        </div>
      </div>
    </div>
  );
};
