import type { Actor, Role } from '../contracts';

export type Capability = 'read' | 'privateData' | 'operate' | 'reclassify' | 'export' | 'administer';
const capabilities: Record<Role, readonly Capability[]> = {
  CONSULTA: ['read'],
  VOLUNTARIO: ['read'],
  OPERADOR: ['read','privateData','operate'],
  GESTOR: ['read','privateData','operate','reclassify','export'],
  ADMINISTRADOR: ['read','privateData','operate','reclassify','export','administer'],
};

// Actor must originate from identity verification plus a CURRENT server profile.
// This pure function never accepts browser metadata as an authority source.
export function canEnterPanel(actor: Actor | null): boolean {
  return !!actor && actor.state === 'ATIVO' && !!actor.municipalityId &&
    Object.hasOwn(capabilities, actor.role) && (actor.role === 'ADMINISTRADOR' || actor.groupIds.length > 0);
}

export function can(actor: Actor | null, capability: Capability, scope: { municipalityId: string; groupId?: string }): boolean {
  if (!canEnterPanel(actor) || !actor || actor.municipalityId !== scope.municipalityId) return false;
  if (!capabilities[actor.role].includes(capability)) return false;
  return actor.role === 'ADMINISTRADOR' || (!!scope.groupId && actor.groupIds.includes(scope.groupId));
}
