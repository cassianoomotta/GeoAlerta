"use client";

import {useRef,useState,useSyncExternalStore} from 'react';
import {validatePublicInput} from '@/features/occurrences/public-input';
import type {GeoPosition,OpenResult} from '@/features/occurrences/contracts';
import {photoMetadata} from '@/features/occurrences/photos/contracts';
import {sendPublicAttempt, PhotoUploadFailure, type PhotoAttempt} from '@/features/occurrences/photos/public-attempt';
const subscribe=()=>()=>{};
export default function Home(){
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const [position,setPosition]=useState<GeoPosition|null>(null);
  const [locating,setLocating]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<OpenResult|null>(null);
  const attempt=useRef<PhotoAttempt|null>(null);
  const [photoFailed,setPhotoFailed]=useState(false);
  const [withoutPhoto,setWithoutPhoto]=useState(false);
  const [locked,setLocked]=useState(false);
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
    const selected=form.get('photo');
    const file=selected instanceof File&&selected.name?selected:null;
    let body:string;
    try{body=locked&&attempt.current?attempt.current.baseBody:JSON.stringify(validatePublicInput({reporterName:form.get('reporterName'),reporterContact:form.get('reporterContact'),type:form.get('type'),description:form.get('description'),position}));}catch{setError('Verifique os campos obrigatórios e a localização.');return;}
    const current=attempt.current;
    if(!locked && (current?.baseBody!==body || current?.file?.name!==file?.name || current?.file?.size!==file?.size || current?.file?.lastModified!==file?.lastModified)){
      attempt.current={baseBody:body,key:crypto.randomUUID(),file,uploadFailed:false,submissionStarted:false};setPhotoFailed(false);
      // Confirmation applies only to the file/fields for which upload failed.
      if(withoutPhoto){setWithoutPhoto(false);setError('Os dados mudaram. Confirme o envio novamente.');return;}
    }
    setSending(true);
    try{
      const data=await sendPublicAttempt(attempt.current!,withoutPhoto,{
        async stage(photo,key){
          try{photoMetadata(photo);}catch{throw new Error('Selecione JPEG, PNG ou WebP de até 5 MiB.');}
          const upload=new FormData();upload.set('file',photo);
          const response=await fetch('/api/core/public/photos',{method:'POST',headers:{'Idempotency-Key':key},body:upload});
          const result=await response.json();
          if(!response.ok || typeof result.photoToken!=='string')throw new Error(result.error?.message||'Não foi possível enviar a foto.');
          return result.photoToken;
        },
        async open(finalBody,key){
          setLocked(true);setPhotoFailed(false);
          let response:Response;
          try{response=await fetch('/api/core/public/occurrences',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:finalBody});}
          catch{throw new Error('Resposta não confirmada. Tente novamente com os mesmos dados; seu envio não será duplicado.');}
          const result=await response.json();
          if(!response.ok){
            if(result.error?.code==='INVALID_PHOTO_TOKEN'){
              const a=attempt.current!;a.token=undefined;a.finalBody=undefined;a.submissionStarted=false;a.uploadFailed=true;setLocked(false);setPhotoFailed(true);
            }
            throw new Error(result.error?.message||'Não foi possível confirmar. Tente novamente com os mesmos dados.');
          }
          return result;
        },
      });
      setResult(data);
    }catch(error){if(error instanceof PhotoUploadFailure)setPhotoFailed(true);setError(error instanceof Error?error.message:'Resposta não confirmada. Tente novamente com os mesmos dados; seu envio não será duplicado.');}
    finally{setSending(false);}
  }
  return <main className="min-h-screen bg-slate-950 text-white px-4 py-10"><div className="mx-auto max-w-xl">
    <h1 className="text-3xl font-bold">GeoAlerta</h1><p className="mt-2 text-slate-300">Registre uma ocorrência para atendimento municipal.</p>
    {result?<section role="status" className="mt-6 rounded-xl border border-green-500 p-6"><h2 className="text-xl">Ocorrência registrada</h2><p>Protocolo: <strong>{result.protocol}</strong></p><p>Status: {result.status}</p></section>:<form onSubmit={submit} className="mt-6 space-y-4">
      <fieldset disabled={sending||locked} className="space-y-4">
      <label className="block">Nome<input name="reporterName" required maxLength={120} className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Contato<input name="reporterContact" required maxLength={40} className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Tipo<input name="type" required maxLength={80} defaultValue="Alagamento / Inundação" className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Descrição<textarea name="description" required maxLength={2000} className="block w-full rounded p-3 bg-slate-800" /></label>
      <label className="block">Foto opcional (JPEG, PNG ou WebP, até 5 MiB)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full" onChange={()=>{attempt.current=null;setWithoutPhoto(false);setPhotoFailed(false);}} /></label>
      <button type="button" onClick={locate} disabled={!ready||locating||sending} className="rounded bg-slate-700 px-4 py-3 disabled:opacity-50">{locating?'Obtendo GPS...':'Obter localização'}</button>
      </fieldset>
      {position?<p role="status">Localização obtida. Precisão: {position.accuracy} metros.</p>:<p>O envio exige localização nativa do dispositivo.</p>}
      {error&&<p role="alert" aria-label="Problema no envio" className="text-orange-300">{error}</p>}
      {photoFailed&&!locked&&<label className="block"><input type="checkbox" checked={withoutPhoto} onChange={event=>setWithoutPhoto(event.target.checked)} disabled={sending}/> Confirmo que desejo enviar esta ocorrência sem foto.</label>}
      <button type="submit" disabled={!ready||!position||locating||sending} className="block w-full rounded bg-blue-600 p-3 disabled:opacity-50">{sending?'Confirmando registro...':'Enviar ocorrência'}</button>
    </form>}
  </div></main>;
}
