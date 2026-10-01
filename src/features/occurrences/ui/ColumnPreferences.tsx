'use client';
import {useState,useSyncExternalStore,type FormEvent} from 'react';
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
  return <details className="rounded border border-slate-600 p-3"><summary>Minhas colunas</summary><form onSubmit={save} className="mt-3 flex flex-wrap items-center gap-4">
    {available.map(column=><label key={column} className="flex gap-2"><input type="checkbox" checked={selected.includes(column)} onChange={e=>setSelected(e.target.checked?[...selected,column]:selected.filter(c=>c!==column))}/>{columnLabels[column]}</label>)}
    <button disabled={!ready||busy||!selected.length} className="rounded bg-blue-700 px-3 py-2 disabled:opacity-50">Salvar colunas</button>{message&&<p role="status">{message}</p>}
  </form></details>;
}
