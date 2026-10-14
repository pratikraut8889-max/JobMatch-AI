import React, { useState } from 'react';
import { FileUp, FileText, X, CheckCircle2, Loader2, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { ResumeInputMode, FileDataItem } from '../types';

interface ResumeInputProps {
  mode: ResumeInputMode;
  onModeChange: (mode: ResumeInputMode) => void;
  file: FileDataItem | null;
  onFileChange: (file: FileDataItem | null) => void;
  text: string;
  onTextChange: (text: string) => void;
  isExtracting: boolean;
  onExtractFile: () => Promise<void>;
  extractedText: string;
}

export const ResumeInput: React.FC<ResumeInputProps> = ({
  mode,
  onModeChange,
  file,
  onFileChange,
  text,
  onTextChange,
  isExtracting,
  onExtractFile,
  extractedText,
}) => {
  const [showExtractedPreview, setShowExtractedPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const processFile = (selectedFile: File) => {
    setFileError(null);
    const validExtensions = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.txt'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));

    if (!hasValidExt && !selectedFile.type.includes('pdf') && !selectedFile.type.includes('word') && !selectedFile.type.startsWith('image/')) {
      setFileError('Please upload a PDF, DOCX, PNG, JPG, or TXT resume.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setFileError('File size exceeds 20MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const base64Data = result.split(',')[1];
        onFileChange({
          data: base64Data,
          mimeType: selectedFile.type || 'application/octet-stream',
          name: selectedFile.name,
          size: selectedFile.size,
        });
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">2. Your Resume</h2>
          <p className="text-xs text-slate-500 mt-0.5">Upload document or paste text. Processed in-memory only</p>
        </div>

        {/* Tab Selector */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onModeChange('file')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'file'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
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
        </div>
      </div>

      {/* Mode A: Upload File */}
      {mode === 'file' && (
        <div className="space-y-4">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
              }}
              onClick={() => document.getElementById('resume-file-input')?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-colors cursor-pointer ${
                dragActive ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.docx,.doc,.txt,image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) processFile(e.target.files[0]);
                }}
              />
              <FileUp className="w-9 h-9 text-slate-400 mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-slate-800">
                Click to upload or drag & drop your resume
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, or scanned Image (Max 20MB)</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {formatFileSize(file.size)} · Ready for in-memory analysis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onFileChange(null);
                      setFileError(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-md"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Extraction Preview Action */}
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                {extractedText ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Text extracted successfully ({extractedText.split(/\s+/).filter(Boolean).length} words)</span>
                  </div>
                ) : (
                  <span className="text-slate-500">Text will be extracted automatically during analysis.</span>
                )}

                <div className="flex items-center gap-2">
                  {!extractedText && (
                    <button
                      type="button"
                      onClick={onExtractFile}
                      disabled={isExtracting}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                    >
                      {isExtracting ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extracting text...
                        </span>
                      ) : (
                        'Extract and preview text now'
                      )}
                    </button>
                  )}

                  {extractedText && (
                    <button
                      type="button"
                      onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      {showExtractedPreview ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide Preview</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview Extracted Text</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Extracted preview box */}
              {showExtractedPreview && extractedText && (
                <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {extractedText}
                </div>
              )}
            </div>
          )}

          {fileError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      )}

      {/* Mode B: Paste Text */}
      {mode === 'text' && (
        <div>
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={9}
            placeholder="Paste your plain text resume here (Summary, Work Experience, Skills, Education)..."
            className="w-full text-sm text-slate-800 placeholder-slate-400 bg-slate-50/50 rounded-lg border border-slate-200 p-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans leading-relaxed transition-all resize-y"
          />
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>Ensure all key technical skills and accomplishments are included</span>
            <span className="font-mono tabular-nums">{text.length} characters</span>
          </div>
        </div>
      )}

      {/* Privacy Guarantee Note */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Zero-persistence privacy:</strong> Resumes are processed strictly in RAM and never stored to disk or external databases.
        </span>
      </div>
    </div>
  );
};
