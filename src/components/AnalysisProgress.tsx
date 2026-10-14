import React from 'react';
import { Check, Loader2, Search, Building2, UserCheck, Mail, FileSearch } from 'lucide-react';
import { PipelineProgress } from '../types';

interface AnalysisProgressProps {
  progress: PipelineProgress;
}

const STEPS = [
  {
    step: 1,
    title: 'JD Analysis',
    subtitle: 'Extracting requirements, seniority & contacts',
    icon: FileSearch,
  },
  {
    step: 2,
    title: 'Company Research',
    subtitle: 'Grounding via Google Search for news & stack',
    icon: Building2,
  },
  {
    step: 3,
    title: 'Resume vs JD Fit',
    subtitle: 'Match scoring & 5 concrete suggestions',
    icon: Search,
  },
  {
    step: 4,
    title: 'Recruiter Contacts',
    subtitle: 'Finding emails & verifying pattern',
    icon: UserCheck,
  },
  {
    step: 5,
    title: 'Tailored Emails',
    subtitle: 'Drafting formal & friendly applications',
    icon: Mail,
  },
];

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ progress }) => {
  const currentStep = progress.currentStep;
  const completed = progress.completedSteps;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm my-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 font-mono">
            Analysis In Progress
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-0.5">
            Running 5-Step Deep Intelligence Pipeline
          </h3>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>{progress.stepLabel || 'Processing step...'}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {Math.min(100, Math.round((completed.length / 5) * 100))}%
          </span>
          <span className="text-xs text-slate-400 block">Overall progress</span>
        </div>
      </div>

      {/* Visual step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {STEPS.map((s) => {
          const isDone = completed.includes(s.step);
          const isCurrent = currentStep === s.step && progress.isProcessing && !isDone;
          const Icon = s.icon;

          return (
            <div
              key={s.step}
              className={`p-3.5 rounded-xl border transition-all ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50/50 text-slate-900'
                  : isCurrent
                  ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500/20 text-slate-900'
                  : 'border-slate-100 bg-slate-50/60 text-slate-400 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-semibold uppercase text-slate-500">
                  Step 0{s.step}
                </span>
                {isDone ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : isCurrent ? (
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-slate-200 text-slate-400 flex items-center justify-center text-[10px]">
                    {s.step}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-1">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isDone ? 'text-emerald-700' : isCurrent ? 'text-indigo-600' : 'text-slate-400'
                  }`}
                />
                <h4 className="text-xs font-bold truncate text-slate-800">{s.title}</h4>
              </div>

              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {s.subtitle}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
