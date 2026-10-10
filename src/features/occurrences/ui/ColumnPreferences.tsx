'use client';
import {useState,useSyncExternalStore,type FormEvent} from 'react';
import {ChevronDown} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {columnLabels,listHref,type Column,type ListFilters} from '../list-input';
const subscribe=()=>()=>{};
export function ColumnPreferences({columns,available,filters,returnTo}:{columns:Column[];available:Column[];filters:ListFilters;returnTo?:string}){
  const router=useRouter();const [selected,setSelected]=useState(columns);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  async function save(event:FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/core/preferences/columns',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({columns:selected})});
      if(!response.ok)throw new Error();
      setMessage('Colunas salvas para sua conta.');router.replace(returnTo??listHref(filters,{columns:undefined}));router.refresh();
    }catch{setMessage('Não foi possível salvar as colunas. Tente novamente.');}finally{setBusy(false);}
  }
  return <details aria-label="Filtros de colunas" className="rounded border border-control-border"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
    <span>Filtros de colunas</span>
    <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">Mostrar filtros <ChevronDown aria-hidden="true" size={15}/></span>
  </summary><form onSubmit={save} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
    {available.map(column=><label key={column} className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={selected.includes(column)} onChange={e=>setSelected(e.target.checked?[...selected,column]:selected.filter(c=>c!==column))}/>{columnLabels[column]}</label>)}
    <button disabled={!ready||busy||!selected.length} className="rounded bg-primary px-3 py-2 disabled:opacity-50 text-primary-foreground">Salvar colunas</button>{message&&<p role="status">{message}</p>}
  </form></details>;
}
