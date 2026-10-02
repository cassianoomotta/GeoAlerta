"use client";

import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Image from 'next/image';
import {CheckCircle2,MapPin} from 'lucide-react';
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
  const photoPickerRef=useRef<HTMLInputElement|null>(null);
  const cameraPickerRef=useRef<HTMLInputElement|null>(null);
  const [selectedPhoto,setSelectedPhoto]=useState<File|null>(null);
  const [photoFailed,setPhotoFailed]=useState(false);
  const [withoutPhoto,setWithoutPhoto]=useState(false);
  const [locked,setLocked]=useState(false);
  const [occurrenceTypes,setOccurrenceTypes]=useState<string[]>([]);
  const [typesLoading,setTypesLoading]=useState(true);
  const [typesError,setTypesError]=useState(false);
  function selectPhoto(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.currentTarget.files?.[0];
    if(!file)return;
    setSelectedPhoto(file);attempt.current=null;setWithoutPhoto(false);setPhotoFailed(false);
  }
  useEffect(()=>{
    let current=true;
    fetch('/api/core/public/occurrence-types',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('catalog-unavailable');
      const payload=await response.json();
      if(!Array.isArray(payload.types)||payload.types.some((type:unknown)=>typeof type!=='string'))throw new Error('invalid-catalog');
      if(current)setOccurrenceTypes(payload.types);
    }).catch(()=>{if(current)setTypesError(true);}).finally(()=>{if(current)setTypesLoading(false);});
    return ()=>{current=false;};
  },[]);
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
    const file=selectedPhoto;
    let body:string;
    try{body=locked&&attempt.current?attempt.current.baseBody:JSON.stringify(validatePublicInput({reporterName:form.get('reporterName'),reporterContact:form.get('reporterContact'),address:form.get('address'),type:form.get('type'),description:form.get('description'),position},{allowedTypes:occurrenceTypes}));}catch{setError('Verifique os campos obrigatórios, o tipo selecionado e a localização.');return;}
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
  const inputClass='mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100';
  return <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-4 py-8 text-slate-800 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 shadow-sm">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-teal-500" /> Registro de ocorrência
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">GeoAlerta</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">Conte pra gente o que aconteceu. Preencha as informações que souber; você também pode registrar uma ocorrência para outra pessoa.</p>
      </header>

      {result ? <section role="status" className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-xl shadow-emerald-900/5 sm:p-9">
        <div className="flex items-start gap-4">
          <CheckCircle2 aria-hidden="true" className="mt-1 h-8 w-8 shrink-0 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Ocorrência registrada</h2>
            <p className="mt-2 text-slate-600">Guarde o protocolo para consultar este registro.</p>
            <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-slate-800">Protocolo: <strong className="break-all">{result.protocol}</strong></p>
            <p className="mt-3 text-sm text-slate-600">Status: {result.status}</p>
          </div>
        </div>
      </section> : <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
          <h2 className="text-xl font-semibold text-slate-900">Informações da ocorrência</h2>
          <p className="mt-1 text-sm text-slate-500">Os campos marcados como opcionais podem ficar em branco.</p>
        </div>
        <form onSubmit={submit}>
          <fieldset disabled={sending||locked} className="min-w-0 space-y-5 border-0 px-5 py-6 sm:px-8">
            <label className="block text-sm font-semibold text-slate-800"><span>Nome <span aria-hidden="true" className="text-red-600">*</span></span><input name="reporterName" required maxLength={120} autoComplete="name" className={inputClass} /></label>
            <label className="block text-sm font-semibold text-slate-800"><span>Contato <span aria-hidden="true" className="text-red-600">*</span></span><input name="reporterContact" required maxLength={40} autoComplete="tel" className={inputClass} /></label>
            <label className="block text-sm font-semibold text-slate-800"><span>Tipo de ocorrência <span aria-hidden="true" className="text-red-600">*</span></span><select name="type" required defaultValue="" disabled={typesLoading||typesError||occurrenceTypes.length===0} className={`${inputClass} public-intake-select`}><option value="" disabled>{typesLoading?'Carregando tipos de ocorrência...':typesError?'Tipos temporariamente indisponíveis':'Selecione o tipo de ocorrência'}</option>{occurrenceTypes.map(type=><option key={type} value={type}>{type}</option>)}</select>{typesError&&<span role="status" className="mt-2 block text-sm font-normal text-amber-800">Não foi possível carregar os tipos. Atualize a página para tentar novamente.</span>}{!typesLoading&&!typesError&&occurrenceTypes.length===0&&<span role="status" className="mt-2 block text-sm font-normal text-slate-600">Nenhum tipo está disponível no momento.</span>}</label>
            <label className="block text-sm font-semibold text-slate-800"><span>Descrição <span aria-hidden="true" className="text-red-600">*</span></span><textarea name="description" required maxLength={2000} placeholder="Conte o que aconteceu e indique um ponto de referência próximo. Inclua detalhes que ajudem as equipes a localizar e atender a ocorrência." className={`${inputClass} min-h-32 resize-y`} /></label>
            <label className="block text-sm font-semibold text-slate-800"><span>Endereço da ocorrência (opcional)</span><input name="address" maxLength={300} autoComplete="street-address" placeholder="Informe o endereço ou local onde ocorreu o problema" className={inputClass} /><span className="mt-2 block text-sm font-normal leading-relaxed text-slate-600">Informe o endereço do local, especialmente se estiver sem sinal ou registrando para outra pessoa.</span></label>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-800">Foto opcional <span className="font-normal text-slate-500">(JPEG, PNG ou WebP, até 5 MiB)</span></p>
              <div className="flex flex-wrap gap-3">
                <input ref={photoPickerRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} onChange={selectPhoto} />
                <input ref={cameraPickerRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" tabIndex={-1} onChange={selectPhoto} />
                <button type="button" onClick={()=>photoPickerRef.current?.click()} disabled={sending||locked} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60">Escolher foto</button>
                <button type="button" onClick={()=>cameraPickerRef.current?.click()} disabled={sending||locked} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-700 bg-teal-50 px-4 py-2.5 font-semibold text-teal-800 transition hover:bg-teal-100 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60">Tirar foto</button>
              </div>
              {selectedPhoto&&<p role="status" aria-live="polite" className="text-sm text-slate-600">Foto selecionada: <span className="font-medium text-slate-800">{selectedPhoto.name}</span></p>}
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">Localização do dispositivo <span aria-hidden="true" className="text-red-600">*</span></p>
                  {position ? <p role="status" className="mt-1 text-sm text-emerald-800">Localização obtida. Precisão: {position.accuracy} metros.</p> : <p role="note" className="mt-1 text-sm leading-relaxed text-slate-600">Para enviar, é necessário permitir o acesso à localização. Toque no botão e autorize quando o navegador solicitar.</p>}
                </div>
              </div>
              <button type="button" onClick={locate} disabled={!ready||locating||sending} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-60">{locating?'Obtendo localização...':position?'Atualizar localização':'Obter localização'}</button>
            </div>
          </fieldset>

          <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-8">
            {error&&<p role="alert" aria-label="Problema no envio" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}
            {photoFailed&&!locked&&<label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal-700" checked={withoutPhoto} onChange={event=>setWithoutPhoto(event.target.checked)} disabled={sending}/> <span>Confirmo que desejo enviar esta ocorrência sem foto.</span></label>}
            <button type="submit" disabled={!ready||!position||locating||sending} className="block min-h-12 w-full rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none">{sending?'Registrando ocorrência...':'Enviar ocorrência'}</button>
            <p className="text-center text-xs leading-relaxed text-slate-500">Sua localização é necessária para concluir o registro.</p>
          </div>
        </form>
      </section>}
      <section aria-label="Instituições de atendimento" className="mt-6 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm sm:p-6">
        <h2 className="text-center text-sm font-semibold text-slate-700">Órgãos públicos</h2>
        <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <figure className="col-span-2 flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 py-3 sm:col-span-1">
            <Image src="/institutional/prefeitura-sap.png" alt="Prefeitura de Santo Antônio da Patrulha" width={3000} height={1256} sizes="(min-width: 1024px) 180px, (min-width: 640px) 200px, 66vw" className="h-14 w-full object-contain" />
            <figcaption className="mt-2 text-center text-xs font-medium text-slate-600">Prefeitura municipal</figcaption>
          </figure>
          <figure className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 py-3">
            <Image src="/institutional/defesa-civil-rs.png" alt="Defesa Civil do Rio Grande do Sul" width={100} height={100} sizes="56px" className="h-14 w-14 object-contain" />
            <figcaption className="mt-2 text-center text-xs font-medium text-slate-600">Defesa Civil RS</figcaption>
          </figure>
          <figure className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 py-3">
            <Image src="/institutional/cbmrs.png" alt="Corpo de Bombeiros Militar do Rio Grande do Sul" width={655} height={655} sizes="56px" className="h-14 w-14 object-contain" />
            <figcaption className="mt-2 text-center text-xs font-medium text-slate-600">Bombeiros RS</figcaption>
          </figure>
          <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 py-3 text-center">
            <span className="text-sm font-bold tracking-wide text-slate-800">SEMOT</span>
            <span className="mt-1 text-xs leading-relaxed text-slate-600">Obras, Trânsito e Segurança</span>
          </div>
          <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 py-3 text-center">
            <span className="text-sm font-bold tracking-wide text-slate-800">SMTDS</span>
            <span className="mt-1 text-xs leading-relaxed text-slate-600">Trabalho e Desenvolvimento Social</span>
          </div>
        </div>
      </section>
      <p className="mt-6 text-center text-xs text-slate-500">GeoAlerta · Registro de ocorrências para atendimento municipal</p>
    </div>
  </main>;
}
