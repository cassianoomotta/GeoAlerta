import type {Actor} from '@/features/access/contracts';
import {can} from '@/features/access/domain/permissions';
import type {DashboardView,Priority,Status} from '../contracts';
import {shapeDashboardView,type DashboardMapQuery,type DashboardMarker} from '../domain/dashboard-map';

export type DashboardMapData={markers:DashboardMarker[];byStatus:Partial<Record<Status,number>>;byPriority:Partial<Record<Priority,number>>;availableTypes?:string[];matchingCount?:number};
export type DashboardMapPort={read(query:DashboardMapQuery,markerLimit:number):Promise<DashboardMapData>};

export class DashboardMapAccessError extends Error{}

export async function getDashboardMap(actor:Actor,query:DashboardMapQuery,port:DashboardMapPort):Promise<DashboardView>{
  if(!can(actor,'read',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}))throw new DashboardMapAccessError('ACCESS_DENIED');
  const data=await port.read(query,1001);
  return shapeDashboardView(data.markers,data.byStatus,data.byPriority,1000,data);
}
