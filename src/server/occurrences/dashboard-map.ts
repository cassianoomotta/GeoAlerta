import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import type {Priority,Status} from '@/features/occurrences/contracts';
import type {DashboardMapData} from '@/features/occurrences/application/get-dashboard-map';
import type {DashboardMapQuery} from '@/features/occurrences/domain/dashboard-map';

export async function readDashboardMap(tx:Prisma.TransactionClient,query:DashboardMapQuery,markerLimit:number):Promise<DashboardMapData>{
  const fromFilter=query.from?Prisma.sql`AND o.created_at>=${new Date(query.from)}`:Prisma.empty;
  const toFilter=query.to?Prisma.sql`AND o.created_at<=${new Date(query.to)}`:Prisma.empty;
  const spatialFilter=query.west===undefined?Prisma.empty:Prisma.sql`
        AND ST_Intersects(o.location,ST_MakeEnvelope(${query.west},${query.south},${query.east},${query.north},4326)::geography)`;
  const rows=await tx.$queryRaw<{
    markers:{id:string;latitude:number;longitude:number;type:string;priority:Priority;status:Status}[];
    by_status:Partial<Record<Status,number>>;
    by_priority:Partial<Record<Priority,number>>;
  }[]>`
    WITH filtered AS MATERIALIZED (
      SELECT o.id::text AS id,ST_Y(o.location::geometry) AS latitude,ST_X(o.location::geometry) AS longitude,
        o.type,o.priority,o.status,o.created_at
      FROM public.occurrences o
      WHERE o.deleted_at IS NULL
        ${fromFilter}
        ${toFilter}
        ${spatialFilter}
    ),
    status_counts AS (SELECT status,count(*)::int AS total FROM filtered GROUP BY status),
    priority_counts AS (SELECT priority,count(*)::int AS total FROM filtered GROUP BY priority),
    marker_rows AS (SELECT * FROM filtered ORDER BY created_at DESC,id ASC LIMIT ${markerLimit})
    SELECT
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'latitude',latitude,'longitude',longitude,'type',type,'priority',priority,'status',status) ORDER BY created_at DESC,id ASC) FROM marker_rows),'[]'::jsonb) AS markers,
      coalesce((SELECT jsonb_object_agg(status,total) FROM status_counts),'{}'::jsonb) AS by_status,
      coalesce((SELECT jsonb_object_agg(priority,total) FROM priority_counts),'{}'::jsonb) AS by_priority
  `;
  const row=rows[0];
  return {markers:row?.markers??[],byStatus:row?.by_status??{},byPriority:row?.by_priority??{}};
}
