import 'server-only';
import {createClient} from '@supabase/supabase-js';
import type {PrivatePhotoStorage, VerifiedPhoto} from '@/features/occurrences/photos/contracts';
export const PHOTO_BUCKET = 'core-occurrence-evidence';
export function photoSecret(): string {
  const secret = process.env.PHOTO_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) throw new Error('Photo token configuration unavailable.');
  return secret;
}
export function privateStorage(): PrivatePhotoStorage {
  // Lazy initialization: no browser credential, anon fallback or bucket creation.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Private Storage configuration unavailable.');
  const client = createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}});
  return {
    async assertPrivate() {
      const {data, error} = await client.storage.getBucket(PHOTO_BUCKET);
      if (error || !data || data.public) throw new Error('Private bucket unavailable.');
    },
    async upload(objectKey: string, photo: VerifiedPhoto) {
      const {error} = await client.storage.from(PHOTO_BUCKET).upload(objectKey, photo.bytes, {contentType: photo.mime, upsert: false, cacheControl: '0'});
      if (error) throw new Error('Private upload failed.');
    },
    async sign(objectKey: string, seconds: number) {
      const {data, error} = await client.storage.from(PHOTO_BUCKET).createSignedUrl(objectKey, seconds);
      if (error || !data?.signedUrl) throw new Error('Private photo unavailable.');
      return data.signedUrl;
    },
  };
}
