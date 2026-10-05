import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** Mã hóa secret TOTP (AES-256-GCM) trước khi lưu DB; khóa suy ra từ JWT_SECRET. */
const key = () => createHash('sha256').update(process.env.JWT_SECRET ?? 'default-secret').digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(stored: string): string {
  const [iv, tag, enc] = stored.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
