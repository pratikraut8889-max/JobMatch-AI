import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './database';
import { encryptSecret } from './security';
import { disconnectUserGmail } from './emailService';
import {
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  readStateCookie,
  clearStateCookie,
  SessionUser,
} from './session';

export const authRouter = Router();

const DAILY_ANALYSIS_LIMIT = parseInt(process.env.DAILY_ANALYSIS_LIMIT || '5', 10);

function getAppUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function getUserId(req: Request): string {
  return req.user?.id || 'default-user-01';
}

// ==========================================
// 1. SESSION & CURRENT USER PROFILE
// ==========================================
authRouter.get('/me', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const user = db.getUser(userId);

  // If user is authenticated via session, sync name, email, and avatar
  if (req.user) {
    user.email = req.user.email;
    user.name = req.user.name;
    if (req.user.picture) {
      user.picture = req.user.picture;
    }
  }

  const hasGmailToken = !!db.getEncryptedToken(userId);
  const isExpired = !!user.gmailTokenExpired || (!!user.connectedGmail && !hasGmailToken);

  res.json({
    authenticated: !!req.user,
    user: req.user || null,
    ...user,
    hasGmailToken,
    isTokenExpired: isExpired,
    gmailTokenExpired: isExpired,
    dailyAnalysisLimit: DAILY_ANALYSIS_LIMIT,
  });
});

// User consent update (GDPR / DPDP)
authRouter.post('/consent', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { consented } = req.body;
  const updated = db.updateUserConsent(userId, !!consented);
  res.json(updated);
});

// ==========================================
// 2. SIGN IN WITH GOOGLE (APP AUTH)
// ==========================================
authRouter.get('/login', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${getAppUrl(req)}/api/auth/google/callback`;

  if (!clientId) {
    return res.status(500).send('GOOGLE_CLIENT_ID is not configured in server environment.');
  }

  const nonce = 'login_' + crypto.randomBytes(16).toString('hex');
  setStateCookie(res, nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state: nonce,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(authUrl);
});

// Demo login for environments where GCP credentials are not yet provisioned
authRouter.post('/demo-login', (req: Request, res: Response) => {
  const demoUser: SessionUser = {
    id: 'g_demo_user_101',
    email: 'alex.jobseeker@example.com',
    name: 'Alex Chen (Demo Seeker)',
  };

  const userRecord = db.getUser(demoUser.id);
  userRecord.email = demoUser.email;
  userRecord.name = demoUser.name;
  userRecord.hasConsented = true;

  setSessionCookie(res, demoUser);
  res.json({ success: true, user: demoUser });
});

// Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

authRouter.get('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.redirect('/');
});

// ==========================================
// 3. GMAIL OAUTH URL GENERATION & CONNECT
// ==========================================
// Generate Google OAuth URL for Gmail Sending (Full-Page or Client Navigation)
authRouter.get('/google/url', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${getAppUrl(req)}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return res.json({
      configured: false,
      redirectUri,
      error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in server environment variables.',
    });
  }

  const nonce = 'gmail_' + userId + '_' + crypto.randomBytes(8).toString('hex');
  setStateCookie(res, nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent select_account',
    state: nonce,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ configured: true, url, redirectUri, clientId });
});

// Direct Full-Page Redirect to Gmail OAuth
authRouter.get('/gmail/connect', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${getAppUrl(req)}/api/auth/google/callback`;

  if (!clientId) {
    return res.redirect('/?gmail_error=GOOGLE_CLIENT_ID+not+configured');
  }

  const nonce = 'gmail_' + userId + '_' + crypto.randomBytes(8).toString('hex');
  setStateCookie(res, nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent select_account',
    state: nonce,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ==========================================
// 4. GOOGLE OAUTH CALLBACK (FULL-PAGE REDIRECT)
// ==========================================
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    const errorMsg = String(error);
    return res.redirect(`/?gmail_error=${encodeURIComponent(errorMsg)}`);
  }

  if (!code) {
    return res.redirect('/?gmail_error=Missing+authorization+code');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${getAppUrl(req)}/api/auth/google/callback`;

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
      throw new Error(errJson.error_description || errJson.error || 'Failed to exchange token with Google');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    const stateStr = String(state || '');

    // Case A: User Login Flow (scope=openid email profile)
    if (stateStr.startsWith('login_')) {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userinfoRes.ok) {
        throw new Error('Failed to retrieve user profile from Google');
      }

      const userInfo = await userinfoRes.json();
      const sub = userInfo.sub;
      const internalId = sub.startsWith('g_') ? sub : `g_${sub}`;

      const sessionUser: SessionUser = {
        id: internalId,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture,
      };

      const userRecord = db.getUser(internalId);
      userRecord.email = sessionUser.email;
      userRecord.name = sessionUser.name;
      if (sessionUser.picture) userRecord.picture = sessionUser.picture;

      setSessionCookie(res, sessionUser);
      clearStateCookie(res);
      return res.redirect('/');
    }

    // Case B: Gmail Sending Authorization Flow (scope=gmail.send)
    // Resolve target userId
    let targetUserId = getUserId(req);
    if (stateStr.startsWith('gmail_')) {
      const parts = stateStr.split('_');
      if (parts.length >= 2 && parts[1]) {
        targetUserId = parts[1];
      }
    }

    if (refreshToken) {
      const encrypted = encryptSecret(refreshToken);
      db.saveEncryptedToken(targetUserId, encrypted);
    }

    // Try to get user profile from Gmail API
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
      // Ignored if scope does not allow profile read
    }

    // Fallback: If Gmail profile read is restricted under gmail.send, try userinfo endpoint
    if (!emailAddress) {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          if (infoData.email) emailAddress = infoData.email;
        }
      } catch {
        // Ignored
      }
    }

    clearStateCookie(res);

    if (emailAddress) {
      db.setConnectedGmail(targetUserId, emailAddress);
      // Full-Page Redirect back to JobMatch AI app
      return res.redirect(`/?gmail_connected=true&email=${encodeURIComponent(emailAddress)}`);
    }

    // If email could not be read automatically due to restricted gmail.send scope,
    // show clean confirmation screen that redirects back with full-page navigation
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Confirm Connected Gmail - JobMatch AI</title>
        </head>
        <body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:48px 20px;background:#f8fafc;color:#0f172a;">
          <div style="max-width:440px;margin:0 auto;background:white;padding:32px;border-radius:18px;border:1px solid #e2e8f0;box-shadow:0 10px 15px -3px rgba(0,0,0,0.06);">
            <div style="width:48px;height:48px;border-radius:14px;background:#eff6ff;color:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:24px;">✉</div>
            <h2 style="font-size:20px;font-weight:700;margin:0 0 8px;">Gmail Connected</h2>
            <p style="color:#64748b;font-size:13px;line-height:1.5;margin:0 0 24px;">
              Please confirm the Gmail address you just selected so JobMatch AI can display <strong>"Sending as: &lt;your email&gt;"</strong>.
            </p>
            <form id="emailForm" onsubmit="submitEmail(event)" style="display:flex;flex-direction:column;gap:14px;">
              <input id="emailInput" type="email" placeholder="e.g. yourname@gmail.com" required style="padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;outline:none;" />
              <button type="submit" style="padding:12px 18px;background:#2563eb;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Confirm Sender Address</button>
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
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                window.location.href = '/?gmail_connected=true&email=' + encodeURIComponent(email);
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
    return res.redirect(`/?gmail_error=${encodeURIComponent(err.message || 'Gmail connection failed')}`);
  }
});

// ==========================================
// 5. CONFIRM EMAIL & DEMO ENDPOINTS
// ==========================================
authRouter.post('/google/confirm-email', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid Gmail address is required.' });
  }
  const user = db.setConnectedGmail(userId, email.trim());
  res.json({ success: true, user });
});

authRouter.post('/google/demo-connect', (req: Request, res: Response) => {
  const userId = getUserId(req);
  const { email } = req.body;
  const targetEmail = (email && email.trim()) || 'alex.chen.dev@gmail.com';
  db.saveEncryptedToken(userId, `demo:${targetEmail}`);
  const user = db.setConnectedGmail(userId, targetEmail);
  res.json({ success: true, user, email: targetEmail });
});

authRouter.post('/disconnect-gmail', async (req: Request, res: Response) => {
  const userId = getUserId(req);
  await disconnectUserGmail(userId);
  res.json({ success: true, message: 'Gmail account disconnected and token revoked.' });
});
