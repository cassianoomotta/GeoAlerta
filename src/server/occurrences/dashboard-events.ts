import 'server-only';
import {Prisma,type Prisma as PrismaTypes} from '../../../prisma/generated/client/client';
import type {Actor} from '@/features/access/contracts';
import {can} from '@/features/access/domain/permissions';
import {AccessError} from '@/server/access/context';
import {shapeEventDashboardMetrics,type EventDashboardEvent,type EventDashboardPresentation,type EventDashboardRawMetric,type EventDashboardQuery} from '@/features/occurrences/domain/dashboard-events';

type DashboardRow={
  events:EventDashboardEvent[];
  selectedEventIds:string[];
  selectionValid:boolean;
  metrics:EventDashboardRawMetric[];
  presentations:EventDashboardPresentation[];
};

export async function readDashboardEventIndicators(tx:PrismaTypes.TransactionClient,actor:Actor,query:EventDashboardQuery){
  if(!can(actor,'read',{municipalityId:actor.municipalityId,groupId:actor.groupIds[0]}))throw new AccessError(403,'ACCESS_DENIED');
  const rows=await tx.$queryRaw<DashboardRow[]>(Prisma.sql`
    WITH options AS MATERIALIZED (
      SELECT e.id::text AS id,e.name,e.state,e.planned_start::text AS "plannedStart",e.planned_end::text AS "plannedEnd",
        e.started_at AS "startedAt",e.ended_at AS "endedAt"
      FROM public.climate_events e
      WHERE e.municipality_id=${actor.municipalityId} AND e.state IN ('EM_ANDAMENTO','ENCERRADO')
    ),
    selection AS MATERIALIZED (
      SELECT
        COALESCE(${query.primaryEventId??null}::uuid,
          (SELECT id::uuid FROM options WHERE state='EM_ANDAMENTO' ORDER BY "startedAt" DESC,id LIMIT 1),
          (SELECT id::uuid FROM options WHERE state='ENCERRADO' ORDER BY "endedAt" DESC NULLS LAST,id DESC LIMIT 1)) AS primary_id,
        ${query.comparisonEventId??null}::uuid AS comparison_id
    ),
    validation AS MATERIALIZED (
      SELECT (s.primary_id IS NULL OR EXISTS(SELECT 1 FROM options e WHERE e.id::uuid=s.primary_id))
        AND (s.comparison_id IS NULL OR (s.comparison_id<>s.primary_id AND EXISTS(SELECT 1 FROM options e WHERE e.id::uuid=s.comparison_id AND e.state='ENCERRADO'))) AS valid
      FROM selection s
    ),
    selected AS MATERIALIZED (
      SELECT e.* FROM options e CROSS JOIN selection s CROSS JOIN validation v
      WHERE v.valid AND (e.id::uuid=s.primary_id OR e.id::uuid=s.comparison_id)
    ),
    visible AS MATERIALIZED (
      SELECT o.climate_event_id::text AS event_id,o.type,o.priority,o.needs_medical_support,o.status
      FROM public.occurrences o JOIN selected e ON e.id::uuid=o.climate_event_id
      WHERE o.deleted_at IS NULL
    ),
    raw_metrics AS (
      SELECT e.id,e.name,e.state,e."plannedStart",e."plannedEnd",e."startedAt",e."endedAt",count(v.event_id)::int AS total,
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('type',t.type,'count',t.count) ORDER BY t.count DESC,t.type),'[]'::jsonb)
          FROM (SELECT x.type,count(*)::int AS count FROM visible x WHERE x.event_id=e.id GROUP BY x.type) t) AS "byType",
        (SELECT COALESCE(jsonb_object_agg(p.priority,p.count),'{}'::jsonb)
          FROM (SELECT x.priority,count(*)::int AS count FROM visible x WHERE x.event_id=e.id GROUP BY x.priority) p) AS "byPriority",
        jsonb_build_object(
          'yes',count(*) FILTER(WHERE v.needs_medical_support IS TRUE)::int,
          'no',count(*) FILTER(WHERE v.needs_medical_support IS FALSE)::int,
          'unknown',count(*) FILTER(WHERE v.event_id IS NOT NULL AND v.needs_medical_support IS NULL)::int) AS "byMedicalSupport",
        (SELECT COALESCE(jsonb_object_agg(s.status,s.count),'{}'::jsonb)
          FROM (SELECT x.status,count(*)::int AS count FROM visible x WHERE x.event_id=e.id GROUP BY x.status) s) AS "byStatus"
      FROM selected e LEFT JOIN visible v ON v.event_id=e.id
      GROUP BY e.id,e.name,e.state,e."plannedStart",e."plannedEnd",e."startedAt",e."endedAt"
    )
    SELECT
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'state',e.state,'plannedStart',e."plannedStart",'plannedEnd',e."plannedEnd",'startedAt',e."startedAt",'endedAt',e."endedAt")
        ORDER BY CASE e.state WHEN 'EM_ANDAMENTO' THEN 0 ELSE 1 END,e."endedAt" DESC NULLS LAST,e.id),'[]'::jsonb) FROM options e) AS events,
      (SELECT CASE WHEN v.valid AND s.primary_id IS NOT NULL THEN
        jsonb_build_array(s.primary_id::text) || CASE WHEN s.comparison_id IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(s.comparison_id::text) END
        ELSE '[]'::jsonb END FROM selection s CROSS JOIN validation v) AS "selectedEventIds",
      (SELECT valid FROM validation) AS "selectionValid",
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'event',jsonb_build_object('id',m.id,'name',m.name,'state',m.state,'plannedStart',m."plannedStart",'plannedEnd',m."plannedEnd",'startedAt',m."startedAt",'endedAt',m."endedAt"),
        'total',m.total,'byType',m."byType",'byPriority',m."byPriority",'byMedicalSupport',m."byMedicalSupport",'byStatus',m."byStatus")
        ORDER BY CASE WHEN m.id=(SELECT primary_id::text FROM selection) THEN 0 ELSE 1 END,m.id),'[]'::jsonb) FROM raw_metrics m) AS metrics,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('code',p.code,'label',p.label,'displayOrder',p.display_order) ORDER BY p.display_order,p.code),'[]'::jsonb)
        FROM public.status_presentations p WHERE p.code IN ('NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA')) AS presentations
  `);
  const row=rows[0];
  if(!row?.selectionValid)throw new AccessError(404,'NOT_FOUND');
  return {events:row.events,selectedEventIds:row.selectedEventIds,metrics:shapeEventDashboardMetrics(row.metrics,row.presentations),updatedAt:new Date().toISOString()};
}
