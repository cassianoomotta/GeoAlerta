import {createHash, createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
import {PHOTO_TOKEN_SECONDS, PhotoError} from './contracts';
function hash(key: string) { return createHash('sha256').update(key).digest('hex'); }
function signature(payload: string, secret: string) { return createHmac('sha256', secret).update(`geoalerta.photo.v1:${payload}`).digest(); }
export function issuePhotoToken(attempt: string, extension: 'jpg' | 'png' | 'webp', secret: string, now = Date.now()) {
  if (secret.length < 32) throw new PhotoError(503, 'PHOTO_UNAVAILABLE');
  const objectKey = `core/${randomUUID()}.${extension}`;
  const payload = Buffer.from(JSON.stringify({attempt: hash(attempt), objectKey, expires: now + PHOTO_TOKEN_SECONDS * 1000})).toString('base64url');
  return {objectKey, photoToken: `${payload}.${signature(payload, secret).toString('base64url')}`};
}
export function resolvePhotoToken(token: string, attempt: string, secret: string, now = Date.now()): string {
  if (secret.length < 32) throw new PhotoError(503, 'PHOTO_UNAVAILABLE');
  try {
    if (token.length > 1024) throw new Error();
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) throw new Error();
    const actual = Buffer.from(parts[1], 'base64url'), expected = signature(parts[0], secret);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (value.attempt !== hash(attempt) || !Number.isSafeInteger(value.expires) || value.expires <= now || value.expires > now + PHOTO_TOKEN_SECONDS * 1000 || !/^core\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(value.objectKey)) throw new Error();
    return value.objectKey;
  } catch { throw new PhotoError(422, 'INVALID_PHOTO_TOKEN'); }
}
