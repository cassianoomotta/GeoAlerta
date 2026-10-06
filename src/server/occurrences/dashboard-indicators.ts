import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import type {IndicatorData,IndicatorQuery} from '@/features/occurrences/domain/dashboard-indicators';

export async function readDashboardIndicators(tx:Prisma.TransactionClient,query:IndicatorQuery):Promise<IndicatorData>{
  const from=query.from?new Date(query.from):null;
  const to=query.to?new Date(query.to):null;
  const rows=await tx.$queryRaw<IndicatorData[]>`
    WITH filtered AS MATERIALIZED (
      SELECT o.status,o.priority,o.type,o.created_at FROM public.occurrences o
      WHERE o.deleted_at IS NULL
        AND (${from}::timestamptz IS NULL OR o.created_at>=${from}::timestamptz)
        AND (${to}::timestamptz IS NULL OR o.created_at<${to}::timestamptz)
    ),
    statuses AS (SELECT status,count(*)::int AS count FROM filtered GROUP BY status),
    priorities AS (SELECT priority,count(*)::int AS count FROM filtered GROUP BY priority),
    types AS (SELECT type,count(*)::int AS count FROM filtered GROUP BY type),
    openings AS (SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD') AS day,count(*)::int AS opened FROM filtered GROUP BY 1),
    closures AS (SELECT * FROM public.core_dashboard_closures(${from}::timestamptz,${to}::timestamptz)),
    activity AS (SELECT coalesce(o.day,c.day) AS day,coalesce(o.opened,0) AS opened,coalesce(c.closed,0) AS closed FROM openings o FULL JOIN closures c ON o.day=c.day)
    SELECT
      coalesce((SELECT jsonb_object_agg(status,count) FROM statuses),'{}'::jsonb) AS "byStatus",
      coalesce((SELECT jsonb_object_agg(priority,count) FROM priorities),'{}'::jsonb) AS "byPriority",
      coalesce((SELECT jsonb_agg(jsonb_build_object('type',type,'count',count) ORDER BY count DESC,type) FROM types),'[]'::jsonb) AS "byType",
      coalesce((SELECT jsonb_agg(jsonb_build_object('day',day,'opened',opened,'closed',closed) ORDER BY day) FROM activity),'[]'::jsonb) AS daily
  `;
  return rows[0]??{byStatus:{},byPriority:{},byType:[],daily:[]};
}
