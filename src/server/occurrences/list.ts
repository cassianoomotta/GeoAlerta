import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import type {Actor} from '@/features/access/contracts';
import {availableColumns,validateColumns,ListInputError,type Column,type ListFilters,type ListItem,type ListResult} from '@/features/occurrences/list-input';
import {getColumns} from '@/features/access/infrastructure/preferences';
async function queryContext(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters){
  const groups=await tx.$queryRaw<{id:string;name:string}[]>`SELECT id,name FROM public.groups ORDER BY name,id`;
  const statusRows=await tx.$queryRaw<{code:ListItem['status'];label:string;display_order:number}[]>`SELECT code,label,display_order FROM public.status_presentations ORDER BY display_order,code`;
  const statusPresentations=statusRows.map(row=>({code:row.code,label:row.label,displayOrder:row.display_order}));
  if(filters.groupId&&!groups.some(g=>g.id===filters.groupId))throw new ListInputError(403);
  const allowed=availableColumns(actor.role!=='CONSULTA');
  const columns=filters.columns?validateColumns(filters.columns,allowed):await getColumns(tx,actor);
  const clauses=[Prisma.sql`o.deleted_at IS NULL`];
  if(filters.from)clauses.push(Prisma.sql`o.created_at>=${new Date(filters.from)}`);
  if(filters.to)clauses.push(Prisma.sql`o.created_at<=${new Date(filters.to)}`);
  if(filters.status)clauses.push(Prisma.sql`o.status=${filters.status}`);
  if(filters.priority)clauses.push(Prisma.sql`o.priority=${filters.priority}`);
  if(filters.type)clauses.push(Prisma.sql`o.type=${filters.type}`);
  if(filters.groupId)clauses.push(Prisma.sql`o.group_id=${filters.groupId}::uuid`);
  const where=Prisma.join(clauses,' AND ');
  const sort={createdAt:Prisma.sql`o.created_at`,priority:Prisma.sql`o.priority`,status:Prisma.sql`o.status`}[filters.sort];
  const pageSort={createdAt:Prisma.sql`p."createdAt"`,priority:Prisma.sql`p.priority`,status:Prisma.sql`p.status`}[filters.sort];
  const direction=filters.direction==='asc'?Prisma.sql`ASC`:Prisma.sql`DESC`;
  const privateFields=[];
  if(columns.includes('reporterName'))privateFields.push(Prisma.sql`d.reporter_name AS "reporterName"`);
  if(columns.includes('reporterContact'))privateFields.push(Prisma.sql`d.reporter_contact AS "reporterContact"`);
  const extra=privateFields.length?Prisma.sql`,${Prisma.join(privateFields)}`:Prisma.empty;
  const join=privateFields.length?Prisma.sql`LEFT JOIN public.occurrence_private_data d ON d.occurrence_id=o.id`:Prisma.empty;
  return {groups,statusPresentations,allowed,columns,where,sort,pageSort,direction,extra,join};
}

export async function listOccurrences(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters):Promise<ListResult>{
  const {groups,statusPresentations,allowed,columns,where,sort,pageSort,direction,extra,join}=await queryContext(tx,actor,filters);
  // Total and page share one SQL statement/snapshot; only the limited page leaves the DB.
  const rows=await tx.$queryRaw<{total:number;items:ListItem[]}[]>(Prisma.sql`
    WITH counted AS(SELECT count(*)::int AS total FROM public.occurrences o WHERE ${where}),
    page AS(SELECT o.id,o.protocol,o.type,o.status,o.priority,o.version,o.created_at AS "createdAt",o.updated_at AS "updatedAt",o.group_id AS "groupId",g.name AS "groupName" ${extra}
      FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id ${join} WHERE ${where}
      ORDER BY ${sort} ${direction},o.id ASC LIMIT ${filters.pageSize} OFFSET ${(filters.page-1)*filters.pageSize})
    SELECT total,coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY ${pageSort} ${direction},p.id ASC) FROM page p),'[]'::jsonb) AS items FROM counted`);
  return {items:rows[0].items,total:rows[0].total,page:filters.page,pageSize:filters.pageSize,filters,columns,availableColumns:allowed,groups,statusPresentations};
}

export async function exportOccurrences(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters):Promise<{items:ListItem[];total:number;columns:Column[]}>{
  const {allowed,columns,where,direction,extra,join}=await queryContext(tx,actor,filters);
  const order={createdAt:Prisma.sql`"createdAt"`,priority:Prisma.sql`priority`,status:Prisma.sql`status`}[filters.sort];
  const rows=await tx.$queryRaw<{item:ListItem;total:number}[]>(Prisma.sql`
    WITH filtered AS (
      SELECT o.id,o.protocol,o.type,o.status,o.priority,o.version,
        o.created_at AS "createdAt",o.updated_at AS "updatedAt",o.group_id AS "groupId",g.name AS "groupName" ${extra}
      FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id ${join}
      WHERE ${where}
    )
    SELECT to_jsonb(filtered) AS item,count(*) OVER()::int AS total
    FROM filtered
    ORDER BY ${order} ${direction},id ASC
  `);
  const total=rows[0]?.total??0;
  return {items:rows.map(row=>row.item),total,columns:validateColumns(columns,allowed)};
}
