import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import type {Priority,Status,DashboardView} from '@/features/occurrences/contracts';
import type {DashboardMapData} from '@/features/occurrences/application/get-dashboard-map';
import type {DashboardMapQuery} from '@/features/occurrences/domain/dashboard-map';

export async function readDashboardMap(tx:Prisma.TransactionClient,query:DashboardMapQuery,markerLimit:number):Promise<DashboardMapData>{
  const fromFilter=query.from?Prisma.sql`AND o.created_at>=${new Date(query.from)}`:Prisma.empty;
  const toFilter=query.to?Prisma.sql`AND o.created_at<=${new Date(query.to)}`:Prisma.empty;
  const spatialFilter=query.west===undefined?Prisma.empty:Prisma.sql`
        AND ST_Intersects(o.location,ST_MakeEnvelope(${query.west},${query.south},${query.east},${query.north},4326)::geography)`;
  const statusFilter=query.statuses===undefined?Prisma.empty:query.statuses.length?Prisma.sql`AND status::text IN (${Prisma.join(query.statuses)})`:Prisma.sql`AND false`;
  const priorityFilter=query.priorities===undefined?Prisma.empty:query.priorities.length?Prisma.sql`AND priority::text IN (${Prisma.join(query.priorities)})`:Prisma.sql`AND false`;
  const typeFilter=query.types===undefined?Prisma.empty:query.types.length?Prisma.sql`AND type IN (${Prisma.join(query.types)})`:Prisma.sql`AND false`;
  const rows=await tx.$queryRaw<{
    markers:DashboardView['markers'];
    available_types:string[];
    matching_count:number;
    by_status:Partial<Record<Status,number>>;
    by_priority:Partial<Record<Priority,number>>;
  }[]>`
    WITH base AS MATERIALIZED (
      SELECT o.id::text AS id,o.protocol,o.type,ST_Y(o.location::geometry) AS latitude,ST_X(o.location::geometry) AS longitude,
        o.priority,o.status,o.created_at
      FROM public.occurrences o
      WHERE o.deleted_at IS NULL
        ${fromFilter}
        ${toFilter}
        ${spatialFilter}
    ),
    filtered AS (SELECT * FROM base WHERE true ${statusFilter} ${priorityFilter} ${typeFilter}),
    status_counts AS (SELECT status,count(*)::int AS total FROM base GROUP BY status),
    priority_counts AS (SELECT priority,count(*)::int AS total FROM base GROUP BY priority),
    marker_rows AS (SELECT * FROM filtered ORDER BY created_at DESC,id ASC LIMIT ${markerLimit})
    SELECT
      (SELECT count(*)::int FROM filtered) AS matching_count,
      coalesce((SELECT jsonb_agg(type ORDER BY type) FROM (SELECT DISTINCT type FROM base) types),'[]'::jsonb) AS available_types,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'protocol',protocol,'type',type,'latitude',latitude,'longitude',longitude,'priority',priority,'status',status) ORDER BY created_at DESC,id ASC) FROM marker_rows),'[]'::jsonb) AS markers,
      coalesce((SELECT jsonb_object_agg(status,total) FROM status_counts),'{}'::jsonb) AS by_status,
      coalesce((SELECT jsonb_object_agg(priority,total) FROM priority_counts),'{}'::jsonb) AS by_priority
  `;
  const row=rows[0];
  return {markers:row?.markers??[],byStatus:row?.by_status??{},byPriority:row?.by_priority??{},availableTypes:row?.available_types??[],matchingCount:row?.matching_count??0};
}
