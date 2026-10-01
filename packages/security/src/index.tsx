import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { logger } from '@sentinelqa/logger';

// Reject non-public addresses both as URL literals and in every DNS answer.
export function isPublicIpAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(ip) === 4) {
    const [a = 0, b = 0, c = 0] = ip.split('.').map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(ip) === 6) {
    // Public IPv6 unicast is within 2000::/3. Exclude documentation space.
    const first = parseInt(ip.split(':')[0] || '0', 16);
    return first >= 0x2000 && first <= 0x3fff && !ip.startsWith('2001:db8:');
  }
  return false;
}

export async function validateTargetUrl(urlString: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlString);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return false;
    }
    if (parsedUrl.username || parsedUrl.password) return false;
    const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, '');
    if (isIP(hostname)) return isPublicIpAddress(hostname);
    const answers = await lookup(hostname, { all: true, verbatim: true });
    return answers.length > 0 && answers.every(({ address }) => isPublicIpAddress(address));
  } catch (error) {
    logger.warn({ error }, 'URL validation failed');
    return false;
  }
}

function credentialKey(): Buffer {
  const secret = process.env['ENCRYPTION_MASTER_KEY'];
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must contain at least 32 bytes');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptCredential(secretText: string): string {
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', credentialKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secretText, 'utf8'), cipher.final()]);
    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
  } catch (error) {
    logger.error({ error }, 'Credential encryption failed');
    throw new Error('SEC_ENCRYPT_FAIL');
  }
}

export function decryptCredential(cipherText: string): string {
  try {
    const [version, ivText, tagText, encryptedText] = cipherText.split(':');
    if (version !== 'v1' || !ivText || !tagText || !encryptedText) {
      throw new Error('Unsupported credential format');
    }
    const decipher = createDecipheriv('aes-256-gcm', credentialKey(), Buffer.from(ivText, 'base64'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('SEC_DECRYPT_FAIL');
  }
}

export * from './env';

