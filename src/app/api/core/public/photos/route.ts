import {validateIdempotencyKey, PublicInputError} from '@/features/occurrences/public-input';
import {readPhotoForm, photoResponse} from '@/features/occurrences/photos/http';
import {PhotoError} from '@/features/occurrences/photos/contracts';
import {stageVerifiedPhoto} from '@/features/occurrences/photos/service';
import {verifyPhoto} from '@/server/photos/image';
import {privateStorage, photoSecret} from '@/server/photos/storage';
import {reservePhotoUpload, IntakeError} from '@/server/occurrences/intake';
import {resolveOrigin} from '@/server/occurrences/origin';
import {reportPublicFailure} from '@/server/occurrences/public-failure';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  let stage='photo-origin';
  try {
    const key = validateIdempotencyKey(request.headers.get('Idempotency-Key'));
    const origin=resolveOrigin(request.headers);
    stage='photo-reservation';
    await reservePhotoUpload(key, origin);
    stage='photo-verification';
    const photo = await verifyPhoto(await readPhotoForm(request));
    stage='photo-storage';
    const result = await stageVerifiedPhoto(photo, key, photoSecret(), privateStorage());
    return Response.json(result, {status: 201, headers: {'Cache-Control': 'no-store'}});
  } catch(error) {
    if(!(error instanceof PublicInputError)&&!(error instanceof IntakeError)&&(!(error instanceof PhotoError)||error.status===503))reportPublicFailure(error,stage);
    return photoResponse(error instanceof PublicInputError ? new PhotoError(422, 'INVALID_INPUT') : error instanceof IntakeError ? new PhotoError(error.status, error.code) : error);
  }
}
