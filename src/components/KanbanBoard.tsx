import React, { useState } from 'react';
import {
  Download,
  Plus,
  Calendar,
  Clock,
  Mail,
  Building2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Edit3,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { TrackerApplication, KanbanStatus } from '../../shared/types';

interface KanbanBoardProps {
  applications: TrackerApplication[];
  onUpdateApplication: (app: TrackerApplication) => void;
  onDeleteApplication: (id: string) => void;
  onRefresh: () => void;
}

const COLUMNS: Array<{ status: KanbanStatus; label: string; color: string }> = [
  { status: 'Saved', label: 'Saved', color: 'border-slate-300 dark:border-slate-700' },
  { status: 'Applied', label: 'Applied', color: 'border-blue-400 dark:border-blue-600' },
  { status: 'Follow-up due', label: 'Follow-up Due', color: 'border-amber-400 dark:border-amber-600' },
  { status: 'Interview', label: 'Interviewing', color: 'border-purple-400 dark:border-purple-600' },
  { status: 'Offer', label: 'Offer Received', color: 'border-emerald-400 dark:border-emerald-600' },
  { status: 'Rejected', label: 'Archived / Rejected', color: 'border-rose-300 dark:border-rose-800' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onUpdateApplication,
  onDeleteApplication,
  onRefresh,
}) => {
  const [selectedApp, setSelectedApp] = useState<TrackerApplication | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newStatus, setNewStatus] = useState<KanbanStatus>('Saved');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const isFollowUpDueSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const dueDate = new Date(dateStr).getTime();
    const now = Date.now();
    return dueDate <= now + 24 * 60 * 60 * 1000; // past or within 24 hours
  };

  const handleCreateManualApp = () => {
    if (!newTitle.trim() || !newCompany.trim()) return;

    const newApp: TrackerApplication = {
      id: crypto.randomUUID(),
      userId: 'default-user-01',
      jobTitle: newTitle.trim(),
      companyName: newCompany.trim(),
      status: newStatus,
      contactEmail: newEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
      appliedDate: newStatus === 'Applied' ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onUpdateApplication(newApp);
    setNewTitle('');
    setNewCompany('');
    setNewEmail('');
    setNewNotes('');
    setIsNewModalOpen(false);
  };

  const handleExportCsv = () => {
    window.open('/api/tracker/export-csv', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Tracker Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Application Tracker (Kanban)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage interview pipelines, follow-up alerts, and sent email records
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {COLUMNS.map((col) => {
          const colApps = applications.filter((a) => a.status === col.status);

          return (
            <div
              key={col.status}
              className="flex flex-col rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 p-3 min-h-[500px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {col.label}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center">
                    {colApps.length}
                  </span>
                </div>
              </div>

              {/* Cards list */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colApps.map((app) => {
                  const followUpAlert =
                    app.status === 'Follow-up due' ||
                    (app.status === 'Applied' && isFollowUpDueSoon(app.followUpDueDate));

                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-2xs transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {app.jobTitle}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span>{app.companyName}</span>
                          </p>
                        </div>
                        {app.matchScore !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                              app.matchScore >= 80
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {app.matchScore}%
                          </span>
                        )}
                      </div>

                      {/* Reminder Badge */}
                      {followUpAlert && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Follow-up Due: {app.followUpDueDate || 'Now'}</span>
                        </div>
                      )}

                      {/* Card meta */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <span>{app.contactEmail ? app.contactEmail.split('@')[0] : 'No email'}</span>
                        <span>{new Date(app.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* View & Edit Application Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400">
                  Application Details
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedApp.jobTitle} at {selectedApp.companyName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status Stage:
                </label>
                <select
                  value={selectedApp.status}
                  onChange={(e) => {
                    const updated = { ...selectedApp, status: e.target.value as KanbanStatus };
                    setSelectedApp(updated);
                    onUpdateApplication(updated);
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Applied Date</label>
                  <input
                    type="date"
                    value={selectedApp.appliedDate ? selectedApp.appliedDate.split('T')[0] : ''}
                    onChange={(e) => {
                      const updated = { ...selectedApp, appliedDate: e.target.value };
                      setSelectedApp(updated);
                      onUpdateApplication(updated);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Follow-Up Due</label>
                  <input
                    type="date"
                    value={selectedApp.followUpDueDate || ''}
                    onChange={(e) => {
                      const updated = { ...selectedApp, followUpDueDate: e.target.value };
                      setSelectedApp(updated);
                      onUpdateApplication(updated);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Contact Recruiter Email</label>
                <input
                  type="email"
                  value={selectedApp.contactEmail || ''}
                  onChange={(e) => {
                    const updated = { ...selectedApp, contactEmail: e.target.value };
                    setSelectedApp(updated);
                    onUpdateApplication(updated);
                  }}
                  placeholder="recruiter@company.com"
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Notes & Next Actions</label>
                <textarea
                  rows={3}
                  value={selectedApp.notes || ''}
                  onChange={(e) => {
                    const updated = { ...selectedApp, notes: e.target.value };
                    setSelectedApp(updated);
                    onUpdateApplication(updated);
                  }}
                  placeholder="Notes from initial interview or outreach..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {selectedApp.sentEmailBody && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    Archived Sent Email Draft:
                  </span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {selectedApp.sentEmailSubject}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedApp.sentEmailBody}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onDeleteApplication(selectedApp.id);
                  setSelectedApp(null);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Card</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-indigo-600 rounded-lg cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Application Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Add New Application</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Stripe, Linear, etc."
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Stage</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as KanbanStatus)}
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {COLUMNS.map((c) => (
                  <option key={c.status} value={c.status}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <textarea
                rows={2}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any personal context..."
                className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateManualApp}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Create Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
