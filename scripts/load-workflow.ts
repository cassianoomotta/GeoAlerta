export const LOAD_DURATION_MS = 60 * 60 * 1000;
export const LOAD_OCCURRENCES = 100;
export const LOAD_BURST_SIZE = 10;
export const LOAD_BACKOFFICE_SESSIONS = 10;
export const LOAD_MINIMUM_HISTORY = 50_000;

export type LoadEvent = { kind: string; elapsedMs: number; status?: number };

export function scheduleOccurrence(index: number, startedAt: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= LOAD_OCCURRENCES) throw new Error('INVALID_LOAD_INDEX');
  if (index < LOAD_BURST_SIZE) return startedAt;
  const remaining = LOAD_OCCURRENCES - LOAD_BURST_SIZE;
  return startedAt + 60_000 + Math.floor(((index - LOAD_BURST_SIZE + 1) * (LOAD_DURATION_MS - 60_000)) / remaining);
}

export function percentile(values: readonly number[], percentileValue: number): number | null {
  if (!Number.isFinite(percentileValue) || percentileValue < 0 || percentileValue > 100) throw new Error('INVALID_PERCENTILE');
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1)];
}

export function csvRecordCount(csv: string): number {
  let records = 0;
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      records += 1;
    }
  }
  if (quoted) throw new Error('CSV_UNCLOSED_QUOTE');
  if (csv.length > 0 && !/[\r\n]$/.test(csv)) records += 1;
  return Math.max(0, records - 1); // header is not a data row
}

export function assertLoadTarget(env: Record<string, string | undefined>): { baseUrl: URL; sessions: string[]; lat: number; lon: number } {
  if (env.CORE_LOAD_CONFIRM_DISPOSABLE_TARGET !== 'YES') throw new Error('DISPOSABLE_TARGET_CONFIRMATION_REQUIRED');
  if (env.CORE_LOAD_TARGET_CLASS !== 'disposable' || !env.CORE_LOAD_RUN_ID?.trim()) throw new Error('DISPOSABLE_TARGET_MARKER_REQUIRED');

  const rawUrl = env.CORE_LOAD_BASE_URL;
  const allowlistedHost = env.CORE_LOAD_ALLOWLIST_HOST?.toLowerCase();
  if (!rawUrl || !allowlistedHost) throw new Error('LOAD_TARGET_ALLOWLIST_REQUIRED');
  let baseUrl: URL;
  try { baseUrl = new URL(rawUrl); } catch { throw new Error('LOAD_TARGET_URL_INVALID'); }
  if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost' && baseUrl.hostname !== '127.0.0.1') throw new Error('LOAD_TARGET_MUST_USE_HTTPS');
  if (baseUrl.hostname.toLowerCase() !== allowlistedHost) throw new Error('LOAD_TARGET_HOST_NOT_ALLOWLISTED');
  if (baseUrl.hostname === 'fwqbwqxgajnrjwccdebh.supabase.co' || baseUrl.hostname.endsWith('.vercel.app')) throw new Error('SHARED_OR_DEPLOYED_TARGET_REFUSED');
  try {
    const supabaseHost = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname.toLowerCase();
    if (supabaseHost === 'fwqbwqxgajnrjwccdebh.supabase.co') throw new Error('SHARED_OR_DEPLOYED_TARGET_REFUSED');
  } catch (error) {
    if (error instanceof Error && error.message === 'SHARED_OR_DEPLOYED_TARGET_REFUSED') throw error;
    throw new Error('SUPABASE_HOMOLOGATION_URL_REQUIRED');
  }

  const sessions = Array.from({ length: LOAD_BACKOFFICE_SESSIONS }, (_, index) => env[`CORE_LOAD_SESSION_${String(index + 1).padStart(2, '0')}`]?.trim() ?? '');
  if (sessions.some((session) => !session)) throw new Error('TEN_BACKOFFICE_SESSIONS_REQUIRED');
  if (!env.CORE_LOAD_CSV_SESSION?.trim()) throw new Error('CSV_SESSION_REQUIRED');
  if ((env.CORE_LOAD_PHOTO_OCCURRENCE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean).length === 0) throw new Error('SYNTHETIC_PHOTO_OCCURRENCE_REQUIRED');
  if ((env.CORE_LOAD_MUTATION_OCCURRENCE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean).length < LOAD_BACKOFFICE_SESSIONS) throw new Error('TEN_SYNTHETIC_MUTATION_OCCURRENCES_REQUIRED');
  if (!env.CORE_LOAD_CONFLICT_OCCURRENCE_ID?.trim()) throw new Error('SYNTHETIC_CONFLICT_OCCURRENCE_REQUIRED');
  if (Number(env.CORE_LOAD_EXPECTED_HISTORY) < LOAD_MINIMUM_HISTORY) throw new Error('FIFTY_THOUSAND_HISTORY_REQUIRED');
  if (!env.CORE_LOAD_REALTIME_TOKEN?.trim() || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('REALTIME_SESSION_CONFIGURATION_REQUIRED');

  const lat = Number(env.CORE_LOAD_LATITUDE);
  const lon = Number(env.CORE_LOAD_LONGITUDE);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('SYNTHETIC_GPS_REQUIRED');
  return { baseUrl, sessions, lat, lon };
}

export function sanitizedReport(events: readonly LoadEvent[], startedAt: string, finishedAt: string) {
  const groups = new Map<string, number[]>();
  let errors = 0;
  const statuses: Record<string, number> = {};
  for (const event of events) {
    const values = groups.get(event.kind) ?? [];
    values.push(event.elapsedMs);
    groups.set(event.kind, values);
    if (event.kind.endsWith('.error') || (event.status !== undefined && event.status >= 400)) errors += 1;
    if (event.status !== undefined) statuses[String(event.status)] = (statuses[String(event.status)] ?? 0) + 1;
  }
  return {
    startedAt, finishedAt, totalRequests: events.length, errors,
    statusCounts: statuses,
    latencyMs: Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([kind, values]) => [kind, { count: values.length, p50: percentile(values, 50), p95: percentile(values, 95), max: Math.max(...values) }])),
  };
}
