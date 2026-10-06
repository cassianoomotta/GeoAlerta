'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {statuses} from '../list-input';
const defaults=['Nova','Em triagem','Em atendimento','Resolvida','Cancelada'];
export function ListStatusMenu(){
  const pathname=usePathname(),search=useSearchParams();
  const [items,setItems]=useState(statuses.map((code,index)=>({code,label:defaults[index],displayOrder:index+1})));
  useEffect(()=>{let mounted=true;void fetch('/api/core/status-presentations',{cache:'no-store'}).then(response=>response.ok?response.json():Promise.reject()).then((body:{items:{code:typeof statuses[number];label:string;displayOrder:number}[]})=>{if(mounted)setItems(body.items)}).catch(()=>{});return()=>{mounted=false}},[]);
  return <div aria-label="Lista por status" className="ml-4 flex flex-col gap-1 text-xs">{[...items].sort((a,b)=>a.displayOrder-b.displayOrder).map(({code:status,label})=>{
    const params=new URLSearchParams(pathname==='/painel/ocorrencias'?search.toString():'');params.set('status',status);params.set('page','1');
    return <Link key={status} className="rounded p-2 text-muted-foreground hover:bg-surface" href={`/painel/ocorrencias?${params}`}>{label}</Link>;
  })}</div>;
}
