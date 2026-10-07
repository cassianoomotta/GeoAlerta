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
function optionalText(value:unknown, maximum:number):string|null {
  if(value===undefined||value===null) return null;
  if(typeof value!=='string') throw new PublicInputError();
  const normalized=value.trim();
  if(normalized.length>maximum) throw new PublicInputError();
  return normalized||null;
}
function coordinate(value:unknown,minimum:number,maximum:number):number {
  if(typeof value!=='number' || !Number.isFinite(value) || value<minimum || value>maximum) throw new PublicInputError();
  return value;
}
// Public input cannot choose persisted priority, status, municipality or group.
export function validatePublicInput(value:unknown, options: {allowCustomType?: boolean;allowedTypes?:readonly string[]} = {}):PublicOccurrenceInput {
  const input=object(value);
  if(Object.keys(input).some(key=>!['type','description','reporterName','reporterContact','address','position','needsMedicalSupport','photoToken'].includes(key))) throw new PublicInputError();
  if(input.photoToken!==undefined && (typeof input.photoToken!=='string' || input.photoToken.length>1024 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(input.photoToken))) throw new PublicInputError();
  if(input.needsMedicalSupport!==undefined && input.needsMedicalSupport!==null && typeof input.needsMedicalSupport!=='boolean') throw new PublicInputError();
  const type=text(input.type,80);
  if(!options.allowCustomType && !options.allowedTypes?.includes(type)) throw new PublicInputError();
  const position=object(input.position);
  if(Object.keys(position).some(key=>!['latitude','longitude','accuracy'].includes(key))) throw new PublicInputError();
  return {
    type,description:text(input.description,2000),
    reporterName:text(input.reporterName,120),reporterContact:text(input.reporterContact,40),
    address:optionalText(input.address,300),
    needsMedicalSupport:input.needsMedicalSupport ?? null,
    position:{latitude:coordinate(position.latitude,-90,90),longitude:coordinate(position.longitude,-180,180),accuracy:coordinate(position.accuracy,0,Number.MAX_VALUE)},
    ...(input.photoToken===undefined?{}:{photoToken:input.photoToken as string}),
  };
}
export function validateIdempotencyKey(value:string|null):string {
  if(!value || value.length>200 || !/^[A-Za-z0-9_.:-]+$/.test(value)) throw new PublicInputError();
  return value;
}
