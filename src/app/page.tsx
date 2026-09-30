"use client";

import {useRef,useState,useSyncExternalStore} from 'react';
import {validatePublicInput} from '@/features/occurrences/public-input';
import type {GeoPosition,OpenResult} from '@/features/occurrences/contracts';
const subscribe=()=>()=>{};
export default function Home(){
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const [position,setPosition]=useState<GeoPosition|null>(null);
  const [locating,setLocating]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<OpenResult|null>(null);
  const attempt=useRef<{body:string;key:string}|null>(null);
  function locate(){
    setPosition(null);setError('');setLocating(true);
    if(!navigator.geolocation){setError('Localização não disponível neste navegador. Use um dispositivo com GPS.');setLocating(false);return;}
    navigator.geolocation.getCurrentPosition(p=>{
      const point={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};
      if(!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||!Number.isFinite(point.accuracy)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180||point.accuracy<0){setError('Localização inválida. Tente obter o GPS novamente.');}
      else setPosition(point);
      setLocating(false);
    },e=>{setError(e.code===1?'Permissão de localização negada. Autorize o GPS e tente novamente.':e.code===3?'Tempo esgotado ao obter GPS. Tente novamente.':'GPS indisponível. Verifique o dispositivo e tente novamente.');setLocating(false);},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(sending)return;setError('');
    if(!position){setError('Obtenha sua localização antes de enviar.');return;}
    const form=new FormData(event.currentTarget);
    let body:string;
    try{body=JSON.stringify(validatePublicInput({reporterName:form.get('reporterName'),reporterContact:form.get('reporterContact'),type:form.get('type'),description:form.get('description'),position}));}catch{setError('Verifique os campos obrigatórios e a localização.');return;}
    if(attempt.current?.body!==body)attempt.current={body,key:crypto.randomUUID()};
    setSending(true);
    try{
      const response=await fetch('/api/core/public/occurrences',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':attempt.current!.key},body});
      const data=await response.json();
      if(!response.ok){setError(data.error?.message||'Não foi possível confirmar. Tente novamente com os mesmos dados.');return;}
      setResult(data);
    }catch{setError('Resposta não confirmada. Tente novamente com os mesmos dados; seu envio não será duplicado.');}
    finally{setSending(false);}
  }
  return <main className="min-h-screen bg-slate-950 text-white px-4 py-10"><div className="mx-auto max-w-xl">
    <h1 className="text-3xl font-bold">GeoAlerta</h1><p className="mt-2 text-slate-300">Registre uma ocorrência para atendimento municipal.</p>
    {result?<section role="status" className="mt-6 rounded-xl border border-green-500 p-6"><h2 className="text-xl">Ocorrência registrada</h2><p>Protocolo: <strong>{result.protocol}</strong></p><p>Status: {result.status}</p></section>:<form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">Nome<input name="reporterName" required maxLength={120} className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Contato<input name="reporterContact" required maxLength={40} className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Tipo<input name="type" required maxLength={80} defaultValue="Alagamento / Inundação" className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Descrição<textarea name="description" required maxLength={2000} className="block w-full rounded p-3 bg-slate-800" /></label>
      <button type="button" onClick={locate} disabled={!ready||locating||sending} className="rounded bg-slate-700 px-4 py-3 disabled:opacity-50">{locating?'Obtendo GPS...':'Obter localização'}</button>
      {position?<p role="status">Localização obtida. Precisão: {position.accuracy} metros.</p>:<p>O envio exige localização nativa do dispositivo.</p>}
      {error&&<p role="alert" aria-label="Problema no envio" className="text-orange-300">{error}</p>}
      <button type="submit" disabled={!ready||!position||locating||sending} className="block w-full rounded bg-blue-600 p-3 disabled:opacity-50">{sending?'Confirmando registro...':'Enviar ocorrência'}</button>
    </form>}
  </div></main>;
}
