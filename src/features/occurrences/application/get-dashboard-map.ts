import type {Actor} from '@/features/access/contracts';
import {can} from '@/features/access/domain/permissions';
import type {DashboardView,Priority,Status} from '../contracts';
import type {DashboardMarkerInput} from '../domain/dashboard-map';
import {shapeDashboardView,type DashboardMapQuery} from '../domain/dashboard-map';

export type DashboardMapData={markers:DashboardMarkerInput[];byStatus:Partial<Record<Status,number>>;byPriority:Partial<Record<Priority,number>>};
export type DashboardMapPort={read(query:DashboardMapQuery,markerLimit:number):Promise<DashboardMapData>};

export class DashboardMapAccessError extends Error{}

export async function getDashboardMap(actor:Actor,query:DashboardMapQuery,port:DashboardMapPort):Promise<DashboardView>{
  if(!can(actor,'read',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}))throw new DashboardMapAccessError('ACCESS_DENIED');
  const data=await port.read(query,1001);
  return shapeDashboardView(data.markers,data.byStatus,data.byPriority);
}
