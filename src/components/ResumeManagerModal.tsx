import React, { useState } from 'react';
import {
  X,
  FileUp,
  FileText,
  Trash2,
  Check,
  Plus,
  Loader2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Sparkles,
} from 'lucide-react';
import { SavedResumeVersion, StructuredResume } from '../../shared/types';

interface ResumeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: SavedResumeVersion[];
  selectedResumeId?: string;
  onSelectResume: (id: string) => void;
  onRefreshResumes: () => void;
}

export const ResumeManagerModal: React.FC<ResumeManagerModalProps> = ({
  isOpen,
  onClose,
  resumes,
  selectedResumeId,
  onSelectResume,
  onRefreshResumes,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add'>('manage');
  const [title, setTitle] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [rawText, setRawText] = useState('');
  const [filePayload, setFilePayload] = useState<{ name: string; data: string; mimeType: string; size: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectingResume, setInspectingResume] = useState<SavedResumeVersion | null>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const base64 = result.split(',')[1];
        setFilePayload({
          name: file.name,
          data: base64,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveResume = async () => {
    if (!title.trim()) {
      setError('Please provide a name/label for this resume version (e.g. "Full-Stack Engineer").');
      return;
    }

    if (inputMode === 'upload' && !filePayload) {
      setError('Please upload a resume file (PDF, DOCX, or Image).');
      return;
    }

    if (inputMode === 'text' && !rawText.trim()) {
      setError('Please paste your resume text.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          rawText: inputMode === 'text' ? rawText.trim() : undefined,
          file: inputMode === 'upload' ? filePayload : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save resume version.');

      onRefreshResumes();
      onSelectResume(data.resume.id);
      setTitle('');
      setRawText('');
      setFilePayload(null);
      setActiveTab('manage');
    } catch (err: any) {
      setError(err.message || 'Failed to parse resume.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResume = async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefreshResumes();
        if (selectedResumeId === id && resumes.length > 1) {
          const remaining = resumes.filter((r) => r.id !== id);
          if (remaining[0]) onSelectResume(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete resume:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Resume Manager</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Store up to 3 specialized versions ({resumes.length}/3 saved)
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

        {/* Modal Tab Switcher */}
        <div className="px-6 pt-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('manage');
              setInspectingResume(null);
            }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'manage'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Saved Versions ({resumes.length})
          </button>
          <button
            type="button"
            disabled={resumes.length >= 3}
            onClick={() => {
              setActiveTab('add');
              setInspectingResume(null);
            }}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeTab === 'add'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            + Add New Version
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="space-y-4">
              {resumes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No saved resumes yet</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Upload a resume to auto-parse its skills and experience</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('add')}
                    className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                  >
                    Add Your First Resume
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((r) => {
                    const isSelected = selectedResumeId === r.id;
                    const struct = r.structuredData;

                    return (
                      <div
                        key={r.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {r.title}
                              </h4>
                              {isSelected && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px]">
                              {struct.name || 'Candidate'} · {struct.skills.length} skills · {struct.experience.length} roles listed
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setInspectingResume(inspectingResume?.id === r.id ? null : r)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50"
                            >
                              {inspectingResume?.id === r.id ? 'Hide Details' : 'View Breakdown'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectResume(r.id)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Use for Analysis'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteResume(r.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="Delete version"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Detailed breakdown drawer */}
                        {inspectingResume?.id === r.id && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block mb-1">
                                Top Skills Parsed:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {struct.skills.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider block mb-1">
                                Work History:
                              </span>
                              <div className="space-y-1.5">
                                {struct.experience.map((exp, idx) => (
                                  <div key={idx} className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                                    <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                                      {exp.title} at {exp.company} ({exp.dates})
                                    </p>
                                    <ul className="list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {exp.achievements.slice(0, 2).map((ach, aIdx) => (
                                        <li key={aIdx} className="truncate">{ach}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resume Label / Track:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Full-Stack Track, AI Engineer, Backend Focus"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Input mode selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    inputMode === 'upload'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Upload File (PDF / DOCX)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    inputMode === 'text'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {inputMode === 'upload' ? (
                <div
                  onClick={() => document.getElementById('new-resume-upload')?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <input
                    id="new-resume-upload"
                    type="file"
                    accept=".pdf,.docx,.doc,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFile(e.target.files[0]);
                    }}
                  />
                  <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {filePayload ? filePayload.name : 'Click to upload PDF, DOCX, or scanned image'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Max 5 MB. Validated by binary content signature.</p>
                </div>
              ) : (
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  placeholder="Paste your complete resume text here..."
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white"
                />
              )}

              <button
                type="button"
                onClick={handleSaveResume}
                disabled={isSaving}
                className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing & Storing Structured Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parse and Save Resume Version</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
