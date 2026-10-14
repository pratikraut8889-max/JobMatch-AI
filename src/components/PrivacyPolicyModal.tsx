import React, { useState } from 'react';
import { X, ShieldCheck, Trash2, AlertTriangle, Check, Lock, Database, Globe } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataDeleted: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onDataDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'terms' | 'manage'>('policy');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/privacy/delete-my-data', { method: 'DELETE' });
      if (res.ok) {
        setDeleteSuccess(true);
        onDataDeleted();
        setTimeout(() => {
          setDeleteSuccess(false);
          setConfirmDelete(false);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to delete data:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Privacy, Compliance & Data Governance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GDPR & India Digital Personal Data Protection (DPDP) Act alignment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`pb-2.5 font-semibold border-b-2 cursor-pointer ${
              activeTab === 'policy'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 font-semibold border-b-2 cursor-pointer ${
              activeTab === 'terms'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Terms & Disclaimers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`pb-2.5 font-semibold border-b-2 cursor-pointer ${
              activeTab === 'manage'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Data Control & Deletion
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {activeTab === 'policy' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">1. Information We Collect & Process</h4>
                <p>
                  JobMatch AI processes candidate resumes, portfolio links, and job descriptions exclusively to calculate match alignment, research hiring companies, discover recruiter contact patterns, and generate tailored outreach emails.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">2. AI Model Processing (Google Gemini)</h4>
                <p>
                  Resume and job posting data are transmitted via encrypted TLS to the Google Gemini API. Content processed through Google Cloud enterprise APIs is not used to train foundation models or shared with third parties.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">3. Retention & Storage Policy</h4>
                <p>
                  Uploaded resume files are processed in transient server memory and immediately purged. Saved resume versions (up to 3) and application tracking cards remain in your private session store until you delete them.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mandatory AI Output Disclaimer</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Artificial intelligence models can generate incorrect information, hallucinated contacts, or inaccurate company details. <strong>You must review all generated email bodies, recipient addresses, and company facts before sending any message.</strong> JobMatch AI bears no liability for bounced emails or rejected job applications.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Zero Password Storage Guarantee</h4>
                <p>
                  We will never ask for or store your Google or email account password. All Gmail sending occurs through Google OAuth 2.0 with strictly scoped permissions (<code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">gmail.send</code>).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              <div className="border border-rose-200 dark:border-rose-900 rounded-xl p-4 bg-rose-50/60 dark:bg-rose-950/30 space-y-2">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Right to Erasure ("Delete My Data")</span>
                </h4>
                <p className="text-[11px] text-rose-800 dark:text-rose-300">
                  Under GDPR Article 17 and DPDP Section 12, you have the absolute right to wipe all stored resumes, application records, analysis history, and encrypted OAuth tokens permanently from the server.
                </p>

                {deleteSuccess ? (
                  <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-center">
                    All personal data successfully erased!
                  </div>
                ) : !confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="mt-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                  >
                    Request Complete Data Deletion
                  </button>
                ) : (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-rose-300 dark:border-rose-800 space-y-2 mt-2">
                    <p className="font-bold text-rose-900 dark:text-rose-200 text-xs">
                      Are you sure? This action is permanent and cannot be undone.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAllData}
                        disabled={isDeleting}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                      >
                        {isDeleting ? 'Erasing...' : 'Yes, Delete Everything'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
