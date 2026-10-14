import React, { useState } from 'react';
import {
  X,
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  ExternalLink,
  Shield,
  Loader2,
  RotateCcw,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { GmailConnectCard } from './GmailConnectCard';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  subject: string;
  body: string;
  connectedEmail?: string;
  isTokenExpired?: boolean;
  onRefreshProfile: () => void;
  resumeFileName?: string;
  applicationId?: string;
  onSuccess: (messageId: string) => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  recipientEmail,
  subject,
  body,
  connectedEmail,
  isTokenExpired,
  onRefreshProfile,
  resumeFileName,
  applicationId,
  onSuccess,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleOpenInGmailCompose = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSendViaApi = async (ignoreDuplicate: boolean = false) => {
    if (!connectedEmail) {
      setError('Please connect your Gmail account before sending.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          subject,
          body,
          forceIgnoreDuplicate: ignoreDuplicate,
          applicationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.isDuplicateWarning) {
          setDuplicateWarning(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to dispatch email.');
      }

      onSuccess(data.messageId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Review & Send Email</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirmation preview · Sender is always your connected Gmail
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300">
          {/* Connected Sender Status Card */}
          <GmailConnectCard
            connectedEmail={connectedEmail}
            isTokenExpired={isTokenExpired}
            onRefreshProfile={onRefreshProfile}
            compact
          />

          {/* Fallback Option A: Open in Gmail */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">Alternative: Open in Web Gmail</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pre-populates a draft in a new tab if you prefer reviewing directly inside Gmail.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenInGmailCompose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Gmail</span>
            </button>
          </div>

          {/* Full Outbound Email Preview Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-800 space-y-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From (Sender):</span>
              <p className="font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {connectedEmail ? `${connectedEmail} (via Gmail API)` : 'No Gmail account connected yet'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To (Recipient):</span>
              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                {recipientEmail || '(No recipient email provided)'}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject:</span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{subject}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Message Content:</span>
              <div className="mt-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed border border-slate-100 dark:border-slate-800">
                {body}
              </div>
            </div>

            {resumeFileName && (
              <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700">
                <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                <span>Referencing candidate resume: <strong>{resumeFileName}</strong></span>
              </div>
            )}
          </div>

          {/* Duplicate Warning Prompt */}
          {duplicateWarning && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Duplicate Outreach Safeguard</span>
              </div>
              <p className="text-[11px] leading-relaxed">{duplicateWarning}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSendViaApi(true)}
                  disabled={isSending}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
                >
                  Send Again Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {(error.includes('EXPIRED') || error.includes('token') || isTokenExpired) && (
                <div className="pt-1">
                  <p className="text-[11px] text-amber-900 dark:text-amber-200 mb-2">
                    Your Gmail authorization has expired or was revoked. Please reconnect below:
                  </p>
                  <GmailConnectCard
                    connectedEmail={connectedEmail}
                    isTokenExpired={true}
                    onRefreshProfile={onRefreshProfile}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* Explicit User Confirmation */}
          <div className="border border-indigo-200 dark:border-indigo-900 rounded-xl p-4 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasConfirmed}
                onChange={(e) => setHasConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
              <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                I have reviewed the email draft and recipient address, and explicitly authorize JobMatch AI to dispatch this email from{' '}
                <strong className="underline">{connectedEmail || 'my Gmail account'}</strong>.
              </span>
            </label>

            <button
              type="button"
              onClick={() => handleSendViaApi(false)}
              disabled={isSending || !hasConfirmed || !recipientEmail || !connectedEmail || isTokenExpired}
              className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching via Gmail API...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send Application Email</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
