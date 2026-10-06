import type {Actor} from '@/features/access/contracts';
import {can} from '@/features/access/domain/permissions';
import {DASHBOARD_TIME_ZONE,type DashboardIndicatorsData,type DashboardIndicatorsQuery,type DashboardIndicatorsView} from '../domain/dashboard-indicators';

export type DashboardIndicatorsPort={read(query:DashboardIndicatorsQuery):Promise<DashboardIndicatorsData>};
export class DashboardIndicatorsAccessError extends Error{}

export async function getDashboardIndicators(actor:Actor,query:DashboardIndicatorsQuery,port:DashboardIndicatorsPort):Promise<DashboardIndicatorsView>{
  if(!can(actor,'read',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}))throw new DashboardIndicatorsAccessError('ACCESS_DENIED');
  const data=await port.read(query);
  return {...data,window:{...query,timeZone:DASHBOARD_TIME_ZONE}};
}
