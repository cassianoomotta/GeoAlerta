import {validateIdempotencyKey, PublicInputError} from '@/features/occurrences/public-input';
import {readPhotoForm, photoResponse} from '@/features/occurrences/photos/http';
import {PhotoError} from '@/features/occurrences/photos/contracts';
import {stageVerifiedPhoto} from '@/features/occurrences/photos/service';
import {verifyPhoto} from '@/server/photos/image';
import {privateStorage, photoSecret} from '@/server/photos/storage';
import {reservePhotoUpload, IntakeError} from '@/server/occurrences/intake';
import {resolveOrigin} from '@/server/occurrences/origin';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const key = validateIdempotencyKey(request.headers.get('Idempotency-Key'));
    await reservePhotoUpload(key, resolveOrigin(request.headers));
    const photo = await verifyPhoto(await readPhotoForm(request));
    const result = await stageVerifiedPhoto(photo, key, photoSecret(), privateStorage());
    return Response.json(result, {status: 201, headers: {'Cache-Control': 'no-store'}});
  } catch(error) {
    return photoResponse(error instanceof PublicInputError ? new PhotoError(422, 'INVALID_INPUT') : error instanceof IntakeError ? new PhotoError(error.status, error.code) : error);
  }
}
