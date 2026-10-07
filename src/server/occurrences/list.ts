import 'server-only';
import {Prisma} from '../../../prisma/generated/client/client';
import type {Actor} from '@/features/access/contracts';
import {availableColumns,validateColumns,ListInputError,type Column,type ListFilters,type ListItem,type ListResult,type ListCatalogs} from '@/features/occurrences/list-input';
import {getColumns} from '@/features/access/infrastructure/preferences';
async function queryContext(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters){
  const groups=await tx.$queryRaw<{id:string;name:string}[]>`SELECT id,name FROM public.groups ORDER BY name,id`;
  const climateEvents=await tx.$queryRaw<{id:string;name:string;state:string}[]>`SELECT id::text,name,state FROM public.climate_events WHERE municipality_id=${actor.municipalityId} ORDER BY name,id`;
  const statusRows=await tx.$queryRaw<{code:ListItem['status'];label:string;display_order:number}[]>`SELECT code,label,display_order FROM public.status_presentations ORDER BY display_order,code`;
  const occurrenceTypes=await tx.$queryRaw<{name:string;active:boolean}[]>`SELECT name,active FROM public.occurrence_types ORDER BY display_order,name`;
  const [registeringInstitutions,neighborhoods,localities,damageLocations,serviceAgencies]=await Promise.all([
    tx.$queryRaw<{code:string;label:string}[]>`SELECT code,label FROM public.occurrence_registering_institutions ORDER BY display_order,code`,
    tx.$queryRaw<{code:string;label:string}[]>`SELECT code,label FROM public.occurrence_neighborhoods ORDER BY display_order,code`,
    tx.$queryRaw<{code:string;label:string}[]>`SELECT code,label FROM public.occurrence_localities ORDER BY display_order,code`,
    tx.$queryRaw<{code:string;label:string}[]>`SELECT code,label FROM public.occurrence_damage_locations ORDER BY display_order,code`,
    tx.$queryRaw<{code:string;label:string}[]>`SELECT code,label FROM public.occurrence_service_agencies ORDER BY display_order,code`,
  ]);
  const catalogs:ListCatalogs={registeringInstitutions,neighborhoods,localities,damageLocations,serviceAgencies};
  const statusPresentations=statusRows.map(row=>({code:row.code,label:row.label,displayOrder:row.display_order}));
  if(filters.groupId&&!groups.some(g=>g.id===filters.groupId))throw new ListInputError(403);
  if(filters.climateEventId&&filters.climateEventId!=='__NULL__'&&!climateEvents.some(event=>event.id===filters.climateEventId))throw new ListInputError(403);
  for(const [value,options] of [
    [filters.registeringInstitutionCode,catalogs.registeringInstitutions],
    [filters.neighborhoodCode,catalogs.neighborhoods],
    [filters.localityCode,catalogs.localities],
    [filters.damageLocationCode,catalogs.damageLocations],
    [filters.agencyCode,catalogs.serviceAgencies],
  ] as const)if(value&&value!=='__NULL__'&&!options.some(option=>option.code===value))throw new ListInputError();
  const allowed=availableColumns(actor.role!=='CONSULTA');
  if(!allowed.includes(filters.sort as Column))throw new ListInputError(403);
  const columns=filters.columns?validateColumns(filters.columns,allowed):await getColumns(tx,actor);
  const clauses=[Prisma.sql`o.deleted_at IS NULL`];
  if(filters.from)clauses.push(Prisma.sql`o.created_at>=${new Date(filters.from)}`);
  if(filters.to)clauses.push(Prisma.sql`o.created_at<${new Date(filters.to)}`);
  if(filters.status)clauses.push(Prisma.sql`o.status=${filters.status}`);
  if(filters.priority)clauses.push(Prisma.sql`o.priority=${filters.priority}`);
  if(filters.type)clauses.push(Prisma.sql`o.type=${filters.type}`);
  if(filters.registrationChannel)clauses.push(filters.registrationChannel==='__NULL__'?Prisma.sql`o.registration_channel IS NULL`:Prisma.sql`o.registration_channel=${filters.registrationChannel}`);
  if(filters.categoryStatus==='active')clauses.push(Prisma.sql`EXISTS(SELECT 1 FROM public.occurrence_types t WHERE t.name=o.type AND t.active)`);
  if(filters.categoryStatus==='inactive')clauses.push(Prisma.sql`EXISTS(SELECT 1 FROM public.occurrence_types t WHERE t.name=o.type AND NOT t.active)`);
  if(filters.groupId)clauses.push(Prisma.sql`o.group_id=${filters.groupId}::uuid`);
  if(filters.climateEventId)clauses.push(filters.climateEventId==='__NULL__'?Prisma.sql`o.climate_event_id IS NULL`:Prisma.sql`o.climate_event_id=${filters.climateEventId}::uuid`);
  if(filters.registeringInstitutionCode)clauses.push(filters.registeringInstitutionCode==='__NULL__'?Prisma.sql`o.registering_institution_code IS NULL`:Prisma.sql`o.registering_institution_code=${filters.registeringInstitutionCode}`);
  if(filters.neighborhoodCode)clauses.push(filters.neighborhoodCode==='__NULL__'?Prisma.sql`o.neighborhood_code IS NULL`:Prisma.sql`o.neighborhood_code=${filters.neighborhoodCode}`);
  if(filters.localityCode)clauses.push(filters.localityCode==='__NULL__'?Prisma.sql`o.locality_code IS NULL`:Prisma.sql`o.locality_code=${filters.localityCode}`);
  if(filters.situation)clauses.push(filters.situation==='__NULL__'?Prisma.sql`o.occurrence_situation IS NULL`:Prisma.sql`o.occurrence_situation=${filters.situation}`);
  if(filters.damageLocationCode)clauses.push(filters.damageLocationCode==='__NULL__'?Prisma.sql`o.damage_location_code IS NULL`:Prisma.sql`o.damage_location_code=${filters.damageLocationCode}`);
  if(filters.hasVictims)clauses.push(filters.hasVictims==='__NULL__'?Prisma.sql`o.has_victims IS NULL`:Prisma.sql`o.has_victims=${filters.hasVictims==='true'}`);
  if(filters.hasDisplaced)clauses.push(filters.hasDisplaced==='__NULL__'?Prisma.sql`o.has_displaced IS NULL`:Prisma.sql`o.has_displaced=${filters.hasDisplaced==='true'}`);
  if(filters.agencyCode)clauses.push(Prisma.sql`EXISTS(SELECT 1 FROM public.occurrence_service_records sr WHERE sr.occurrence_id=o.id AND sr.agency_code=${filters.agencyCode})`);
  const where=Prisma.join(clauses,' AND ');
  const sort={protocol:Prisma.sql`o.protocol`,createdAt:Prisma.sql`o.created_at`,status:Prisma.sql`o.status`,priority:Prisma.sql`o.priority`,type:Prisma.sql`o.type`,groupId:Prisma.sql`g.name`,needsMedicalSupport:Prisma.sql`o.needs_medical_support`,reporterName:Prisma.sql`d.reporter_name`,reporterContact:Prisma.sql`d.reporter_contact`}[filters.sort];
  const direction=filters.direction==='asc'?Prisma.sql`ASC`:Prisma.sql`DESC`;
  const privateFields=[];
  if(columns.includes('reporterName'))privateFields.push(Prisma.sql`d.reporter_name AS "reporterName"`);
  if(columns.includes('reporterContact'))privateFields.push(Prisma.sql`d.reporter_contact AS "reporterContact"`);
  const extra=privateFields.length?Prisma.sql`,${Prisma.join(privateFields)}`:Prisma.empty;
  const needsPrivateJoin=privateFields.length||filters.sort==='reporterName'||filters.sort==='reporterContact';
  const join=needsPrivateJoin?Prisma.sql`LEFT JOIN public.occurrence_private_data d ON d.occurrence_id=o.id`:Prisma.empty;
  return {groups,climateEvents,statusPresentations,occurrenceTypes,catalogs,allowed,columns,where,sort,direction,extra,join};
}

export async function listOccurrences(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters):Promise<ListResult>{
  const {groups,climateEvents,statusPresentations,occurrenceTypes,catalogs,allowed,columns,where,sort,direction,extra,join}=await queryContext(tx,actor,filters);
  // Total and page share one SQL statement/snapshot; only the limited page leaves the DB.
  const rows=await tx.$queryRaw<{total:number;items:ListItem[]}[]>(Prisma.sql`
    WITH counted AS(SELECT count(*)::int AS total FROM public.occurrences o WHERE ${where}),
    page AS(SELECT o.id,o.protocol,o.type,o.status,o.priority,o.version,o.created_at AS "createdAt",o.updated_at AS "updatedAt",o.group_id AS "groupId",g.name AS "groupName",o.climate_event_id::text AS "climateEventId",ce.name AS "climateEventName",o.needs_medical_support AS "needsMedicalSupport" ${extra}
      FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id LEFT JOIN public.climate_events ce ON ce.id=o.climate_event_id ${join} WHERE ${where}
      ORDER BY ${sort} ${direction},o.id ASC LIMIT ${filters.pageSize} OFFSET ${(filters.page-1)*filters.pageSize})
    SELECT total,coalesce((SELECT jsonb_agg(to_jsonb(p)-'__sortValue' ORDER BY p."__sortValue" ${direction},p.id ASC) FROM page p),'[]'::jsonb) AS items FROM counted`);
  return {items:rows[0].items,total:rows[0].total,page:filters.page,pageSize:filters.pageSize,filters,columns,availableColumns:allowed,groups,climateEvents,statusPresentations,occurrenceTypes,catalogs};
}

export async function exportOccurrences(tx:Prisma.TransactionClient,actor:Actor,filters:ListFilters):Promise<{items:ListItem[];total:number;columns:Column[]}>{
  const {allowed,columns,where,sort,direction,extra,join}=await queryContext(tx,actor,filters);
  const rows=await tx.$queryRaw<{item:ListItem;total:number}[]>(Prisma.sql`
    WITH filtered AS (
      SELECT o.id,o.protocol,o.type,o.status,o.priority,o.version,
        o.created_at AS "createdAt",o.updated_at AS "updatedAt",o.group_id AS "groupId",g.name AS "groupName",o.climate_event_id::text AS "climateEventId",ce.name AS "climateEventName",o.needs_medical_support AS "needsMedicalSupport" ${extra}
      FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id LEFT JOIN public.climate_events ce ON ce.id=o.climate_event_id ${join}
      WHERE ${where}
    )
    SELECT to_jsonb(filtered)-'__sortValue' AS item,count(*) OVER()::int AS total
    FROM filtered
    ORDER BY "__sortValue" ${direction},id ASC
  `);
  const total=rows[0]?.total??0;
  return {items:rows.map(row=>row.item),total,columns:validateColumns(columns,allowed)};
}
