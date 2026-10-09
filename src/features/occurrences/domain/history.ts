export type OccurrenceHistoryChanges = {
  type?: { from: string; to: string };
  groupId?: { from: string; to: string };
  priority?: { from: string; to: string };
};

export type OccurrenceHistoryRow = {
  id: string;
  kind: string;
  actorId: string | null;
  actorName: string | null;
  at: string;
  changes: OccurrenceHistoryChanges | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDiff(value: unknown): { from: string; to: string } | undefined {
  if (!isRecord(value) || typeof value.from !== 'string' || typeof value.to !== 'string') return undefined;
  return { from: value.from, to: value.to };
}

export function normalizeOccurrenceHistoryRow(value: unknown): OccurrenceHistoryRow {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.kind !== 'string' || typeof value.at !== 'string') {
    throw new Error('INVALID_OCCURRENCE_HISTORY_ROW');
  }
  const timestamp = new Date(value.at);
  if (!Number.isFinite(timestamp.getTime())) throw new Error('INVALID_OCCURRENCE_HISTORY_TIMESTAMP');

  const changes: OccurrenceHistoryChanges = {};
  if (isRecord(value.changes)) {
    const type = readDiff(value.changes.type);
    const groupId = readDiff(value.changes.groupId);
    const priority = readDiff(value.changes.priority);
    if (type) changes.type = type;
    if (groupId) changes.groupId = groupId;
    if (priority) changes.priority = priority;
  }

  return {
    id: value.id,
    kind: value.kind,
    actorId: typeof value.actorId === 'string' ? value.actorId : null,
    actorName: typeof value.actorName === 'string' ? value.actorName : null,
    at: timestamp.toISOString(),
    changes: Object.keys(changes).length ? changes : null,
  };
}
