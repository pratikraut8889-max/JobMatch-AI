import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import mammoth from 'mammoth';
import crypto from 'crypto';

import { safeFetchWebPage, encryptSecret } from './server/security';
import { db } from './server/database';
import {
  parseResumeWithGemini,
  analyzeJdWithGemini,
  researchCompanyWithGemini,
  matchResumeAndJd,
  findRecruiterContactsWithGemini,
  generateEmailsWithGemini,
} from './server/gemini';
import {
  performQualityCheck,
  sendEmailViaGmailApi,
  disconnectUserGmail,
  verifyEmailWithHunter,
} from './server/emailService';
import {
  StructuredResume,
  SavedResumeVersion,
  FullJobAnalysis,
  TrackerApplication,
} from './shared/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DAILY_ANALYSIS_LIMIT = parseInt(process.env.DAILY_ANALYSIS_LIMIT || '5', 10);

// Security middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite dev server compatibility
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper to resolve user ID from header or default demo user
function getUserId(req: Request): string {
  const headerId = req.headers['x-user-id'] as string;
  if (headerId && headerId.trim()) return headerId.trim();
  return 'default-user-01';
}

// ==========================================
// 1. HEALTH CHECK ENDPOINT
// ==========================================
app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'JobMatch AI Backend v2.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// ==========================================
// 2. USER & CONSENT ENDPOINTS
// ==========================================
app.get('/api/auth/me', (req, res) => {
  const userId = getUserId(req);
  const user = db.getUser(userId);
  const hasGmailToken = !!db.getEncryptedToken(userId);
  const isExpired = !!user.gmailTokenExpired || (!!user.connectedGmail && !hasGmailToken);
  res.json({
    ...user,
    hasGmailToken,
    isTokenExpired: isExpired,
    gmailTokenExpired: isExpired,
    dailyAnalysisLimit: DAILY_ANALYSIS_LIMIT,
  });
});

app.post('/api/auth/consent', (req, res) => {
  const userId = getUserId(req);
  const { consented } = req.body;
  const updated = db.updateUserConsent(userId, !!consented);
  res.json(updated);
});

// Google OAuth URL generation (prompt=consent select_account)
app.get('/api/auth/google/url', (req, res) => {
  const userId = getUserId(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return res.json({
      configured: false,
      redirectUri,
      error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in server environment variables.',
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent select_account',
    state: userId,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ configured: true, url, redirectUri, clientId });
});

// Google OAuth Callback (authorization code flow)
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const userId = (state as string) || 'default-user-01';

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html><body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GMAIL_ERROR', error: '${error}' }, '*');
            window.close();
          } else {
            window.location.href = '/?gmail_error=${encodeURIComponent(String(error))}';
          }
        </script>
        <p>Gmail authorization was cancelled or denied: ${error}. Closing...</p>
      </body></html>
    `);
  }

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      throw new Error(errJson.error_description || errJson.error || 'Failed to exchange authorization code for tokens');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (refreshToken) {
      const encrypted = encryptSecret(refreshToken);
      db.saveEncryptedToken(userId, encrypted);
    }

    // Attempt to query connected Gmail address from Gmail Profile
    let emailAddress = '';
    try {
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.emailAddress) {
          emailAddress = profileData.emailAddress;
        }
      }
    } catch {
      // Profile endpoint may be blocked if only gmail.send scope is granted
    }

    if (emailAddress) {
      db.setConnectedGmail(userId, emailAddress);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Gmail Connected</title></head>
          <body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:48px 24px;background:#f8fafc;color:#0f172a;">
            <div style="max-width:420px;margin:0 auto;background:white;padding:32px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
              <div style="width:48px;height:48px;border-radius:12px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;">✓</div>
              <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;">Gmail Account Connected!</h2>
              <p style="color:#475569;font-size:13px;margin:0 0 16px;">Sending as: <strong style="color:#2563eb;font-family:monospace;">${emailAddress}</strong></p>
              <p style="color:#94a3b8;font-size:12px;margin:0;">Returning to JobMatch AI...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_CONNECTED', email: '${emailAddress}' }, '*');
                setTimeout(() => window.close(), 700);
              } else {
                window.location.href = '/?gmail_connected=true&email=${encodeURIComponent(emailAddress)}';
              }
            </script>
          </body>
        </html>
      `);
    }

    // If profile was not readable with gmail.send scope only, allow confirming email in popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Confirm Connected Gmail</title></head>
        <body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:40px 20px;background:#f8fafc;color:#0f172a;">
          <div style="max-width:420px;margin:0 auto;background:white;padding:28px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="width:44px;height:44px;border-radius:12px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px;">✉</div>
            <h2 style="font-size:18px;font-weight:700;margin:0 0 6px;">Gmail Access Granted</h2>
            <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0 0 20px;">
              Please confirm the Gmail address you just selected so JobMatch AI displays <strong>"Sending as: &lt;your email&gt;"</strong>.
            </p>
            <form id="emailForm" onsubmit="submitEmail(event)" style="display:flex;flex-direction:column;gap:12px;">
              <input id="emailInput" type="email" placeholder="e.g. yourname@gmail.com" required style="padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;outline:none;" />
              <button type="submit" style="padding:10px 16px;background:#2563eb;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Confirm Sender Address</button>
            </form>
          </div>
          <script>
            async function submitEmail(e) {
              e.preventDefault();
              const email = document.getElementById('emailInput').value.trim();
              if (!email) return;
              try {
                await fetch('/api/auth/google/confirm-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-user-id': '${userId}' },
                  body: JSON.stringify({ email })
                });
                if (window.opener) {
                  window.opener.postMessage({ type: 'GMAIL_CONNECTED', email }, '*');
                  setTimeout(() => window.close(), 500);
                } else {
                  window.location.href = '/?gmail_connected=true&email=' + encodeURIComponent(email);
                }
              } catch (err) {
                alert('Failed to save email address.');
              }
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('OAuth token exchange error:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;padding:30px;">
        <h3 style="color:#dc2626;">Gmail Authorization Failed</h3>
        <p>${err.message}</p>
        <button onclick="window.close()" style="padding:8px 16px;cursor:pointer;">Close Window</button>
      </body></html>
    `);
  }
});

// Endpoint to confirm or update connected Gmail address
app.post('/api/auth/google/confirm-email', (req, res) => {
  const userId = getUserId(req);
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid Gmail address is required.' });
  }
  const user = db.setConnectedGmail(userId, email.trim());
  res.json({ success: true, user });
});

// Demo/Testing Connect Endpoint (allows quick verification even before GCP configuration)
app.post('/api/auth/google/demo-connect', (req, res) => {
  const userId = getUserId(req);
  const { email } = req.body;
  const targetEmail = (email && email.trim()) || 'alex.chen.dev@gmail.com';
  db.saveEncryptedToken(userId, `demo:${targetEmail}`);
  const user = db.setConnectedGmail(userId, targetEmail);
  res.json({ success: true, user, email: targetEmail });
});

app.post('/api/auth/disconnect-gmail', async (req, res) => {
  const userId = getUserId(req);
  await disconnectUserGmail(userId);
  res.json({ success: true, message: 'Gmail account disconnected and token revoked.' });
});

// GDPR / DPDP "Delete My Data"
app.delete('/api/privacy/delete-my-data', (req, res) => {
  const userId = getUserId(req);
  db.deleteUserData(userId);
  res.json({ success: true, message: 'All personal data, resumes, analyses, and tokens deleted.' });
});

// ==========================================
// 3. RESUME MANAGER ENDPOINTS (Max 3)
// ==========================================
app.get('/api/resumes', (req, res) => {
  const userId = getUserId(req);
  const resumes = db.getUserResumes(userId);
  res.json(resumes);
});

app.post('/api/resumes', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, structuredData, rawText, file } = req.body;

    let finalStructured: StructuredResume;

    if (structuredData) {
      finalStructured = structuredData;
    } else {
      let textToParse = rawText || '';

      if (file && file.data) {
        const buffer = Buffer.from(file.data, 'base64');
        const filename = (file.name || '').toLowerCase();
        if (filename.endsWith('.docx') || file.mimeType?.includes('word')) {
          const extracted = await mammoth.extractRawText({ buffer });
          textToParse = extracted.value.trim();
        } else {
          textToParse = buffer.toString('utf-8');
        }
      }

      if (!textToParse.trim()) {
        return res.status(400).json({ error: 'Please provide resume text or a valid document.' });
      }

      finalStructured = await parseResumeWithGemini(textToParse);
    }

    const newResume: SavedResumeVersion = {
      id: req.body.id || crypto.randomUUID(),
      userId,
      title: title || 'Primary Resume',
      structuredData: finalStructured,
      fileName: file?.name,
      fileType: file?.mimeType,
      fileSize: file?.size,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = db.saveResume(userId, newResume);
    res.json({ resume: newResume, list: updatedList });
  } catch (err: any) {
    console.error('Resume save error:', err);
    res.status(400).json({ error: err.message || 'Failed to parse/save resume.' });
  }
});

app.delete('/api/resumes/:id', (req, res) => {
  const userId = getUserId(req);
  const updatedList = db.deleteResume(userId, req.params.id);
  res.json(updatedList);
});

// ==========================================
// 4. SSRF-SAFE URL FETCHING
// ==========================================
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    const text = await safeFetchWebPage(url);
    res.json({ text, length: text.length });
  } catch (err: any) {
    console.error('SSRF / Fetch error:', err.message);
    res.status(400).json({
      error: `${err.message} Please use the Paste Text tab instead.`,
    });
  }
});

// ==========================================
// 5. DEEP ANALYSIS PIPELINE (SSE Stream)
// ==========================================
app.post('/api/analyze-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const userId = getUserId(req);
  const user = db.getUser(userId);

  // Free tier rate limit check
  if (user.analysesToday >= DAILY_ANALYSIS_LIMIT) {
    sendEvent('error', {
      message: `Daily free analysis limit of ${DAILY_ANALYSIS_LIMIT} reached for today. Resets daily.`,
    });
    return res.end();
  }

  try {
    const { jdInput, resumeVersionId, rawResumeText, additionalNotes } = req.body;

    // Resolve resume
    let resumeData: StructuredResume | null = null;
    if (resumeVersionId) {
      const saved = db.getUserResumes(userId).find((r) => r.id === resumeVersionId);
      if (saved) resumeData = saved.structuredData;
    }

    if (!resumeData) {
      if (!rawResumeText || !rawResumeText.trim()) {
        sendEvent('error', { message: 'No resume provided. Upload or select a resume.' });
        return res.end();
      }
      sendEvent('step_start', { step: 0, label: 'Parsing resume structure...' });
      resumeData = await parseResumeWithGemini(rawResumeText);
      sendEvent('step_complete', { step: 0 });
    }

    // Step 1: JD Analysis
    sendEvent('step_start', { step: 1, label: 'Analyzing Job Description & extracting requirements...' });
    let jdText = '';
    if (jdInput.mode === 'url' && jdInput.url) {
      jdText = await safeFetchWebPage(jdInput.url);
    } else if (jdInput.mode === 'text') {
      jdText = jdInput.text || '';
    }

    const jdAnalysis = await analyzeJdWithGemini(
      jdText,
      jdInput.mode === 'images' ? jdInput.images : undefined
    );
    sendEvent('step_complete', { step: 1, result: jdAnalysis });

    // Step 2: Company Research (Search Grounded + 7-Day Cache)
    sendEvent('step_start', {
      step: 2,
      label: `Researching ${jdAnalysis.company_name} with Google Search Grounding...`,
    });
    const companyResearch = await researchCompanyWithGemini(
      jdAnalysis.company_name,
      jdAnalysis.job_title
    );
    sendEvent('step_complete', { step: 2, result: companyResearch });

    // Step 3: Resume Match Scoring & 5-8 Concrete Rewrites
    sendEvent('step_start', {
      step: 3,
      label: 'Calculating match fit, ATS keywords, and rewrite suggestions...',
    });
    const resumeMatch = await matchResumeAndJd(
      resumeData,
      jdAnalysis,
      companyResearch,
      additionalNotes
    );
    sendEvent('step_complete', { step: 3, result: resumeMatch });

    // Step 4: Recruiter Contacts Discovery
    sendEvent('step_start', { step: 4, label: 'Discovering HR contacts & verifying email patterns...' });
    const recruiterContacts = await findRecruiterContactsWithGemini(
      jdAnalysis.company_name,
      jdAnalysis.contact_emails_found,
      companyResearch
    );

    // Optional Hunter verification
    if (process.env.HUNTER_API_KEY) {
      for (const contact of recruiterContacts.contacts) {
        if (contact.email) {
          contact.hunter_status = await verifyEmailWithHunter(contact.email);
        }
      }
    }
    sendEvent('step_complete', { step: 4, result: recruiterContacts });

    // Step 5: Tailored Email Generator (Formal, Friendly, Confident, Cover letter, Follow-up)
    sendEvent('step_start', {
      step: 5,
      label: 'Composing tailored outreach emails & follow-up draft...',
    });
    const emails = await generateEmailsWithGemini(
      resumeData,
      jdAnalysis,
      companyResearch,
      additionalNotes
    );
    sendEvent('step_complete', { step: 5, result: emails });

    // Store analysis in history & increment daily counter
    const fullAnalysis: FullJobAnalysis = {
      id: crypto.randomUUID(),
      userId,
      resumeVersionId: resumeVersionId || 'temp',
      jdAnalysis,
      companyResearch,
      resumeMatch,
      recruiterContacts,
      emails,
      createdAt: new Date().toISOString(),
    };

    db.saveAnalysis(fullAnalysis);
    db.incrementAnalysisCount(userId);

    sendEvent('complete', fullAnalysis);
    return res.end();
  } catch (err: any) {
    console.error('Pipeline streaming error:', err);
    sendEvent('error', { message: err.message || 'Pipeline failed.' });
    return res.end();
  }
});

// ==========================================
// 6. EMAIL QUALITY & GMAIL SENDING
// ==========================================
app.post('/api/email/quality-check', (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'Body text is required.' });
  const check = performQualityCheck(body);
  res.json(check);
});

app.post('/api/email/send', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { recipientEmail, subject, body, accessToken, forceIgnoreDuplicate, applicationId } = req.body;

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ error: 'Recipient, subject, and body are required.' });
    }

    const result = await sendEmailViaGmailApi({
      userId,
      recipientEmail,
      subject,
      body,
      forceIgnoreDuplicate,
    });

    // If linked to an application in Kanban tracker, mark status as Applied
    if (applicationId) {
      const appItem = db.getUserApplications(userId).find((a) => a.id === applicationId);
      if (appItem) {
        appItem.status = 'Applied';
        appItem.appliedDate = result.sentAt;
        appItem.sentMessageId = result.messageId;
        appItem.sentEmailSubject = subject;
        appItem.sentEmailBody = body;
        appItem.contactEmail = recipientEmail;
        // Schedule follow-up due date in 7 days
        const followUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        appItem.followUpDueDate = followUp;
        db.saveApplication(appItem);
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('Email send error:', err.message);
    const isDuplicate = err.message.includes('DUPLICATE_WARNING');
    res.status(isDuplicate ? 409 : 500).json({
      error: err.message,
      isDuplicateWarning: isDuplicate,
    });
  }
});

// ==========================================
// 7. KANBAN APPLICATION TRACKER
// ==========================================
app.get('/api/tracker', (req, res) => {
  const userId = getUserId(req);
  res.json(db.getUserApplications(userId));
});

app.post('/api/tracker', (req, res) => {
  const userId = getUserId(req);
  const now = new Date().toISOString();
  const application: TrackerApplication = {
    id: req.body.id || crypto.randomUUID(),
    userId,
    analysisId: req.body.analysisId,
    jobTitle: req.body.jobTitle || 'Untitled Position',
    companyName: req.body.companyName || 'Company',
    location: req.body.location,
    salary: req.body.salary,
    status: req.body.status || 'Saved',
    appliedDate: req.body.appliedDate,
    followUpDueDate: req.body.followUpDueDate,
    lastContactedDate: req.body.lastContactedDate,
    contactEmail: req.body.contactEmail,
    contactName: req.body.contactName,
    matchScore: req.body.matchScore,
    sentEmailSubject: req.body.sentEmailSubject,
    sentEmailBody: req.body.sentEmailBody,
    sentMessageId: req.body.sentMessageId,
    notes: req.body.notes,
    resumeVersionUsed: req.body.resumeVersionUsed,
    createdAt: req.body.createdAt || now,
    updatedAt: now,
  };

  const saved = db.saveApplication(application);
  res.json(saved);
});

app.delete('/api/tracker/:id', (req, res) => {
  const userId = getUserId(req);
  db.deleteApplication(userId, req.params.id);
  res.json({ success: true });
});

// CSV Export for Tracker
app.get('/api/tracker/export-csv', (req, res) => {
  const userId = getUserId(req);
  const apps = db.getUserApplications(userId);

  const headers = [
    'Job Title',
    'Company',
    'Status',
    'Match Score',
    'Applied Date',
    'Follow-Up Due',
    'Contact Email',
    'Notes',
  ];

  const rows = apps.map((a) => [
    `"${(a.jobTitle || '').replace(/"/g, '""')}"`,
    `"${(a.companyName || '').replace(/"/g, '""')}"`,
    `"${a.status}"`,
    `"${a.matchScore ?? ''}"`,
    `"${a.appliedDate || ''}"`,
    `"${a.followUpDueDate || ''}"`,
    `"${a.contactEmail || ''}"`,
    `"${(a.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="jobmatch-applications.csv"');
  res.send(csv);
});

// ==========================================
// 8. VITE SERVER / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JobMatch AI v2.0 running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
