import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import {DASHBOARD_TIME_ZONE,type DashboardIndicatorsData,type DashboardIndicatorsQuery} from '@/features/occurrences/domain/dashboard-indicators';

type RawIndicators={
  registered:number;
  open:number;
  in_service:number;
  resolved:number;
  cancelled:number;
  daily:DashboardIndicatorsData['daily'];
  by_neighborhood:DashboardIndicatorsData['byNeighborhood'];
  by_type:DashboardIndicatorsData['byType'];
  neighborhoods:DashboardIndicatorsData['neighborhoods'];
  by_status:DashboardIndicatorsData['byStatus'];
};

export async function readDashboardIndicators(tx:Prisma.TransactionClient,query:DashboardIndicatorsQuery):Promise<DashboardIndicatorsData>{
  const neighborhoodFilter=query.neighborhoodCode
    ?Prisma.sql`AND o.neighborhood_code=${query.neighborhoodCode}`
    :Prisma.empty;
  const rows=await tx.$queryRaw<RawIndicators[]>(Prisma.sql`
    WITH filtered AS MATERIALIZED (
      SELECT o.created_at,o.status,o.type,o.neighborhood_code,
        COALESCE(n.label,'Bairro não informado') AS neighborhood_label
      FROM public.occurrences o
      LEFT JOIN public.occurrence_neighborhoods n ON n.code=o.neighborhood_code
      WHERE o.deleted_at IS NULL
        AND o.created_at>=${new Date(query.from)}
        AND o.created_at<${new Date(query.to)}
        ${neighborhoodFilter}
    ),
    daily AS (
      SELECT (created_at AT TIME ZONE ${DASHBOARD_TIME_ZONE})::date AS day,count(*)::int AS total
      FROM filtered GROUP BY day
    ),
    day_series AS (
      SELECT generate_series(
        (CAST(${new Date(query.from)} AS timestamptz) AT TIME ZONE ${DASHBOARD_TIME_ZONE})::date,
        ((CAST(${new Date(query.to)} AS timestamptz)-interval '1 millisecond') AT TIME ZONE ${DASHBOARD_TIME_ZONE})::date,
        interval '1 day'
      )::date AS day
    ),
    neighborhood_counts AS (
      SELECT neighborhood_code AS code,neighborhood_label AS label,count(*)::int AS total
      FROM filtered GROUP BY neighborhood_code,neighborhood_label
    ),
    type_counts AS (
      SELECT COALESCE(NULLIF(btrim(type),''),'Não informado') AS label,count(*)::int AS total
      FROM filtered GROUP BY COALESCE(NULLIF(btrim(type),''),'Não informado')
    ),
    status_counts AS (
      SELECT status,count(*)::int AS total FROM filtered GROUP BY status
    )
    SELECT
      (SELECT count(*)::int FROM filtered) AS registered,
      (SELECT count(*)::int FROM filtered WHERE status IN ('NOVA','EM_TRIAGEM')) AS open,
      (SELECT count(*)::int FROM filtered WHERE status='EM_ATENDIMENTO') AS in_service,
      (SELECT count(*)::int FROM filtered WHERE status='RESOLVIDA') AS resolved,
      (SELECT count(*)::int FROM filtered WHERE status='CANCELADA') AS cancelled,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('date',to_char(days.day,'YYYY-MM-DD'),'total',COALESCE(daily.total,0)) ORDER BY days.day)
        FROM day_series days LEFT JOIN daily USING(day)),'[]'::jsonb) AS daily,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('code',code,'label',label,'total',total) ORDER BY total DESC,label ASC) FROM neighborhood_counts),'[]'::jsonb) AS by_neighborhood,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('label',label,'total',total) ORDER BY total DESC,label ASC) FROM type_counts),'[]'::jsonb) AS by_type,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('code',code,'label',label) ORDER BY display_order,label) FROM public.occurrence_neighborhoods),'[]'::jsonb) AS neighborhoods,
      COALESCE((SELECT jsonb_object_agg(status,total) FROM status_counts),'{}'::jsonb) AS by_status
  `);
  const row=rows[0];
  return {
    totals:{registered:row?.registered??0,open:row?.open??0,inService:row?.in_service??0,resolved:row?.resolved??0,cancelled:row?.cancelled??0},
    daily:row?.daily??[],
    byNeighborhood:row?.by_neighborhood??[],
    byType:row?.by_type??[],
    neighborhoods:row?.neighborhoods??[],
    byStatus:row?.by_status??{},
  };
}
