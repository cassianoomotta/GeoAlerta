import type {OpenResult} from '../contracts';
export type PhotoAttempt = {key: string; baseBody: string; file: File | null; token?: string; finalBody?: string; uploadFailed: boolean; submissionStarted: boolean};
export class PhotoUploadFailure extends Error {}
export interface PublicPhotoTransport {
  stage(file: File, key: string): Promise<string>;
  open(body: string, key: string): Promise<OpenResult>;
}
export async function sendPublicAttempt(attempt: PhotoAttempt, withoutPhoto: boolean, transport: PublicPhotoTransport): Promise<OpenResult> {
  if (withoutPhoto && (!attempt.uploadFailed || attempt.submissionStarted)) throw new Error('Explicit omission requires a failed upload before submission.');
  if (!attempt.finalBody) {
    if (attempt.file && !withoutPhoto && !attempt.token) {
      try { attempt.token = await transport.stage(attempt.file, attempt.key); attempt.uploadFailed = false; }
      catch(error) { attempt.uploadFailed = true; throw new PhotoUploadFailure(error instanceof Error ? error.message : 'Falha no upload.'); }
    }
    attempt.finalBody = JSON.stringify({...JSON.parse(attempt.baseBody), ...(attempt.token && !withoutPhoto ? {photoToken: attempt.token} : {})});
  }
  attempt.submissionStarted = true;
  return transport.open(attempt.finalBody, attempt.key);
}
