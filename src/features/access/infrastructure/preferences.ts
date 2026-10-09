import 'server-only';
import type {Prisma} from '../../../../prisma/generated/client/client';
import type {Actor} from '../contracts';
import {availableColumns,validateColumns,publicColumns,type Column} from '@/features/occurrences/list-input';
export async function getColumns(tx:Prisma.TransactionClient,actor:Actor):Promise<Column[]>{
  const allowed=availableColumns(actor.role!=='CONSULTA' && actor.role!=='VOLUNTARIO');
  const rows=await tx.$queryRaw<{columns:unknown}[]>`SELECT columns FROM public.user_preferences WHERE user_id=${actor.userId}::uuid`;
  // A role change never restores previously selected private columns.
  const saved=rows[0]?.columns;
  const filtered=Array.isArray(saved)?saved.filter((c):c is Column=>allowed.includes(c)):[];
  return filtered.length?[...new Set(filtered)]:[...publicColumns];
}
export async function saveColumns(tx:Prisma.TransactionClient,actor:Actor,value:unknown):Promise<Column[]>{
  const columns=validateColumns(value,availableColumns(actor.role!=='CONSULTA' && actor.role!=='VOLUNTARIO'));
  await tx.$executeRaw`INSERT INTO public.user_preferences(user_id,columns) VALUES(${actor.userId}::uuid,${JSON.stringify(columns)}::jsonb) ON CONFLICT(user_id) DO UPDATE SET columns=EXCLUDED.columns`;
  return columns;
}
