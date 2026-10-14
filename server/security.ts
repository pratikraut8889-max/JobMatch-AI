import crypto from 'crypto';
import dns from 'dns/promises';

// ==========================================
// SSRF PROTECTION
// ==========================================
const PRIVATE_IP_RANGES = [
  /^127\./, // 127.0.0.0/8 Loopback
  /^10\./, // 10.0.0.0/8 Private
  /^192\.168\./, // 192.168.0.0/16 Private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 Private
  /^169\.254\./, // 169.254.0.0/16 Link-local
  /^0\./, // 0.0.0.0/8 Current network
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 Unique local
  /^fe80:/i, // IPv6 Link-local
];

export async function validateUrlForSsrf(inputUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  // Enforce protocol
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are permitted.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost and standard aliases
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) {
    throw new Error('Access to local hostnames is strictly forbidden.');
  }

  // Resolve hostname to IP to block private ranges
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      for (const pattern of PRIVATE_IP_RANGES) {
        if (pattern.test(addr.address)) {
          throw new Error('Access to private or local network IP addresses is blocked.');
        }
      }
    }
  } catch (err: any) {
    if (err.message?.includes('private or local network')) throw err;
    throw new Error(`DNS resolution failed for hostname "${hostname}": ${err.message}`);
  }

  return parsed;
}

export async function safeFetchWebPage(inputUrl: string): Promise<string> {
  const validated = await validateUrlForSsrf(inputUrl);

  const response = await fetch(validated.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JobMatchBot/2.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(10000), // 10s timeout
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Website responded with HTTP status ${response.status} (${response.statusText})`);
  }

  // Ensure content-type is text/html or text/plain
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error('The target URL did not return HTML or plain text.');
  }

  const text = await response.text();
  // Max size limit: 3MB
  if (text.length > 3 * 1024 * 1024) {
    throw new Error('The target webpage exceeds the maximum allowed size (3 MB).');
  }

  // Clean HTML
  const cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 50) {
    throw new Error('The webpage returned empty or unreadable content. Try pasting the job description text.');
  }

  return cleaned.slice(0, 25000); // 25k chars max
}

// ==========================================
// TOKEN ENCRYPTION (AES-256-GCM)
// ==========================================
const ENCRYPTION_KEY_STRING = process.env.ENCRYPTION_KEY || 'jobmatch_super_secure_key_32chars!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_STRING).digest();

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format.');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
