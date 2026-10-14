import React, { useState } from 'react';
import { FileText, Link as LinkIcon, Image as ImageIcon, UploadCloud, X, AlertCircle, ArrowRight, Loader2, Check } from 'lucide-react';
import { JdInputMode, ImageDataItem } from '../types';

interface JobInputTabsProps {
  mode: JdInputMode;
  onModeChange: (mode: JdInputMode) => void;
  text: string;
  onTextChange: (text: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
  images: ImageDataItem[];
  onImagesChange: (images: ImageDataItem[]) => void;
  isFetchingUrl: boolean;
  onFetchUrl: () => Promise<void>;
  urlError?: string;
  onClearUrlError: () => void;
}

export const JobInputTabs: React.FC<JobInputTabsProps> = ({
  mode,
  onModeChange,
  text,
  onTextChange,
  url,
  onUrlChange,
  images,
  onImagesChange,
  isFetchingUrl,
  onFetchUrl,
  urlError,
  onClearUrlError,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList: FileList) => {
    const validFiles = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const base64Data = result.split(',')[1];
          onImagesChange([
            ...images,
            {
              data: base64Data,
              mimeType: file.type,
              name: file.name,
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">1. Job Description</h2>
          <p className="text-xs text-slate-500 mt-0.5">Provide the target role details using any of the three formats</p>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onModeChange('text')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('url')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'url'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Paste URL</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('images')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'images'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Screenshots ({images.length})</span>
          </button>
        </div>
      </div>

      {/* Tab A: Paste Text */}
      {mode === 'text' && (
        <div>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={9}
            placeholder="Paste the full job posting here (Title, Company, Responsibilities, Qualifications, etc.)..."
            className="w-full text-sm text-slate-800 placeholder-slate-400 bg-slate-50/50 rounded-lg border border-slate-200 p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans leading-relaxed transition-all resize-y"
          />
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>Minimum ~50 words recommended for highest accuracy</span>
            <span className="font-mono tabular-nums">{text.length} characters</span>
          </div>
        </div>
      )}

      {/* Tab B: Paste URL */}
      {mode === 'url' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  onUrlChange(e.target.value);
                  if (urlError) onClearUrlError();
                }}
                placeholder="https://jobs.lever.co/company/job-id or greenhouse.io link"
                className="w-full text-sm text-slate-800 placeholder-slate-400 bg-slate-50/50 rounded-lg border border-slate-200 pl-3.5 pr-10 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => onUrlChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onFetchUrl}
              disabled={isFetchingUrl || !url.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {isFetchingUrl ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching Page...</span>
                </>
              ) : (
                <>
                  <span>Fetch Content</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* URL Error with Fallback to Paste Text */}
          {urlError && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Website inaccessible or protected</p>
                  <p className="text-amber-800 mt-0.5">{urlError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClearUrlError();
                  onModeChange('text');
                }}
                className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 shrink-0 underline decoration-indigo-300 underline-offset-2 cursor-pointer"
              >
                <span>Switch to Paste Text</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Fetched text preview if already fetched into text state */}
          {text && (
            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs">
              <div className="flex items-center justify-between text-emerald-800 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Job page content successfully extracted ({text.length} chars)
                </span>
                <button
                  type="button"
                  onClick={() => onModeChange('text')}
                  className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                >
                  Review or edit text
                </button>
              </div>
              <p className="text-slate-600 line-clamp-2 italic font-mono text-[11px]">
                {text.slice(0, 220)}...
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Note: Public job postings on Lever, Greenhouse, Workday, and company sites work best. Sites requiring login (e.g. some LinkedIn boards) can block external crawlers—in those cases, switch to Paste Text.
          </p>
        </div>
      )}

      {/* Tab C: Screenshots / Images */}
      {mode === 'images' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragActive ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
            onClick={() => document.getElementById('jd-image-upload')?.click()}
          >
            <input
              id="jd-image-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">
              Drag & drop screenshots of the job posting, or <span className="text-indigo-600 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, or WEBP. Upload multiple images if the JD spans multiple screenshots.</p>
          </div>

          {/* Uploaded thumbnails */}
          {images.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                <span className="font-medium">Uploaded Screenshots ({images.length})</span>
                <button
                  type="button"
                  onClick={() => onImagesChange([])}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={`Screenshot ${idx + 1}`}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-1.5 bg-white text-[11px] truncate text-slate-700 font-mono">
                      {img.name}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
