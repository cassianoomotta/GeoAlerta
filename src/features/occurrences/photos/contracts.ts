export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_READ_SECONDS = 60;
export const PHOTO_TOKEN_SECONDS = 15 * 60;
export class PhotoError extends Error {
  constructor(public status: 404 | 409 | 422 | 429 | 503, public code: string) { super(code); }
}
export type VerifiedPhoto = { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' | 'image/webp'; extension: 'jpg' | 'png' | 'webp' };
export interface PrivatePhotoStorage {
  assertPrivate(): Promise<void>;
  upload(key: string, photo: VerifiedPhoto): Promise<void>;
  sign(key: string, seconds: number): Promise<string>;
}
export function photoMetadata(file: {name: string; type: string; size: number}) {
  const extension = file.name.split('.').at(-1)?.toLowerCase();
  const mime = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : null;
  if (!mime || mime !== file.type || file.size < 1 || file.size > MAX_PHOTO_BYTES) throw new PhotoError(422, 'INVALID_PHOTO');
  return mime;
}
