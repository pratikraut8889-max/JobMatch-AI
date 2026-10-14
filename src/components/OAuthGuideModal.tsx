import React, { useState } from 'react';
import { X, KeyRound, ExternalLink, Check, Copy, AlertTriangle, Send } from 'lucide-react';

interface OAuthGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  subject: string;
  body: string;
}

export const OAuthGuideModal: React.FC<OAuthGuideModalProps> = ({
  isOpen,
  onClose,
  recipientEmail,
  subject,
  body,
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [oauthToken, setOauthToken] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSendViaGmailApi = async () => {
    if (!oauthToken.trim()) {
      setSendError('Please provide a valid Google OAuth Access Token with gmail.send scope.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      // Create RFC 2822 email format
      const emailContent = [
        `To: ${recipientEmail}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        '',
        body,
      ].join('\r\n');

      // Base64url encode the email
      const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oauthToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64EncodedEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Gmail API Error (${response.status})`);
      }

      const data = await response.json();
      setSendSuccess(`Email successfully dispatched via Gmail API! Message ID: ${data.id}`);
      setShowSendConfirmation(false);
    } catch (err: any) {
      setSendError(err.message || 'Failed to dispatch email via Gmail API.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google OAuth & Gmail API Setup</h3>
              <p className="text-xs text-slate-500">How to configure direct in-app sending with Gmail</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-indigo-950">
            <h4 className="font-semibold text-xs text-indigo-900 mb-1">Recommended Option: "Open in Gmail"</h4>
            <p className="text-[11px] text-indigo-800">
              For 99% of workflows, clicking <strong>"Open in Gmail"</strong> on your result screen is faster, requires zero setup, and instantly opens your draft in Gmail so you can review before hitting send.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Google Cloud Console Setup Instructions</h4>
            <p className="mb-3">
              To send emails directly from within the app via the Gmail API, follow these 4 steps in the Google Cloud Console:
            </p>

            <ol className="space-y-3 list-decimal list-inside pl-1 text-slate-700">
              <li className="pl-1">
                <span className="font-semibold text-slate-900">Create a Google Cloud Project:</span>
                <p className="pl-4 text-slate-500 mt-0.5">
                  Visit the{' '}
                  <a
                    href="https://console.cloud.google.com/projectcreate"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline inline-flex items-center gap-1 font-medium"
                  >
                    Google Cloud Console <ExternalLink className="w-3 h-3 inline" />
                  </a>{' '}
                  and create or select a project.
                </p>
              </li>

              <li className="pl-1">
                <span className="font-semibold text-slate-900">Enable the Gmail API:</span>
                <p className="pl-4 text-slate-500 mt-0.5">
                  Go to <strong>APIs & Services &gt; Library</strong>, search for <strong>Gmail API</strong>, and click <strong>Enable</strong>.
                </p>
              </li>

              <li className="pl-1">
                <span className="font-semibold text-slate-900">Configure OAuth Consent Screen & Scopes:</span>
                <p className="pl-4 text-slate-500 mt-0.5">
                  Under <strong>OAuth consent screen</strong>, select <strong>User Type: External</strong>. Under Scopes, add:
                </p>
                <div className="pl-4 mt-1.5 flex items-center gap-2">
                  <code className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                    https://www.googleapis.com/auth/gmail.send
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://www.googleapis.com/auth/gmail.send', 'scope')}
                    className="text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer"
                    title="Copy Scope"
                  >
                    {copied === 'scope' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </li>

              <li className="pl-1">
                <span className="font-semibold text-slate-900">Add Test Users (Crucial for Testing Status):</span>
                <p className="pl-4 text-slate-500 mt-0.5">
                  While your Google OAuth app is in &quot;Testing&quot; mode, Google will block any unlisted account with an <code>access_denied</code> error:
                </p>
                <div className="pl-4 mt-1.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <p className="font-semibold">Steps to add Test Users:</p>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1">
                    <li>Navigate to <strong>APIs &amp; Services &gt; OAuth consent screen</strong>.</li>
                    <li>Scroll down to the <strong>Test users</strong> section.</li>
                    <li>Click <strong>+ ADD USERS</strong>.</li>
                    <li>Enter the exact Gmail address(es) you want to send from (e.g. <code>yourname@gmail.com</code>).</li>
                    <li>Click <strong>Save</strong>. You can now select this account in the OAuth popup!</li>
                  </ol>
                </div>
              </li>

              <li className="pl-1">
                <span className="font-semibold text-slate-900">Create Web OAuth Client ID & Redirect URI:</span>
                <p className="pl-4 text-slate-500 mt-0.5">
                  Go to <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>. Select <strong>Web application</strong>:
                </p>
                <div className="pl-4 mt-1.5 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Authorized JavaScript origins:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                        http://localhost:3000
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('http://localhost:3000', 'origin')}
                        className="text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer"
                      >
                        {copied === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Authorized redirect URIs:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                        http://localhost:3000/api/auth/google/callback
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('http://localhost:3000/api/auth/google/callback', 'redirect')}
                        className="text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer"
                      >
                        {copied === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </li>

              <li className="pl-1">
                <span className="font-semibold text-slate-900">Add Credentials to .env:</span>
                <p className="pl-4 text-slate-500 mt-0.5">
                  Copy your Client ID and Client Secret into your <code>.env</code> file:
                </p>
                <div className="pl-4 mt-1 bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px]">
                  GOOGLE_CLIENT_ID=&quot;your-id.apps.googleusercontent.com&quot;<br />
                  GOOGLE_CLIENT_SECRET=&quot;GOCSPX-your-secret&quot;<br />
                  GOOGLE_REDIRECT_URI=&quot;http://localhost:3000/api/auth/google/callback&quot;
                </div>
              </li>
            </ol>
          </div>

          {/* Interactive Direct Send Tester */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span>Direct Gmail API Dispatch (Optional)</span>
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              If you have an OAuth Access Token (with <code className="bg-slate-200/70 px-1 rounded">gmail.send</code> scope), you can preview and send the generated email right now.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Google OAuth Access Token:
                </label>
                <input
                  type="password"
                  value={oauthToken}
                  onChange={(e) => setOauthToken(e.target.value)}
                  placeholder="ya29.a0AfH6SM..."
                  className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              {sendError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {sendSuccess}
                </div>
              )}

              {/* Confirmation Step */}
              {!showSendConfirmation ? (
                <button
                  type="button"
                  onClick={() => setShowSendConfirmation(true)}
                  disabled={!oauthToken.trim()}
                  className="w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                >
                  Preview & Confirm Dispatch
                </button>
              ) : (
                <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-3 space-y-2 text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Explicit User Confirmation Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Are you sure you want to send this email to <strong className="font-mono text-amber-950">{recipientEmail || '(No recipient)'}</strong> with subject <strong className="italic">"{subject}"</strong>?
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSendViaGmailApi}
                      disabled={isSending}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Sending...' : 'Yes, Confirm & Send'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSendConfirmation(false)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Tokens are processed in memory and never stored.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
