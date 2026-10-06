import { accessResponse, withSession } from '@/server/access/session';
import { ClimateEventConflict, listClimateEvents, manageClimateEvent } from '@/server/climate-events';
import { ClimateEventInputError, parseClimateEventCommand } from '@/features/climate-events/domain/input';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
function databaseCode(error: unknown, depth = 0): string | undefined {
  if (depth > 6 || typeof error !== 'object' || error === null) return undefined;
  const value = error as Record<string, unknown>;
  if (typeof value.code === 'string' && /^[0-9A-Z]{5}$/.test(value.code) && !value.code.startsWith('P')) return value.code;
  if (typeof value.message === 'string') {
    const match = value.message.match(/\b(23505|40001|23514)\b/);
    if (match) return match[1];
  }
  if (typeof value.meta === 'object' && value.meta !== null) {
    const code = (value.meta as Record<string, unknown>).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  for (const nested of Object.values(value)) {
    const code = databaseCode(nested, depth + 1);
    if (code) return code;
  }
  return undefined;
}
function databaseMessageContains(error: unknown, needle: string, depth = 0): boolean {
  if(depth>6||typeof error!=='object'||error===null)return false;
  const value=error as Record<string,unknown>;
  if(typeof value.message==='string'&&value.message.includes(needle))return true;
  return Object.values(value).some(nested=>databaseMessageContains(nested,needle,depth+1));
}

export async function GET() {
  try {
    const events = await withSession((tx, actor) => listClimateEvents(tx, actor));
    return Response.json({ events }, { headers: noStore });
  } catch (error) { return accessResponse(error); }
}

export async function POST(request: Request) {
  try {
    let command;
    try { command = parseClimateEventCommand(await request.json()); }
    catch (error) { if (error instanceof ClimateEventInputError) throw error; throw new ClimateEventInputError(); }
    const event = await withSession((tx, actor) => manageClimateEvent(tx, actor, command));
    return Response.json(event, { status: command.action === 'create' ? 201 : 200, headers: noStore });
  } catch (error) {
    if (error instanceof ClimateEventInputError) return Response.json({ error: { code: 'INVALID_CLIMATE_EVENT', message: 'Confira o nome, as datas e os campos enviados.' } }, { status: 422, headers: noStore });
    if (error instanceof ClimateEventConflict) return Response.json({ error: { code: error.code, message: error.message, pending: error.pending, outOfScope: error.outOfScope } }, { status: 409, headers: noStore });
    const code = databaseCode(error);
    if (code === '23514' && databaseMessageContains(error, 'CLIMATE_EVENT_BLOCKED_PENDING_OCCURRENCES')) return Response.json({ error: { code: 'CLIMATE_EVENT_BLOCKED', message: 'Há pendências vinculadas fora do escopo visível; solicite atuação de um responsável autorizado.', pending: [], outOfScope: true } }, { status: 409, headers: noStore });
    if (code === '23505') return Response.json({ error: { code: 'CLIMATE_EVENT_ALREADY_ACTIVE', message: 'Já existe um evento em andamento neste município.' } }, { status: 409, headers: noStore });
    if (code === '40001' || code === '23514') return Response.json({ error: { code: 'CLIMATE_EVENT_CONFLICT', message: 'O evento mudou ou não pode realizar esta transição.' } }, { status: 409, headers: noStore });
    return accessResponse(error);
  }
}
