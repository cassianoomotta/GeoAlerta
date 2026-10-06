import type {Actor} from '@/features/access/contracts';
import {can} from '@/features/access/domain/permissions';
import {shapeIndicatorView,type IndicatorData,type IndicatorQuery,type IndicatorView} from '../domain/dashboard-indicators';

export type DashboardIndicatorsPort={read(query:IndicatorQuery):Promise<IndicatorData>};
export class DashboardIndicatorsAccessError extends Error{}

export async function getDashboardIndicators(actor:Actor,query:IndicatorQuery,port:DashboardIndicatorsPort):Promise<IndicatorView>{
  if(!can(actor,'read',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}))throw new DashboardIndicatorsAccessError('ACCESS_DENIED');
  return shapeIndicatorView(await port.read(query),query);
}