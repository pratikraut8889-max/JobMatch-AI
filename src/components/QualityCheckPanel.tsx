import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { QualityCheckSchema } from '../../shared/types';

interface QualityCheckPanelProps {
  emailBody: string;
}

export const QualityCheckPanel: React.FC<QualityCheckPanelProps> = ({ emailBody }) => {
  const [quality, setQuality] = useState({
    word_count: 0,
    is_ideal_length: true,
    has_unfilled_placeholders: false,
    missing_attachment_mention: false,
    cliche_warnings: [] as string[],
  });

  useEffect(() => {
    // Run local quality check
    const words = emailBody.trim().split(/\s+/).filter(Boolean);
    const count = words.length;
    const isIdeal = count >= 140 && count <= 220;

    const placeholderRegex = /\[[A-Za-z0-9_\s]{2,}\]|\<[A-Za-z0-9_\s]{2,}\>|\{[A-Za-z0-9_\s]{2,}\}/g;
    const hasPlaceholders = placeholderRegex.test(emailBody);

    const attachmentMention = /(attach|enclosed|resume attached|cv attached)/i.test(emailBody);

    const cliches = [
      'writing to express my interest',
      'think outside the box',
      'synergy',
      'hard worker',
      'go-getter',
      'perfect fit',
    ];
    const foundCliches = cliches.filter((c) => emailBody.toLowerCase().includes(c));

    setQuality({
      word_count: count,
      is_ideal_length: isIdeal,
      has_unfilled_placeholders: hasPlaceholders,
      missing_attachment_mention: attachmentMention,
      cliche_warnings: foundCliches,
    });
  }, [emailBody]);

  const hasIssues = !quality.is_ideal_length || quality.has_unfilled_placeholders || quality.cliche_warnings.length > 0;

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 font-mono">
          Outreach Quality & Spam Diagnostic
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hasIssues ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'}`}>
          {hasIssues ? 'Optimization Recommended' : 'Optimal Delivery Score'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
        {/* Length check */}
        <div className={`p-2 rounded-lg border flex items-center gap-2 ${quality.is_ideal_length ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300' : 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'}`}>
          {quality.is_ideal_length ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>{quality.word_count} words (Target: 150-200)</span>
        </div>

        {/* Placeholders check */}
        <div className={`p-2 rounded-lg border flex items-center gap-2 ${!quality.has_unfilled_placeholders ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300' : 'border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300'}`}>
          {!quality.has_unfilled_placeholders ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
          <span>{quality.has_unfilled_placeholders ? 'Unfilled brackets detected' : 'No placeholder brackets'}</span>
        </div>

        {/* Clichés check */}
        <div className={`p-2 rounded-lg border flex items-center gap-2 ${quality.cliche_warnings.length === 0 ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300' : 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'}`}>
          {quality.cliche_warnings.length === 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          <span>{quality.cliche_warnings.length > 0 ? `Cliche: "${quality.cliche_warnings[0]}"` : 'Zero generic fluff cliches'}</span>
        </div>
      </div>
    </div>
  );
};
