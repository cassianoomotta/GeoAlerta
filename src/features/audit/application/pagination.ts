export type AuditCursor = { at: string; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAuditCursor(atValue: string | string[] | undefined, idValue: string | string[] | undefined): AuditCursor | null {
  const at = Array.isArray(atValue) ? atValue[0] : atValue;
  const id = Array.isArray(idValue) ? idValue[0] : idValue;
  if (at === undefined && id === undefined) return null;
  if (!at || !id || !UUID.test(id)) throw new Error('INVALID_AUDIT_CURSOR');

  const timestamp = new Date(at);
  if (!Number.isFinite(timestamp.getTime())) throw new Error('INVALID_AUDIT_CURSOR');

  return { at: timestamp.toISOString(), id };
}
