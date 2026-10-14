import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Mail,
  Copy,
  Check,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Send,
  HelpCircle,
  AlertTriangle,
  FileText,
  ListCheck,
  Kanban,
  Repeat,
  Linkedin,
} from 'lucide-react';
import { FullJobAnalysis } from '../../shared/types';
import { QualityCheckPanel } from './QualityCheckPanel';
import { SendEmailModal } from './SendEmailModal';

interface ResultsDashboardProps {
  result: FullJobAnalysis;
  onOpenOAuthModal: () => void;
  onSaveToTracker: (status: 'Saved' | 'Applied') => void;
  connectedEmail?: string;
  isTokenExpired?: boolean;
  onRefreshProfile: () => void;
  onOpenSettings: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  onOpenOAuthModal,
  onSaveToTracker,
  connectedEmail,
  isTokenExpired,
  onRefreshProfile,
  onOpenSettings,
}) => {
  const { jdAnalysis, companyResearch, resumeMatch, recruiterContacts, emails } = result;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'all' | 'jd' | 'company' | 'match' | 'contacts' | 'email'>('all');

  // Tone selector for emails: formal, friendly, confident_concise, cover_letter, follow_up_email
  const [selectedVariant, setSelectedVariant] = useState<'formal' | 'friendly' | 'confident_concise' | 'cover_letter' | 'follow_up_email'>('formal');

  // Email state
  const defaultRecipient =
    recruiterContacts.contacts[0]?.email ||
    '';
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient);
  const [emailSubject, setEmailSubject] = useState(emails.formal.subject);
  const [emailBody, setEmailBody] = useState(emails.formal.body);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [trackerSaved, setTrackerSaved] = useState(false);

  // Variant switcher
  const handleVariantChange = (variant: typeof selectedVariant) => {
    setSelectedVariant(variant);
    const draft = emails[variant];
    setEmailSubject(draft.subject);
    setEmailBody(draft.body);
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleOpenInGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const mailtoLink = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  const score = resumeMatch.overall_score;
  const scoreColor =
    score >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' :
    score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:text-amber-300' :
    'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950 dark:text-rose-300';

  return (
    <div className="space-y-8 pb-16">
      {/* Red Flags Alert if detected */}
      {jdAnalysis.red_flags && jdAnalysis.red_flags.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Red Flags Detected in Job Posting</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-800 dark:text-rose-300 pl-1">
            {jdAnalysis.red_flags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Executive Summary Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{jdAnalysis.company_name}</span>
              <span aria-hidden="true">·</span>
              <span>{jdAnalysis.location}</span>
              <span aria-hidden="true">·</span>
              <span>{jdAnalysis.work_mode}</span>
              <span aria-hidden="true">·</span>
              <span>{jdAnalysis.seniority}</span>
              {jdAnalysis.salary_if_listed !== 'Not listed' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{jdAnalysis.salary_if_listed}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {jdAnalysis.job_title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-3xl leading-relaxed">
              {jdAnalysis.role_summary}
            </p>
          </div>

          {/* Match Score & Action */}
          <div className="flex items-center gap-4 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center font-mono font-bold ${scoreColor}`}>
              <span className="text-2xl tabular-nums leading-none">{score}</span>
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider opacity-80 mt-0.5">/ 100</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono block">
                Alignment Fit
              </span>
              <button
                type="button"
                onClick={() => {
                  onSaveToTracker('Saved');
                  setTrackerSaved(true);
                }}
                disabled={trackerSaved}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 cursor-pointer disabled:opacity-50"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>{trackerSaved ? 'Saved to Tracker' : 'Save to Kanban'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="pt-4 flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Executive View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('jd')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'jd'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            1. Role Analysis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'company'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            2. Company Intel ({companyResearch.source_links.length} Sources)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('match')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'match'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            3. Score Breakdown & ATS Checklist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'contacts'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            4. Contacts & Outreach ({recruiterContacts.contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'email'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            5. Tailored Email & Send
          </button>
        </div>
      </div>

      {/* STEP 1: JD Analysis */}
      {(activeTab === 'all' || activeTab === 'jd') && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                Step 01
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Job Description Breakdown</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Required Qualifications
              </h3>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {jdAnalysis.required_skills.map((skill, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Preferred / Nice-to-Have Skills
              </h3>
              {jdAnalysis.nice_to_have_skills && jdAnalysis.nice_to_have_skills.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {jdAnalysis.nice_to_have_skills.map((skill, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific bonus skills listed.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Responsibilities & Expectations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              {jdAnalysis.responsibilities.map((resp, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                  <span className="font-mono text-slate-400 font-bold shrink-0">0{idx + 1}.</span>
                  <span>{resp}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STEP 2: Company Research */}
      {(activeTab === 'all' || activeTab === 'company') && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                Step 02
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Company Intel: {companyResearch.company_name}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              <span>Size: {companyResearch.size}</span>
              <span aria-hidden="true">·</span>
              <MapPin className="w-3.5 h-3.5" />
              <span>HQ: {companyResearch.headquarters}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <h3 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Mission & Operations</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{companyResearch.summary}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
              <h3 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Culture & Workplace Signals</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{companyResearch.culture_values}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 mb-2">Tech Stack Grounded</h3>
              <div className="flex flex-wrap gap-1.5">
                {companyResearch.tech_stack.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-500 mb-2">Key Competitors</h3>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {companyResearch.competitors.map((c, idx) => (
                  <li key={idx}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sources */}
          {companyResearch.source_links.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Google Search Grounding Citations ({companyResearch.source_links.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {companyResearch.source_links.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:text-indigo-600 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <span className="truncate max-w-[220px]">{src.title}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 3: Transparent Match Breakdown & ATS Checklist */}
      {(activeTab === 'all' || activeTab === 'match') && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                Step 03
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Match Scoring Breakdown (Transparent Weighting)
              </h2>
            </div>
            <span className={`px-3 py-1 rounded text-xs font-mono font-bold ${scoreColor}`}>
              {score}/100 Overall Score
            </span>
          </div>

          {/* 5-Category Breakdown Table */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {Object.entries(resumeMatch.breakdown).map(([key, cat]) => (
              <div key={key} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{cat.name}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">{cat.score}%</span>
                </div>
                <span className="text-[10px] text-slate-400 block font-mono">Weight: {cat.weight}%</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-1">{cat.reason}</p>
              </div>
            ))}
          </div>

          {/* ATS Keyword Checklist */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <ListCheck className="w-4 h-4 text-indigo-600" />
              <span>ATS Keyword Checklist (Present vs Missing)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              {resumeMatch.ats_checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    item.status === 'present'
                      ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300'
                      : 'border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 text-amber-950 dark:text-amber-300'
                  }`}
                >
                  {item.status === 'present' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-xs">{item.keyword}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{item.context_found_or_tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5-8 Concrete Resume Rewrite Suggestions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Specific Resume Rewrite Suggestions ({resumeMatch.resume_edit_suggestions.length})
            </h3>
            <div className="space-y-3">
              {resumeMatch.resume_edit_suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Target: {sug.target_section}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">Suggestion 0{idx + 1}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 line-through">
                    "{sug.current_framing}"
                  </div>
                  <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 font-medium">
                    "{sug.suggested_rewrite}"
                  </div>
                  <p className="text-[11px] text-slate-500 italic">Rationale: {sug.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STEP 4: Recruiter Contacts */}
      {(activeTab === 'all' || activeTab === 'contacts') && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
              Step 04
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Recruiter & Talent Acquisition Contacts
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recruiterContacts.contacts.map((c, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{c.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.confidence_label === 'VERIFIED SOURCE'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {c.confidence_label}
                  </span>
                </div>
                <p className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold select-all">
                  {c.email}
                </p>
                <p className="text-slate-500 text-[11px]">{c.notes}</p>
                <button
                  type="button"
                  onClick={() => setRecipientEmail(c.email)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Select as Recipient
                </button>
              </div>
            ))}
          </div>

          {/* LinkedIn Connection Note */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <Linkedin className="w-4 h-4 text-blue-600" />
                <span>LinkedIn Outreach Note (Under 300 Chars)</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(recruiterContacts.linkedin_connection_note, 'linkedin')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
              >
                {copiedType === 'linkedin' ? 'Copied!' : 'Copy Note'}
              </button>
            </div>
            <p className="p-2.5 rounded bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 text-slate-800 dark:text-slate-200 font-sans">
              {recruiterContacts.linkedin_connection_note}
            </p>
          </div>
        </section>
      )}

      {/* STEP 5: Tailored Emails & Quality Checker */}
      {(activeTab === 'all' || activeTab === 'email') && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                Step 05
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Tailored Outreach Email Generator
              </h2>
            </div>

            {/* Tone Selector */}
            <div className="inline-flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => handleVariantChange('formal')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  selectedVariant === 'formal' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Formal
              </button>
              <button
                type="button"
                onClick={() => handleVariantChange('friendly')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  selectedVariant === 'friendly' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Friendly
              </button>
              <button
                type="button"
                onClick={() => handleVariantChange('confident_concise')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  selectedVariant === 'confident_concise' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Confident-Concise
              </button>
              <button
                type="button"
                onClick={() => handleVariantChange('cover_letter')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  selectedVariant === 'cover_letter' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Cover Letter
              </button>
              <button
                type="button"
                onClick={() => handleVariantChange('follow_up_email')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  selectedVariant === 'follow_up_email' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Follow-Up
              </button>
            </div>
          </div>

          {/* Quality check panel */}
          <QualityCheckPanel emailBody={emailBody} />

          {/* Recipient */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Recipient Email:
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="recruiter@company.com"
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Subject Line (Editable):
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full text-sm font-semibold p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Body (Editable):
            </label>
            <textarea
              rows={11}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full text-sm p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 leading-relaxed font-sans"
            />
          </div>

          {/* Sender Connection Status & Sending Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    connectedEmail && !isTokenExpired
                      ? 'bg-emerald-500'
                      : isTokenExpired
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-slate-700 dark:text-slate-300">
                  {connectedEmail && !isTokenExpired ? (
                    <>
                      Sending as: <strong className="font-mono text-slate-900 dark:text-white">{connectedEmail}</strong>
                    </>
                  ) : isTokenExpired ? (
                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                      Gmail token expired or revoked. Please reconnect in Settings.
                    </span>
                  ) : (
                    <span className="text-slate-500">No Gmail account connected yet</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer self-start sm:self-auto"
              >
                {connectedEmail ? 'Disconnect / Switch account' : 'Connect Gmail in Settings'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInGmail}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                >
                  <Mail className="w-4 h-4 text-rose-500" />
                  <span>Open in Gmail (Compose)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Gmail API (OAuth)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(`To: ${recipientEmail}\nSubject: ${emailSubject}\n\n${emailBody}`, 'full')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  {copiedType === 'full' ? 'Copied!' : 'Copy Full Draft'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Send Email Confirmation Modal */}
      <SendEmailModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        recipientEmail={recipientEmail}
        subject={emailSubject}
        body={emailBody}
        connectedEmail={connectedEmail}
        isTokenExpired={isTokenExpired}
        onRefreshProfile={onRefreshProfile}
        onSuccess={() => {
          onSaveToTracker('Applied');
          setTrackerSaved(true);
        }}
      />
    </div>
  );
};
