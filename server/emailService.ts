import { db } from './database';
import { encryptSecret, decryptSecret } from './security';
import { QualityCheckSchema } from '../shared/types';
import crypto from 'crypto';

const DAILY_EMAIL_LIMIT = parseInt(process.env.DAILY_EMAIL_LIMIT || '20', 10);
const COOLDOWN_SECONDS = 15;

// ==========================================
// EMAIL QUALITY & SPAM CHECKER
// ==========================================
export function performQualityCheck(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isIdealLength = wordCount >= 140 && wordCount <= 220;

  // Placeholder regexes, e.g. [Company], [Name], <Insert Name>, {title}
  const placeholderRegex = /\[[A-Za-z0-9_\s]{2,}\]|\<[A-Za-z0-9_\s]{2,}\>|\{[A-Za-z0-9_\s]{2,}\}/g;
  const hasUnfilledPlaceholders = placeholderRegex.test(body);

  // Missing attachment mention check
  const attachmentMention = /(attach|enclosed|resume attached|cv attached)/i.test(body);

  // Cliche detection
  const cliches = [
    'writing to express my interest',
    'think outside the box',
    'synergy',
    'hard worker',
    'go-getter',
    'perfect fit',
    'proven track record of success',
  ];
  const clicheWarnings = cliches.filter((c) => body.toLowerCase().includes(c));

  return QualityCheckSchema.parse({
    word_count: wordCount,
    is_ideal_length: isIdealLength,
    has_unfilled_placeholders: hasUnfilledPlaceholders,
    missing_attachment_mention: attachmentMention,
    cliche_warnings: clicheWarnings,
  });
}

// ==========================================
// OPTIONAL HUNTER.IO EMAIL VERIFICATION
// ==========================================
export async function verifyEmailWithHunter(email: string): Promise<'valid' | 'risky' | 'invalid' | 'not_checked'> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return 'not_checked';

  try {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 'not_checked';
    const json = await res.json();
    const result = json.data?.result;
    if (result === 'deliverable') return 'valid';
    if (result === 'risky') return 'risky';
    if (result === 'undeliverable') return 'invalid';
    return 'not_checked';
  } catch (err) {
    console.warn('[Hunter Verification] Failed to verify email:', err);
    return 'not_checked';
  }
}

// ==========================================
// GMAIL OAUTH TOKEN REFRESH & SENDER RESOLUTION
// ==========================================
export async function getFreshAccessTokenForUser(userId: string): Promise<{ token: string; senderEmail: string }> {
  const user = db.getUser(userId);

  if (!user.connectedGmail) {
    throw new Error('GMAIL_NOT_CONNECTED: No Gmail account connected. Please click "Connect Gmail" first.');
  }

  const encryptedRefreshToken = db.getEncryptedToken(userId);
  if (!encryptedRefreshToken) {
    db.setGmailTokenExpired(userId, true);
    throw new Error('GMAIL_TOKEN_EXPIRED: Gmail connection token is missing or was revoked. Please click "Reconnect Gmail".');
  }

  // Handle mock demo token if in simulated test mode
  if (encryptedRefreshToken.startsWith('demo:')) {
    return { token: 'demo_token', senderEmail: user.connectedGmail };
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(encryptedRefreshToken);
  } catch {
    db.setGmailTokenExpired(userId, true);
    throw new Error('GMAIL_TOKEN_EXPIRED: Failed to decrypt Gmail token. Please click "Reconnect Gmail".');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_UNCONFIGURED: Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not set in the server environment.');
  }

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) {
    const errorData = await refreshRes.json().catch(() => ({}));
    db.setGmailTokenExpired(userId, true);
    throw new Error(`GMAIL_TOKEN_EXPIRED: Gmail authorization expired or was revoked (${errorData.error_description || errorData.error || 'invalid_grant'}). Please click "Reconnect Gmail".`);
  }

  const refreshData = await refreshRes.json();
  db.setGmailTokenExpired(userId, false);
  return { token: refreshData.access_token, senderEmail: user.connectedGmail };
}

// ==========================================
// GMAIL SENDING & SAFETY CONTROLS
// ==========================================
export interface SendEmailPayload {
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  forceIgnoreDuplicate?: boolean;
}

export async function sendEmailViaGmailApi(payload: SendEmailPayload) {
  const { userId, recipientEmail, subject, body, forceIgnoreDuplicate } = payload;
  const user = db.getUser(userId);

  // 1. Daily rate limit check (max 20 emails per user per day)
  if (user.emailsSentToday >= DAILY_EMAIL_LIMIT) {
    throw new Error(`Daily email dispatch limit of ${DAILY_EMAIL_LIMIT} emails reached. Resets at midnight UTC.`);
  }

  // 2. Cooldown check
  if (user.lastEmailSentAt) {
    const elapsedSeconds = (Date.now() - new Date(user.lastEmailSentAt).getTime()) / 1000;
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(COOLDOWN_SECONDS - elapsedSeconds);
      throw new Error(`Please wait ${waitTime} more second(s) before sending another email (anti-spam cooldown).`);
    }
  }

  // 3. 7-day duplicate send check
  const recentSend = db.checkRecentEmailToRecipient(userId, recipientEmail);
  if (recentSend && !forceIgnoreDuplicate) {
    throw new Error(`DUPLICATE_WARNING: You previously sent an outreach email to ${recipientEmail} on ${new Date(recentSend.sentAt).toLocaleDateString()}. Please confirm if you wish to send again.`);
  }

  // 4. Resolve fresh access token & sender address
  const { token, senderEmail } = await getFreshAccessTokenForUser(userId);

  // 5. Construct RFC 2822 email payload (Sender is ALWAYS the connected Gmail)
  const emailLines = [
    `From: ${senderEmail}`,
    `To: ${recipientEmail}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ];

  const rawRfc2822 = emailLines.join('\r\n');
  const base64UrlEncoded = Buffer.from(rawRfc2822)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  let messageId = crypto.randomUUID();

  // If not simulated demo token, dispatch to Google Gmail API
  if (token !== 'demo_token') {
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64UrlEncoded }),
    });

    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      if (sendRes.status === 401) {
        db.setGmailTokenExpired(userId, true);
        throw new Error('GMAIL_TOKEN_EXPIRED: Gmail token expired or unauthorized. Please click "Reconnect Gmail".');
      }
      throw new Error(errData.error?.message || `Gmail API returned status ${sendRes.status}`);
    }

    const sendData = await sendRes.json();
    messageId = sendData.id || messageId;
  }

  // 6. Log sent email in DB
  const sentRecord = {
    id: crypto.randomUUID(),
    userId,
    recipientEmail,
    subject,
    messageId,
    sentAt: new Date().toISOString(),
  };

  db.logSentEmail(sentRecord);

  return {
    success: true,
    messageId,
    senderEmail,
    sentAt: sentRecord.sentAt,
  };
}

// Disconnect Gmail & revoke token
export async function disconnectUserGmail(userId: string) {
  const encrypted = db.getEncryptedToken(userId);
  if (encrypted && !encrypted.startsWith('demo:')) {
    try {
      const refreshToken = decryptSecret(encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e) {
      console.warn('Token revocation notice:', e);
    }
  }
  db.disconnectUserGmail(userId);
}
