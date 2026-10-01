// Reuse the decoder already shipped with pinned Next 16.3.5; no new dependency.
// This single adapter isolates the version-specific Next internal entry point.
import {getSharp} from 'next/dist/server/image-optimizer.js';
import {MAX_PHOTO_BYTES, photoMetadata, PhotoError, type VerifiedPhoto} from '@/features/occurrences/photos/contracts';
export async function verifyPhoto(file: File): Promise<VerifiedPhoto> {
  const mime = photoMetadata(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== file.size || bytes.length > MAX_PHOTO_BYTES) throw new PhotoError(422, 'INVALID_PHOTO');
  // Check magic before the decoder, so SVG or another supported loader cannot run.
  const kind = bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) ? 'jpeg' : bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png' : bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' ? 'webp' : null;
  if (!kind || mime !== `image/${kind}`) throw new PhotoError(422, 'INVALID_PHOTO');
  try {
    const image = getSharp(1, false)(bytes, {failOn: 'warning', limitInputPixels: 64 * 1024 * 1024});
    const metadata = await image.metadata();
    if (metadata.format !== kind || (metadata.pages ?? 1) !== 1) throw new Error();
    // Decode the complete image and re-encode; omit EXIF/GPS and appended payloads.
    const normalized = await image.rotate().toFormat(kind).toBuffer();
    if (normalized.length > MAX_PHOTO_BYTES) throw new Error();
    return {bytes: normalized, mime, extension: kind === 'jpeg' ? 'jpg' : kind};
  } catch { throw new PhotoError(422, 'INVALID_PHOTO'); }
}
