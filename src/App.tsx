import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JobInputTabs } from './components/JobInputTabs';
import { ResumeInput } from './components/ResumeInput';
import { AnalysisProgress } from './components/AnalysisProgress';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ConsentBanner } from './components/ConsentBanner';
import { ResumeManagerModal } from './components/ResumeManagerModal';
import { KanbanBoard } from './components/KanbanBoard';
import { OAuthGuideModal } from './components/OAuthGuideModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingFlow } from './components/OnboardingFlow';
import {
  JdInputMode,
  ResumeInputMode,
  ImageDataItem,
  FileDataItem,
  FullJobAnalysis,
  PipelineProgress,
  SavedResumeVersion,
  TrackerApplication,
} from '../shared/types';
import { SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME, SAMPLE_NOTES } from './data/sampleData';
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, FolderGit2, Kanban, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation & Theme
  const [activeView, setActiveView] = useState<'analyze' | 'resumes' | 'tracker'>('analyze');
  const [darkMode, setDarkMode] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);

  // Gmail sender state
  const [connectedEmail, setConnectedEmail] = useState<string | undefined>(undefined);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);

  // Resume Manager state
  const [savedResumes, setSavedResumes] = useState<SavedResumeVersion[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>(undefined);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Tracker state
  const [applications, setApplications] = useState<TrackerApplication[]>([]);

  // JD input state
  const [jdMode, setJdMode] = useState<JdInputMode>('text');
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdImages, setJdImages] = useState<ImageDataItem[]>([]);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  // Ad-hoc resume state (if user pastes or uploads directly on the analyze tab)
  const [resumeMode, setResumeMode] = useState<ResumeInputMode>('text');
  const [resumeFile, setResumeFile] = useState<FileDataItem | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [extractedResumePreview, setExtractedResumePreview] = useState('');

  // Additional notes
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Analysis pipeline
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<PipelineProgress>({
    currentStep: 1,
    completedSteps: [],
    stepLabel: '',
    isProcessing: false,
  });
  const [result, setResult] = useState<FullJobAnalysis | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);

  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string;
    picture?: string;
  } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Fetch initial profile & data
  useEffect(() => {
    fetchProfile();
    fetchResumes();
    fetchTracker();
  }, []);

  // Handle URL redirect query params (from Google OAuth callback)
  // Requirement 5: On app load: ?gmail=connected shows a success toast and refreshes the connection status; ?gmail=error shows the reason; then clean the URL with history.replaceState.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmail = params.get('gmail');
    const email = params.get('email');
    const reason = params.get('reason');

    if (gmail === 'connected' || params.get('gmail_connected')) {
      const emailAddr = email || params.get('email');
      setSuccessToast(emailAddr ? `Connected to ${emailAddr} successfully! Ready to send emails.` : 'Connected to Gmail successfully!');
      fetchProfile();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gmail === 'error' || params.get('gmail_error')) {
      const errorMsg = reason || params.get('gmail_error') || 'Gmail connection failed.';
      setGlobalError(`Gmail authorization issue: ${decodeURIComponent(errorMsg)}`);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('auth_error')) {
      setGlobalError(`Sign-in issue: ${decodeURIComponent(params.get('auth_error')!)}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setHasConsented(!!data.hasConsented);
        setConnectedEmail(data.connectedGmail || undefined);
        setIsTokenExpired(!!data.isTokenExpired || !!data.gmailTokenExpired);
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }
    } catch (e) {
      console.warn('Profile fetch warning:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      fetchProfile();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const data = await res.json();
        setSavedResumes(data);
        if (data.length > 0 && !selectedResumeId) {
          setSelectedResumeId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('Resumes fetch warning:', e);
    }
  };

  const fetchTracker = async () => {
    try {
      const res = await fetch('/api/tracker');
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (e) {
      console.warn('Tracker fetch warning:', e);
    }
  };

  const handleConsent = async () => {
    try {
      await fetch('/api/auth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consented: true }),
      });
      setHasConsented(true);
    } catch (e) {
      setHasConsented(true);
    }
  };

  const handleLoadSample = () => {
    setJdMode('text');
    setJdText(SAMPLE_JOB_DESCRIPTION);
    setResumeMode('text');
    setResumeText(SAMPLE_RESUME);
    setResumeFile(null);
    setExtractedResumePreview('');
    setAdditionalNotes(SAMPLE_NOTES);
    setGlobalError(null);
    setUrlError(undefined);
  };

  const handleReset = () => {
    setResult(null);
    setProgress({
      currentStep: 1,
      completedSteps: [],
      stepLabel: '',
      isProcessing: false,
    });
    setGlobalError(null);
  };

  const handleFetchUrl = async () => {
    if (!jdUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlError(undefined);

    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jdUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch webpage.');
      setJdText(data.text);
    } catch (err: any) {
      setUrlError(err.message || 'Could not fetch job page. Please switch to Paste Text.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleExtractResumeFile = async () => {
    if (!resumeFile) return;
    setIsExtractingResume(true);
    try {
      const res = await fetch('/api/extract-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: resumeFile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract text.');
      setExtractedResumePreview(data.text);
      if (resumeMode === 'file') setResumeText(data.text);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to extract resume text.');
    } finally {
      setIsExtractingResume(false);
    }
  };

  const handleAnalyze = async () => {
    if (jdMode === 'text' && !jdText.trim()) {
      setGlobalError('Please paste a job description.');
      return;
    }
    if (jdMode === 'url' && !jdUrl.trim() && !jdText.trim()) {
      setGlobalError('Please enter a valid job URL or fetch its content.');
      return;
    }
    if (jdMode === 'images' && jdImages.length === 0) {
      setGlobalError('Please upload at least one screenshot of the job posting.');
      return;
    }

    const hasSavedResume = !!selectedResumeId;
    if (!hasSavedResume && resumeMode === 'text' && !resumeText.trim()) {
      setGlobalError('Please paste your resume text or select a saved version.');
      return;
    }
    if (!hasSavedResume && resumeMode === 'file' && !resumeFile && !resumeText.trim()) {
      setGlobalError('Please upload your resume document or paste resume text.');
      return;
    }

    setGlobalError(null);
    setIsAnalyzing(true);
    setResult(null);
    setProgress({
      currentStep: 1,
      completedSteps: [],
      stepLabel: 'Initializing deep intelligence pipeline...',
      isProcessing: true,
    });

    const jdPayload = {
      mode: jdMode,
      text: jdText,
      url: jdUrl,
      images: jdImages,
    };

    try {
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdInput: jdPayload,
          resumeVersionId: selectedResumeId,
          rawResumeText: !selectedResumeId ? resumeText : undefined,
          additionalNotes: additionalNotes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream reader failed.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = '';
          let dataStr = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.replace('data: ', '').trim();
            }
          }

          if (eventType && dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === 'step_start') {
                setProgress((prev: PipelineProgress) => ({
                  ...prev,
                  currentStep: (data.step || 1) as any,
                  stepLabel: data.label || 'Processing step...',
                  isProcessing: true,
                }));
              } else if (eventType === 'step_complete') {
                if (data.step > 0) {
                  setProgress((prev: PipelineProgress) => ({
                    ...prev,
                    completedSteps: Array.from(new Set([...prev.completedSteps, data.step])),
                  }));
                }
              } else if (eventType === 'complete') {
                setResult(data);
                setIsAnalyzing(false);
                setProgress((prev: PipelineProgress) => ({
                  ...prev,
                  isProcessing: false,
                  completedSteps: [1, 2, 3, 4, 5],
                  stepLabel: 'Analysis completed successfully!',
                }));
              } else if (eventType === 'error') {
                throw new Error(data.message || 'Analysis error');
              }
            } catch (pErr: any) {
              console.error('SSE JSON error:', pErr);
            }
          }
        }
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Analysis failed. Please check inputs and retry.');
      setProgress((prev: PipelineProgress) => ({ ...prev, isProcessing: false }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToTracker = async (status: 'Saved' | 'Applied') => {
    if (!result) return;
    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: result.id,
          jobTitle: result.jdAnalysis.job_title,
          companyName: result.jdAnalysis.company_name,
          location: result.jdAnalysis.location,
          salary: result.jdAnalysis.salary_if_listed,
          status,
          contactEmail: result.recruiterContacts.contacts[0]?.email,
          contactName: result.recruiterContacts.contacts[0]?.name,
          matchScore: result.resumeMatch.overall_score,
          sentEmailSubject: result.emails.formal.subject,
          sentEmailBody: result.emails.formal.body,
        }),
      });
      if (res.ok) {
        fetchTracker();
      }
    } catch (e) {
      console.error('Failed to save to tracker:', e);
    }
  };

  const handleUpdateApplication = async (app: TrackerApplication) => {
    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
      });
      if (res.ok) fetchTracker();
    } catch (e) {
      console.error('Tracker update error:', e);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    try {
      const res = await fetch(`/api/tracker/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTracker();
    } catch (e) {
      console.error('Tracker delete error:', e);
    }
  };

  const activeSavedResume = savedResumes.find((r) => r.id === selectedResumeId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        onLoadSample={handleLoadSample}
        onReset={handleReset}
        hasResults={!!result}
        resumeCount={savedResumes.length}
        trackerCount={applications.length}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenOAuthModal={() => setIsOAuthModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        connectedEmail={connectedEmail}
        isTokenExpired={isTokenExpired}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Consent Screen Banner if not yet consented */}
        {!hasConsented && (
          <ConsentBanner
            onConsent={handleConsent}
            onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          />
        )}

        {/* Success Toast Banner */}
        {successToast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs flex items-start justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Analysis could not be completed</p>
                <p className="mt-0.5">{globalError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGlobalError(null)}
              className="text-xs font-semibold text-rose-700 dark:text-rose-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Onboarding Flow: Step 1 Connect Gmail, Step 2 Add Resume, Step 3 Analyze */}
        {activeView === 'analyze' && !result && !isAnalyzing && (!connectedEmail || isTokenExpired || !dismissedOnboarding) && (
          <OnboardingFlow
            connectedEmail={connectedEmail}
            isTokenExpired={isTokenExpired}
            onRefreshProfile={fetchProfile}
            hasResume={savedResumes.length > 0 || !!resumeText.trim()}
            onOpenResumeModal={() => setIsResumeModalOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onLoadSample={handleLoadSample}
            onDismiss={() => setDismissedOnboarding(true)}
          />
        )}

        {/* VIEW 1: ANALYZE ROLE */}
        {activeView === 'analyze' && (
          <div>
            {/* Hero banner when empty */}
            {!result && !isAnalyzing && (
              <div className="text-center max-w-3xl mx-auto mb-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Match your resume to any job, research the company & draft tailored outreach
                </h1>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  JobMatch AI parses role requirements, conducts live Google Search research on the company, computes your transparent fit score with 5-8 concrete resume enhancements, locates recruiter contacts, and writes tailored emails referencing authentic experience.
                </p>

                {/* Quick actions */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-2xs hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Try Instant Demo with Sample Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsResumeModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Manage Resume Versions ({savedResumes.length}/3)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live Progress Bar */}
            {isAnalyzing && <AnalysisProgress progress={progress} />}

            {/* Results Screen */}
            {result && (
              <ResultsDashboard
                result={result}
                onOpenOAuthModal={() => setIsOAuthModalOpen(true)}
                onSaveToTracker={handleSaveToTracker}
                connectedEmail={connectedEmail}
                isTokenExpired={isTokenExpired}
                onRefreshProfile={fetchProfile}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
              />
            )}

            {/* Input Panels */}
            {!result && (
              <div className="space-y-6">
                {/* Active Resume Bar if user has saved versions */}
                {savedResumes.length > 0 && (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Active Target Resume: {activeSavedResume?.title || 'None Selected'}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {activeSavedResume?.structuredData.skills.length} skills · {activeSavedResume?.structuredData.experience.length} experiences
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsResumeModalOpen(true)}
                      className="px-3 py-1.5 font-semibold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 cursor-pointer self-start sm:self-auto"
                    >
                      Switch Resume Version
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <JobInputTabs
                    mode={jdMode}
                    onModeChange={setJdMode}
                    text={jdText}
                    onTextChange={setJdText}
                    url={jdUrl}
                    onUrlChange={setJdUrl}
                    images={jdImages}
                    onImagesChange={setJdImages}
                    isFetchingUrl={isFetchingUrl}
                    onFetchUrl={handleFetchUrl}
                    urlError={urlError}
                    onClearUrlError={() => setUrlError(undefined)}
                  />

                  {savedResumes.length === 0 ? (
                    <ResumeInput
                      mode={resumeMode}
                      onModeChange={setResumeMode}
                      file={resumeFile}
                      onFileChange={setResumeFile}
                      text={resumeText}
                      onTextChange={setResumeText}
                      isExtracting={isExtractingResume}
                      onExtractFile={handleExtractResumeFile}
                      extractedText={extractedResumePreview}
                    />
                  ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900 dark:text-white">2. Candidate Resume</h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Choose one of your saved resumes</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsResumeModalOpen(true)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Manage / Add New
                        </button>
                      </div>

                      <div className="space-y-2">
                        {savedResumes.map((r) => (
                          <label
                            key={r.id}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              selectedResumeId === r.id
                                ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="resume-version"
                                checked={selectedResumeId === r.id}
                                onChange={() => setSelectedResumeId(r.id)}
                                className="w-4 h-4 text-indigo-600"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.title}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {r.structuredData.skills.slice(0, 4).join(', ')}...
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(r.updatedAt).toLocaleDateString()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      3. Additional Context & Candidate Preferences
                    </label>
                    <span className="text-xs text-slate-400">Optional</span>
                  </div>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. 'Available to start in 3 weeks. Open to hybrid in NYC or full remote. Passionate about real-time developer tools.'"
                    className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>In-memory processing · Never stored unless saved to profile</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analyzing Match & Researching Company...</span>
                      </>
                    ) : (
                      <>
                        <span>Analyze Match & Research Company</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: RESUME MANAGER */}
        {activeView === 'resumes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resume Manager</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Save up to 3 specialized resume versions to target different role types
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                + Add / Manage Versions
              </button>
            </div>

            {savedResumes.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                <FolderGit2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No saved resume versions</h3>
                <p className="text-xs text-slate-400 mt-1">Upload a PDF or DOCX to parse your skills and work history.</p>
                <button
                  type="button"
                  onClick={() => setIsResumeModalOpen(true)}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Create Version 1
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {savedResumes.map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                        Version Track
                      </span>
                      {selectedResumeId === r.id && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{r.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Candidate: <strong>{r.structuredData.name}</strong>
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                      {r.structuredData.skills.slice(0, 5).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: KANBAN BOARD */}
        {activeView === 'tracker' && (
          <KanbanBoard
            applications={applications}
            onUpdateApplication={handleUpdateApplication}
            onDeleteApplication={handleDeleteApplication}
            onRefresh={fetchTracker}
          />
        )}
      </main>

      {/* Modals */}
      <ResumeManagerModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        resumes={savedResumes}
        selectedResumeId={selectedResumeId}
        onSelectResume={setSelectedResumeId}
        onRefreshResumes={fetchResumes}
      />

      <OAuthGuideModal
        isOpen={isOAuthModalOpen}
        onClose={() => setIsOAuthModalOpen(false)}
        recipientEmail=""
        subject=""
        body=""
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onDataDeleted={() => {
          fetchResumes();
          fetchTracker();
          fetchProfile();
          setResult(null);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        connectedEmail={connectedEmail}
        isTokenExpired={isTokenExpired}
        onRefreshProfile={fetchProfile}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenOAuthInstructions={() => setIsOAuthModalOpen(true)}
      />
    </div>
  );
}
