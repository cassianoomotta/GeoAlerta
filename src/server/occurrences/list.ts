import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import type {Actor} from '@/features/access/contracts';
import {availableColumns,validateColumns,ListInputError,type ListFilters,type ListItem,type ListResult} from '@/features/occurrences/list-input';
import {getColumns} from '@/features/access/infrastructure/preferences';
export async function listOccurrences(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters):Promise<ListResult>{
  const groups=await tx.$queryRaw<{id:string;name:string}[]>`SELECT id,name FROM public.groups ORDER BY name,id`;
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
  // Total and page share one SQL statement/snapshot; only the limited page leaves the DB.
  const rows=await tx.$queryRaw<{total:number;items:ListItem[]}[]>(Prisma.sql`
    WITH counted AS(SELECT count(*)::int AS total FROM public.occurrences o WHERE ${where}),
    page AS(SELECT o.id,o.protocol,o.type,o.status,o.priority,o.version,o.created_at AS "createdAt",o.updated_at AS "updatedAt",o.group_id AS "groupId",g.name AS "groupName" ${extra}
      FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id ${join} WHERE ${where}
      ORDER BY ${sort} ${direction},o.id ASC LIMIT ${filters.pageSize} OFFSET ${(filters.page-1)*filters.pageSize})
    SELECT total,coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY ${pageSort} ${direction},p.id ASC) FROM page p),'[]'::jsonb) AS items FROM counted`);
  return {items:rows[0].items,total:rows[0].total,page:filters.page,pageSize:filters.pageSize,filters,columns,availableColumns:allowed,groups};
}
