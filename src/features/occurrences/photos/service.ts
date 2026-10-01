import type {Actor} from '@/features/access/contracts';
import {can} from '@/features/access/domain/permissions';
import {PhotoError, PHOTO_READ_SECONDS, type PrivatePhotoStorage, type VerifiedPhoto} from './contracts';
import {issuePhotoToken} from './token';
export async function stageVerifiedPhoto(photo: VerifiedPhoto, attempt: string, secret: string, storage: PrivatePhotoStorage) {
  const staged = issuePhotoToken(attempt, photo.extension, secret);
  try {
    await storage.assertPrivate();
    await storage.upload(staged.objectKey, photo);
    return {photoToken: staged.photoToken};
  } catch { throw new PhotoError(503, 'PHOTO_UNAVAILABLE'); }
}
export type PhotoReference = {objectKey: string | null; groupId: string; municipalityId: string};
export function isCorePhotoObjectKey(value: unknown): value is string {
  return typeof value === 'string' && /^core\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(value);
}
export async function privatePhotoAvailable(actor: Actor, scope: {groupId: string; municipalityId: string}, findKey: () => Promise<string | null>) {
  if (!can(actor, 'privateData', scope)) return false;
  return isCorePhotoObjectKey(await findKey());
}
export async function readPrivatePhoto(actor: Actor | null, occurrenceId: string, find: (id: string) => Promise<PhotoReference | null>, storage: PrivatePhotoStorage, now = Date.now()) {
  // No lookup and no signing without private-data capacity. Denials share 404.
  if (!actor || !can(actor, 'privateData', {municipalityId: 'sa_patrulha', groupId: actor.groupIds[0]})) throw new PhotoError(404, 'NOT_FOUND');
  const photo = await find(occurrenceId);
  if (!photo?.objectKey || !can(actor, 'privateData', {municipalityId: photo.municipalityId, groupId: photo.groupId}) || !isCorePhotoObjectKey(photo.objectKey)) throw new PhotoError(404, 'NOT_FOUND');
  try {
    await storage.assertPrivate();
    const url = await storage.sign(photo.objectKey, PHOTO_READ_SECONDS);
    return {url, expiresAt: new Date(now + PHOTO_READ_SECONDS * 1000).toISOString()};
  } catch { throw new PhotoError(503, 'PHOTO_UNAVAILABLE'); }
}
