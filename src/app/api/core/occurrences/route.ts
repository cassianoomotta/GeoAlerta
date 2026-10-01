import { createHash } from 'node:crypto';
import { withSession, accessResponse } from '@/server/access/session';
import { parseListFilters, ListInputError } from '@/features/occurrences/list-input';
import { PublicInputError } from '@/features/occurrences/public-input';
import { listOccurrences } from '@/server/occurrences/list';
import type { OpenResult } from '@/features/occurrences/contracts';
import {
  createManualOccurrence,
  ManualOccurrenceAccessError,
  ManualOccurrenceConflictError,
  type CreateManualOccurrencePorts,
} from '@/features/occurrences/application/create-manual-occurrence';
import { classifyOccurrence, persistOccurrence } from '@/server/occurrences/persist';

export const runtime = 'nodejs';
const maximumBodyBytes = 16_384;

export async function GET(request: Request) {
  try {
    const result = await withSession((tx, actor) => listOccurrences(tx, actor, parseListFilters(new URL(request.url).searchParams)));
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return error instanceof ListInputError
      ? Response.json({ error: { code: error.status === 403 ? 'ACCESS_DENIED' : 'INVALID_INPUT', message: error.status === 403 ? 'Grupo não autorizado.' : 'Verifique os filtros, a página e as colunas.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } })
      : accessResponse(error);
  }
}

async function readManualInput(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new PublicInputError();
  const reader = request.body?.getReader();
  if (!reader) throw new PublicInputError();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > maximumBodyBytes) {
        await reader.cancel();
        throw new PublicInputError();
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new PublicInputError();
  }
}

export async function POST(request: Request) {
  try {
    const body = await readManualInput(request);
    const key = request.headers.get('Idempotency-Key');
    const created = await withSession(async (tx, actor) => {
      const ports: CreateManualOccurrencePorts = {
        groupBelongsToMunicipality: async (groupId, municipalityId) => {
          const groups = await tx.$queryRaw<{ id: string }[]>`
            SELECT id::text AS id FROM public.groups
            WHERE id=${groupId}::uuid AND municipality_id=${municipalityId}
          `;
          return groups.length === 1;
        },
        classify: (position) => classifyOccurrence(tx, position),
        createAtomically: async (command) => {
          const databaseKey = `manual:${command.actorId}:${command.groupId}:${command.idempotencyKey}`;
          const requestHash = createHash('sha256').update(JSON.stringify({ groupId: command.groupId, input: command.input })).digest('hex');
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${databaseKey},0))`;
          const existing = await tx.$queryRaw<{ request_hash: string; response: OpenResult }[]>`
            SELECT request_hash,response FROM public.idempotency_keys WHERE key=${databaseKey}
          `;
          if (existing[0]) {
            if (existing[0].request_hash !== requestHash) throw new ManualOccurrenceConflictError(409);
            return { result: existing[0].response, replay: true };
          }

          const classification = await command.classify();
          const result = await persistOccurrence(tx, {
            input: command.input,
            groupId: command.groupId,
            idempotencyKey: databaseKey,
            requestHash,
            classification,
            actorId: command.actorId,
          });
          return { result, replay: false };
        },
      };
      return createManualOccurrence(actor, body, key, ports);
    });
    return Response.json(created.result, { status: created.replay ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof PublicInputError) {
      return Response.json({ error: { code: error.code, message: 'Verifique os campos obrigatórios e obtenha uma localização válida.' } }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof ManualOccurrenceAccessError) {
      return Response.json({ error: { code: error.code, message: 'Acesso não autorizado ao grupo escolhido.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof ManualOccurrenceConflictError) {
      return Response.json({ error: { code: error.code, message: 'Esta chave já foi usada com outros dados.' } }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    return accessResponse(error);
  }
}
