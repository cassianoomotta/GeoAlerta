import {withSession, accessResponse} from '@/server/access/session';
import {AccessError} from '@/server/access/context';
import {readPrivatePhoto} from '@/features/occurrences/photos/service';
import {PhotoError} from '@/features/occurrences/photos/contracts';
import {photoResponse} from '@/features/occurrences/photos/http';
import {privateStorage} from '@/server/photos/storage';
export const runtime = 'nodejs';
export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params;
    const result = await withSession(async (tx, actor) => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AccessError(404, 'NOT_FOUND');
      // Instantiate Storage only after capacity/RLS lookup to keep denials independent of configuration.
      const storage = {
        assertPrivate: () => privateStorage().assertPrivate(),
        upload: async () => { throw new Error('Read-only adapter'); },
        sign: (key: string, seconds: number) => privateStorage().sign(key, seconds),
      };
      return readPrivatePhoto(actor, id, async occurrenceId => {
        const rows = await tx.$queryRaw<{objectKey: string | null; groupId: string; municipalityId: string}[]>`SELECT p.photo_object_key AS "objectKey",o.group_id AS "groupId",g.municipality_id AS "municipalityId" FROM public.occurrences o JOIN public.occurrence_private_data p ON p.occurrence_id=o.id JOIN public.groups g ON g.id=o.group_id WHERE o.id=${occurrenceId}::uuid AND o.deleted_at IS NULL`;
        return rows[0] ?? null;
      }, storage);
    });
    return Response.json(result, {headers: {'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'}});
  } catch(error) { return error instanceof PhotoError ? photoResponse(error) : accessResponse(error); }
}
