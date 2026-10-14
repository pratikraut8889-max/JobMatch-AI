import React from 'react';
import { Shield, Check, Info } from 'lucide-react';

interface ConsentBannerProps {
  onConsent: () => void;
  onOpenPrivacyModal: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  onConsent,
  onOpenPrivacyModal,
}) => {
  return (
    <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Data Processing & Privacy Consent
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              JobMatch AI analyzes your resumes and job descriptions using Google Gemini. Resumes are processed in-memory and only saved if you explicitly store a version. We never train public models on your private documents or share your data with advertisers (compliant with GDPR & DPDP Act).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={onOpenPrivacyModal}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Read Privacy Terms
          </button>
          <button
            type="button"
            onClick={onConsent}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>I Agree & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
