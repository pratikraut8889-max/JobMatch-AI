import React from 'react';
import { X, ShieldCheck, Lock, Trash2, Cpu } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Privacy & Data Governance</h3>
              <p className="text-xs text-slate-500">Zero-persistence design principles</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">100% In-Memory Processing</h4>
              <p className="text-slate-500 mt-0.5">
                Uploaded resumes and job descriptions are held strictly in temporary RAM during analysis. They are never written to any disk, file system, or database.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">No Password or Credential Storage</h4>
              <p className="text-slate-500 mt-0.5">
                We never prompt for or store user passwords. When opening Gmail compose, the pre-filled link is generated directly in your browser.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Session Ephemerality</h4>
              <p className="text-slate-500 mt-0.5">
                Closing or refreshing your browser tab clears all session data immediately. Your private contact details and career history remain completely yours.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
