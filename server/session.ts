import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Stateless signed-cookie sessions. No database and no extra npm packages.
 * The cookie is HttpOnly (JavaScript cannot read it), SameSite=Lax (blocks
 * cross-site POST/DELETE) and Secure whenever the connection is HTTPS.
 * Sessions survive server restarts because they are verified with SESSION_SECRET.
 */

export interface SessionUser {
  id: string; // internal user id, e.g. "g_1234567890" (Google account id)
  email: string;
  name: string;
  picture?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const SESSION_COOKIE = 'jm_session';
const STATE_COOKIE = 'jm_oauth_state';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const STATE_TTL_SECONDS = 60 * 10; // 10 minutes

function getSecret(): string {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 16) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set it to a random string of 32+ characters ' +
        "(generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")."
    );
  }
  return s;
}

/** Call once at startup so a missing secret fails fast instead of at first login. */
export function assertSessionConfig(): void {
  getSecret();
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(user: SessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ u: user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data?.exp || data.exp < Date.now() / 1000) return null;
    if (!data?.u?.id || !data?.u?.email) return null;
    return data.u as SessionUser;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

// "Secure" = the browser only sends the cookie over HTTPS. We decide from the real
// connection (req.secure), which is correct on Render (HTTPS) and on http://localhost.
function cookieString(res: Response, name: string, value: string, maxAgeSeconds: number): string {
  return (
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}` +
    (res.req?.secure ? '; Secure' : '')
  );
}

export function setSessionCookie(res: Response, user: SessionUser): void {
  res.append('Set-Cookie', cookieString(res, SESSION_COOKIE, createSessionToken(user), SESSION_TTL_SECONDS));
}

export function clearSessionCookie(res: Response): void {
  res.append('Set-Cookie', cookieString(res, SESSION_COOKIE, '', 0));
}

/** Short-lived random value that ties an OAuth round trip to this browser (CSRF protection). */
export function setStateCookie(res: Response, nonce: string): void {
  res.append('Set-Cookie', cookieString(res, STATE_COOKIE, nonce, STATE_TTL_SECONDS));
}

export function readStateCookie(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[STATE_COOKIE];
}

export function clearStateCookie(res: Response): void {
  res.append('Set-Cookie', cookieString(res, STATE_COOKIE, '', 0));
}

/** Runs on every request: fills req.user if a valid session cookie is present. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  req.user = readSessionToken(parseCookies(req.headers.cookie)[SESSION_COOKIE]) || undefined;
  next();
}

/** Blocks the request with 401 unless the user is signed in. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Please sign in to continue.', code: 'UNAUTHENTICATED' });
    return;
  }
  next();
}
