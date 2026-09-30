import type { PublicOccurrenceInput } from './contracts';

export class PublicInputError extends Error {
  readonly code = 'INVALID_INPUT';
  constructor() { super('Verifique os campos obrigatórios e obtenha uma localização válida.'); }
}

function object(value: unknown): Record<string,unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PublicInputError();
  return value as Record<string,unknown>;
}
function text(value:unknown, maximum:number):string {
  if(typeof value!=='string') throw new PublicInputError();
  const normalized=value.trim();
  if(!normalized.length || normalized.length>maximum) throw new PublicInputError();
  return normalized;
}
function coordinate(value:unknown,minimum:number,maximum:number):number {
  if(typeof value!=='number' || !Number.isFinite(value) || value<minimum || value>maximum) throw new PublicInputError();
  return value;
}
// Public input cannot choose persisted priority, status, municipality or group.
// Photo handling is deliberately deferred to its own sequential ticket.
export function validatePublicInput(value:unknown):PublicOccurrenceInput {
  const input=object(value);
  if(Object.keys(input).some(key=>!['type','description','reporterName','reporterContact','position'].includes(key))) throw new PublicInputError();
  const position=object(input.position);
  if(Object.keys(position).some(key=>!['latitude','longitude','accuracy'].includes(key))) throw new PublicInputError();
  return {
    type:text(input.type,80),description:text(input.description,2000),
    reporterName:text(input.reporterName,120),reporterContact:text(input.reporterContact,40),
    position:{latitude:coordinate(position.latitude,-90,90),longitude:coordinate(position.longitude,-180,180),accuracy:coordinate(position.accuracy,0,Number.MAX_VALUE)},
  };
}
export function validateIdempotencyKey(value:string|null):string {
  if(!value || value.length>200 || !/^[A-Za-z0-9_.:-]+$/.test(value)) throw new PublicInputError();
  return value;
}
