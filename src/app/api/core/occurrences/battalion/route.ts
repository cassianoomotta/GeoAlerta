import { createHash } from 'node:crypto';
import { BattalionInputError } from '@/features/occurrences/battalion-input';
import {
  BattalionConfigurationError,
  BattalionOccurrenceAccessError,
  BattalionOccurrenceConflictError,
  createBattalionOccurrence,
  type CreateBattalionOccurrencePorts,
} from '@/features/occurrences/application/create-battalion-occurrence';
import type { OpenResult } from '@/features/occurrences/contracts';
import { withSession, accessResponse } from '@/server/access/session';
import { classifyOccurrence, persistOccurrence } from '@/server/occurrences/persist';
import { resolveActiveClimateEvent } from '@/server/climate-events/intake';

export const runtime = 'nodejs';
const maximumBodyBytes = 16_384;

function postgresErrorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 6 || typeof error !== 'object' || error === null) return undefined;
  const value = error as Record<string, unknown>;
  if (typeof value.code === 'string' && /^[0-9A-Z]{5}$/.test(value.code) && !value.code.startsWith('P')) return value.code;
  if (typeof value.meta === 'object' && value.meta !== null) {
    const code = (value.meta as Record<string, unknown>).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) && !code.startsWith('P')) return code;
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    const nested = value[key];
    const code = postgresErrorCode(nested, depth + 1);
    if (code) return code;
  }
  return undefined;
}

async function readInput(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new BattalionInputError();
  const reader = request.body?.getReader();
  if (!reader) throw new BattalionInputError();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > maximumBodyBytes) {
        await reader.cancel();
        throw new BattalionInputError();
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new BattalionInputError();
  }
}

export async function POST(request: Request) {
  let stage = 'parse_input';
  try {
    const body = await readInput(request);
    const idempotencyKey = request.headers.get('Idempotency-Key');
    stage = 'authenticate_session';
    const created = await withSession(async (tx, actor) => {
      stage = 'load_active_types';
      const ports: CreateBattalionOccurrencePorts = {
        activeTypes: async () => {
          const rows = await tx.$queryRaw<{ name: string }[]>`
            SELECT name FROM public.occurrence_types WHERE active ORDER BY display_order,name
          `;
          return rows.map(({ name }) => name);
        },
        defaultGroups: async (municipalityId) => tx.$queryRaw<{ id: string; municipalityId: string }[]>`
          SELECT id::text AS id,municipality_id AS "municipalityId"
          FROM public.groups WHERE municipality_id=${municipalityId} AND is_default
        `,
        classify: (position) => classifyOccurrence(tx, position),
        createAtomically: async (command) => {
          const databaseKey = `battalion:${command.actorId}:${command.idempotencyKey}`;
          const requestHash = createHash('sha256').update(JSON.stringify({ groupId: command.groupId, input: command.input })).digest('hex');
          stage = 'lock_idempotency_key';
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${databaseKey},0))`;
          stage = 'read_idempotency_key';
          const existing = await tx.$queryRaw<{ request_hash: string; response: OpenResult }[]>`
            SELECT request_hash,response FROM public.idempotency_keys WHERE key=${databaseKey}
          `;
          if (existing[0]) {
            if (existing[0].request_hash !== requestHash) throw new BattalionOccurrenceConflictError();
            return { result: existing[0].response, replay: true };
          }

          stage = 'resolve_active_climate_event';
          const climateEventId = await resolveActiveClimateEvent(tx, actor.municipalityId);
          stage = 'classify_location';
          const classification = await command.classify();
          stage = 'persist_occurrence';
          const result = await persistOccurrence(tx, {
            input: command.input,
            groupId: command.groupId,
            idempotencyKey: databaseKey,
            requestHash,
            classification,
            climateEventId,
            actorId: command.actorId,
            registrationChannel: 'BATALHAO',
            locationSource: 'MAPA',
            onStep: (step) => { stage = `persist_${step}`; },
          });
          return { result, replay: false };
        },
      };
      return createBattalionOccurrence(actor, body, idempotencyKey, ports);
    });
    return Response.json(created.result, { status: created.replay ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof BattalionInputError) {
      return Response.json({ error: { code: error.code, message: 'Confira os campos obrigatórios e confirme a localização no mapa.' } }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof BattalionOccurrenceAccessError) {
      return Response.json({ error: { code: error.code, message: 'Seu perfil não tem autorização para registrar no grupo padrão.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof BattalionConfigurationError) {
      return Response.json({ error: { code: error.code, message: 'O grupo padrão não está configurado para este município. Solicite ajuste a um administrador.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    if (error instanceof BattalionOccurrenceConflictError) {
      return Response.json({ error: { code: error.code, message: 'Esta tentativa já foi enviada com outros dados. Atualize o formulário para iniciar um novo registro.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    const errorCode = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : 'UNHANDLED_FAILURE';
    console.error(JSON.stringify({ event: 'BATTALION_INTAKE_FAILURE', stage, code: errorCode, databaseCode: postgresErrorCode(error) ?? null }));
    return accessResponse(error);
  }
}
