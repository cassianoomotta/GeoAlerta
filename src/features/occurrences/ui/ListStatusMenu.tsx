'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {statuses} from '../list-input';
const labels=['Novas','Em triagem','Em atendimento','Resolvidas','Canceladas'];
export function ListStatusMenu(){
  const pathname=usePathname(),search=useSearchParams();
  return <div aria-label="Lista por status" className="ml-4 flex flex-col gap-1 text-xs">{statuses.map((status,index)=>{
    const params=new URLSearchParams(pathname==='/painel/ocorrencias'?search.toString():'');params.set('status',status);params.set('page','1');
    return <Link key={status} className="rounded p-2 text-slate-300 hover:bg-white/10" href={`/painel/ocorrencias?${params}`}>{labels[index]}</Link>;
  })}</div>;
}
