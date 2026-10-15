import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './database';
import { encryptSecret } from './security';
import { disconnectUserGmail } from './emailService';
import {
  SessionUser,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  readStateCookie,
  clearStateCookie,
} from './session';

/**
 * Two separate Google permission requests, both returning to ONE callback URL
 * (so your existing Authorized redirect URI keeps working):
 *
 *   1. "login": scope = openid email profile        -> who you are (sign in to the app)
 *   2. "gmail": scope = openid email https://www.googleapis.com/auth/gmail.send     -> permission to send mail
 *
 * Both are full-page redirects, no popup, so nothing depends on window.opener.
 */

export const authRouter = Router();

const LOGIN_SCOPE = 'openid email profile';
const GMAIL_SCOPE = 'openid email https://www.googleapis.com/auth/gmail.send';
const DAILY_ANALYSIS_LIMIT = parseInt(process.env.DAILY_ANALYSIS_LIMIT || '5', 10);

// Read env lazily so values from .env are available (dotenv runs after imports).
export function oauthConfig() {
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${appUrl}/auth/google/callback`,
  };
}

export function buildAuthUrl(purpose: 'login' | 'gmail', nonce: string): string {
  const { clientId, redirectUri } = oauthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: `${purpose}.${nonce}`,
  });

  if (purpose === 'login') {
    params.set('scope', LOGIN_SCOPE);
    params.set('prompt', 'select_account');
  } else {
    params.set('scope', GMAIL_SCOPE);
    params.set('access_type', 'offline'); // needed to receive a refresh token
    params.set('prompt', 'consent select_account'); // always show account chooser
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<any> {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const data: any = await res.json().catch(() => ({}));

  // Resilient fallback: If redirect_uri_mismatch occurs, test the alternate callback format
  if (!res.ok && data.error === 'redirect_uri_mismatch') {
    const alternateUri = redirectUri.includes('/api/auth/google/callback')
      ? redirectUri.replace('/api/auth/google/callback', '/auth/google/callback')
      : redirectUri.replace('/auth/google/callback', '/api/auth/google/callback');

    if (alternateUri !== redirectUri) {
      const altRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: alternateUri,
          grant_type: 'authorization_code',
        }),
      });
      const altData: any = await altRes.json().catch(() => ({}));
      if (altRes.ok) {
        return altData;
      }
    }
  }

  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code.');
  }
  return data;
}

// The ID token comes straight from Google's token endpoint over HTTPS using our
// client secret, so decoding it without re-checking the signature is acceptable.
export function decodeIdToken(token: string | undefined): any {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Handle Google OAuth callback on the server (GET /auth/google/callback or GET /api/auth/google/callback).
 * 1. Verify state cookie
 * 2. Exchange authorization code for tokens
 * 3. Handle 'login' (set signed session cookie, redirect '/')
 * 4. Handle 'gmail' (save encrypted refresh token, record Gmail address, redirect '/?gmail=connected&email=...')
 * 5. On error, redirect '/?gmail=error&reason=...'
 */
export async function handleGoogleCallback(req: Request, res: Response) {
  const { code, state, error } = req.query;

  if (error) {
    clearStateCookie(res);
    return res.redirect(`/?gmail=error&reason=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    clearStateCookie(res);
    return res.redirect(`/?gmail=error&reason=${encodeURIComponent('Missing authorization code or state parameter.')}`);
  }

  const [purpose, nonce] = String(state).split('.');
  const savedNonce = readStateCookie(req);
  clearStateCookie(res);

  if (!savedNonce || savedNonce !== nonce) {
    return res.redirect(`/?gmail=error&reason=${encodeURIComponent('Invalid or expired OAuth state.')}`);
  }

  try {
    const tokenData = await exchangeCode(String(code));
    const payload = decodeIdToken(tokenData.id_token);

    if (purpose === 'login') {
      const email = payload?.email;
      const sub = payload?.sub;
      if (!email || !sub) {
        throw new Error('Google did not return user profile details in ID token.');
      }

      const internalId = sub.startsWith('g_') ? sub : `g_${sub}`;
      const sessionUser: SessionUser = {
        id: internalId,
        email,
        name: payload.name || email.split('@')[0],
        picture: payload.picture,
      };

      const userRecord = db.getUser(internalId);
      userRecord.email = sessionUser.email;
      userRecord.name = sessionUser.name;
      if (sessionUser.picture) {
        userRecord.picture = sessionUser.picture;
      }

      setSessionCookie(res, sessionUser);
      return res.redirect('/');
    }

    if (purpose === 'gmail') {
      if (!req.user) {
        return res.redirect(`/?gmail=error&reason=${encodeURIComponent('Please sign in before connecting your Gmail account.')}`);
      }

      if (tokenData.refresh_token) {
        const encrypted = encryptSecret(tokenData.refresh_token);
        db.saveEncryptedToken(req.user.id, encrypted);
      }

      // Read Gmail address from ID token (since openid email scope was requested)
      let emailAddress = payload?.email;

      // Fallback: Check userinfo endpoint if ID token payload missing email
      if (!emailAddress && tokenData.access_token) {
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (userinfoRes.ok) {
            const info = await userinfoRes.json();
            if (info.email) emailAddress = info.email;
          }
        } catch {
          // Ignored
        }
      }

      if (!emailAddress) {
        throw new Error('Unable to resolve Gmail sender address from authorization.');
      }

      db.setConnectedGmail(req.user.id, emailAddress);
      return res.redirect(`/?gmail=connected&email=${encodeURIComponent(emailAddress)}`);
    }

    throw new Error('Unrecognized authorization purpose.');
  } catch (err: any) {
    console.error('OAuth token exchange error:', err);
    return res.redirect(`/?gmail=error&reason=${encodeURIComponent(err.message || 'Authorization failed.')}`);
  }
}

// ==========================================
// ROUTES
// ==========================================

// Current user profile & authentication state
authRouter.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    return res.json({
      authenticated: false,
      user: null,
      hasGmailToken: false,
      isTokenExpired: false,
      gmailTokenExpired: false,
      dailyAnalysisLimit: DAILY_ANALYSIS_LIMIT,
    });
  }

  const userId = req.user.id;
  const user = db.getUser(userId);

  // Sync session profile details
  user.email = req.user.email;
  user.name = req.user.name;
  if (req.user.picture) {
    user.picture = req.user.picture;
  }

  const hasGmailToken = !!db.getEncryptedToken(userId);
  const isExpired = !!user.gmailTokenExpired || (!!user.connectedGmail && !hasGmailToken);

  res.json({
    authenticated: true,
    user: req.user,
    ...user,
    hasGmailToken,
    isTokenExpired: isExpired,
    gmailTokenExpired: isExpired,
    dailyAnalysisLimit: DAILY_ANALYSIS_LIMIT,
  });
});

// User consent update (GDPR / DPDP)
authRouter.post('/consent', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { consented } = req.body;
  const updated = db.updateUserConsent(userId, !!consented);
  res.json(updated);
});

// App Login: Redirect to Google OAuth
authRouter.get('/login', (req: Request, res: Response) => {
  const { clientId } = oauthConfig();
  if (!clientId) {
    return res.redirect(`/?gmail=error&reason=${encodeURIComponent('GOOGLE_CLIENT_ID is not configured.')}`);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  setStateCookie(res, nonce);
  res.redirect(buildAuthUrl('login', nonce));
});

// Gmail Connection: Generate URL (for JSON clients)
authRouter.get('/google/url', (req: Request, res: Response) => {
  const { clientId, redirectUri } = oauthConfig();
  if (!clientId) {
    return res.json({
      configured: false,
      redirectUri,
      error: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in server environment variables.',
    });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  setStateCookie(res, nonce);
  const url = buildAuthUrl('gmail', nonce);
  res.json({ configured: true, url, redirectUri, clientId });
});

// Gmail Connection: Direct Full-Page Redirect
authRouter.get('/gmail/connect', (req: Request, res: Response) => {
  const { clientId } = oauthConfig();
  if (!clientId) {
    return res.redirect(`/?gmail=error&reason=${encodeURIComponent('GOOGLE_CLIENT_ID is not configured.')}`);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  setStateCookie(res, nonce);
  res.redirect(buildAuthUrl('gmail', nonce));
});

// Callback route mounted under /api/auth/google/callback
authRouter.get('/google/callback', handleGoogleCallback);

// Logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

authRouter.get('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.redirect('/');
});

// Disconnect Gmail
authRouter.post('/disconnect-gmail', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await disconnectUserGmail(userId);
  res.json({ success: true, message: 'Gmail account disconnected and token revoked.' });
});

// Demo login for testing environments without Google OAuth credentials
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

// Demo Gmail connect for local testing
authRouter.post('/google/demo-connect', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { email } = req.body;
  const targetEmail = (email && email.trim()) || 'alex.chen.dev@gmail.com';
  db.saveEncryptedToken(userId, `demo:${targetEmail}`);
  const user = db.setConnectedGmail(userId, targetEmail);
  res.json({ success: true, user, email: targetEmail });
});
