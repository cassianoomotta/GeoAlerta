import type {OpenResult} from '../contracts';
export type PhotoAttempt = {key: string; baseBody: string; file: File | null; token?: string; finalBody?: string; uploadFailed: boolean; submissionStarted: boolean};
export class PhotoUploadFailure extends Error {}
export interface PublicPhotoTransport {
  stage(file: File, key: string): Promise<string>;
  open(body: string, key: string): Promise<OpenResult>;
}
export async function sendPublicAttempt(attempt: PhotoAttempt, withoutPhoto: boolean, transport: PublicPhotoTransport): Promise<OpenResult> {
  // An omission can be chosen before upload; a submitted body must stay immutable on retry.
  if (withoutPhoto && attempt.submissionStarted && attempt.finalBody && Object.hasOwn(JSON.parse(attempt.finalBody),'photoToken')) throw new Error('A foto de um envio já iniciado não pode ser removida.');
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
