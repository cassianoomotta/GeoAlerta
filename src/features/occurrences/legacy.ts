import type { Status } from './contracts';

const mapping: Record<string, Status> = {
  Aberto: 'NOVA', 'Em Atendimento': 'EM_ATENDIMENTO', Resolvido: 'RESOLVIDA', Recusado: 'CANCELADA',
};
export type LegacyOccurrence = { id: string; status: string; location: unknown | null };

export function inspectLegacy(rows: readonly LegacyOccurrence[]) {
  const unknownStatuses = rows.filter((row) => !Object.hasOwn(mapping, row.status)).map(({ id, status }) => ({ id, status }));
  const missingLocations = rows.filter((row) => row.location === null).map(({ id }) => id);
  return { count: rows.length, unknownStatuses, missingLocations, canConstrain: unknownStatuses.length === 0 && missingLocations.length === 0 };
}

export function mapLegacyStatus(status: string): Status {
  if (!Object.hasOwn(mapping, status)) throw new Error('Estado legado desconhecido; saneamento obrigatório.');
  return mapping[status];
}
