"use client";

import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import Image from 'next/image';
import {CheckCircle2,MapPin} from 'lucide-react';
import {GeoAlertaLogo} from '@/components/brand/geoalerta-logo';
import {validatePublicInput} from '@/features/occurrences/public-input';
import type {GeoPosition,OpenResult} from '@/features/occurrences/contracts';
import {photoMetadata} from '@/features/occurrences/photos/contracts';
import {sendPublicAttempt, PhotoUploadFailure, type PhotoAttempt} from '@/features/occurrences/photos/public-attempt';
import type {PublicShelter} from '@/features/shelters/contracts';
import {buildShelterDirections} from '@/features/shelters/domain/directions';
const subscribe=()=>()=>{};
const accuracyFormat=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
export default function Home(){
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const [position,setPosition]=useState<GeoPosition|null>(null);
  const [locating,setLocating]=useState(false);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<OpenResult|null>(null);
  const [shelters,setShelters]=useState<PublicShelter[]>([]);
  const [sheltersLoading,setSheltersLoading]=useState(false);
  const [sheltersError,setSheltersError]=useState(false);
  const attempt=useRef<PhotoAttempt|null>(null);
  const photoPickerRef=useRef<HTMLInputElement|null>(null);
  const cameraPickerRef=useRef<HTMLInputElement|null>(null);
  const [selectedPhoto,setSelectedPhoto]=useState<File|null>(null);
  const [photoFailed,setPhotoFailed]=useState(false);
  const [withoutPhoto,setWithoutPhoto]=useState(false);
  const [reporterContact,setReporterContact]=useState('');
  const [locked,setLocked]=useState(false);
  const [occurrenceTypes,setOccurrenceTypes]=useState<string[]>([]);
  const [typesLoading,setTypesLoading]=useState(true);
  const [typesError,setTypesError]=useState(false);
  function loadPublicShelters(){
    setShelters([]);setSheltersLoading(true);setSheltersError(false);
    fetch('/api/core/public/shelters',{cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('shelter-catalog-unavailable');
      const payload=await response.json();
      if(!Array.isArray(payload.shelters))throw new Error('invalid-shelter-catalog');
      setShelters(payload.shelters as PublicShelter[]);
    }).catch(()=>{setSheltersError(true);}).finally(()=>{setSheltersLoading(false);});
  }
  function selectPhoto(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.currentTarget.files?.[0];
    if(!file)return;
    setSelectedPhoto(file);attempt.current=null;setWithoutPhoto(false);setPhotoFailed(false);
    try{photoMetadata(file);setError('');}
    catch{setPhotoFailed(true);setError('Selecione JPEG, PNG ou WebP de até 5 MiB, ou confirme o envio sem foto.');}
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
    if(!selectedPhoto&&!withoutPhoto&&!locked){setError('Confirme o envio da ocorrência sem foto.');return;}
    const form=new FormData(event.currentTarget);
    const file=selectedPhoto;
    let body:string;
    const current=attempt.current;
    if(locked&&current){
      body=current.baseBody;
    }else{
      const medicalSupport=form.get('needsMedicalSupport');
      if(medicalSupport!=='true'&&medicalSupport!=='false'){setError('Informe se precisa de apoio médico.');return;}
      try{body=JSON.stringify(validatePublicInput({reporterName:form.get('reporterName'),reporterContact:form.get('reporterContact'),address:form.get('address'),type:form.get('type'),description:form.get('description'),position,needsMedicalSupport:medicalSupport==='true'},{allowedTypes:occurrenceTypes}));}catch{setError('Verifique os campos obrigatórios, o tipo selecionado e a localização.');return;}
    }
    if(!locked && (current?.baseBody!==body || current?.file?.name!==file?.name || current?.file?.size!==file?.size || current?.file?.lastModified!==file?.lastModified)){
      attempt.current={baseBody:body,key:crypto.randomUUID(),file,uploadFailed:false,submissionStarted:false};setPhotoFailed(false);
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
      setResult(data);loadPublicShelters();
    }catch(error){if(error instanceof PhotoUploadFailure){setPhotoFailed(true);setError(`${error.message} Você pode tentar novamente ou confirmar o envio sem foto.`);}else setError(error instanceof Error?error.message:'Resposta não confirmada. Tente novamente com os mesmos dados; seu envio não será duplicado.');}
    finally{setSending(false);}
  }
  const inputClass='mt-2 block w-full rounded-xl border border-control-border bg-surface px-4 py-3 text-base text-foreground  outline-none transition placeholder:text-muted-foreground focus:border-primary/30 focus:ring-2 focus:ring-ring disabled:bg-surface-subtle';
  return <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
    <div className="mx-auto max-w-[560px]">
      <header className="mb-8">
        <h1 className="mt-4"><GeoAlertaLogo className="block h-auto w-36 max-w-full sm:w-40" /></h1>
        <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">Conte pra gente o que aconteceu. Preencha as informações que souber; você também pode registrar uma ocorrência para outra pessoa.</p>
      </header>

      {result ? <section role="status" className="rounded-2xl border border-success/30 bg-surface p-6  sm:p-9">
        <div className="flex items-start gap-4">
          <CheckCircle2 aria-hidden="true" className="mt-1 h-8 w-8 shrink-0 text-success" />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Ocorrência registrada</h2>
            <p className="mt-2 text-muted-foreground">Guarde o protocolo para consultar este registro.</p>
            <p className="mt-5 rounded-xl bg-success-soft px-4 py-3 text-foreground">Protocolo: <strong className="break-all">{result.protocol}</strong></p>
            <p className="mt-3 text-sm text-muted-foreground">Status: {result.status}</p>
          </div>
        </div>
        <section className="mt-7 border-t border-border pt-6" aria-labelledby="available-shelters-title">
          <h3 id="available-shelters-title" className="text-lg font-semibold text-foreground">Abrigos disponíveis</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Estes abrigos estão marcados como ativos e abertos. Escolha um para abrir a rota no aplicativo desejado.</p>
          {sheltersLoading&&<p role="status" className="mt-4 text-sm text-muted-foreground">Consultando abrigos disponíveis…</p>}
          {sheltersError&&<div className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning"><p>A ocorrência foi registrada, mas não foi possível carregar a lista de abrigos.</p><button type="button" onClick={loadPublicShelters} className="mt-2 rounded-lg border border-warning/30 px-3 py-2 font-semibold text-warning">Tentar carregar abrigos novamente</button></div>}
          {!sheltersLoading&&!sheltersError&&shelters.length===0&&<p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted-foreground">No momento, não há abrigos ativos com situação Aberto cadastrados.</p>}
          {shelters.length>0&&<ul className="mt-4 grid gap-3 sm:grid-cols-2">{shelters.map(shelter=>{
            const routes=buildShelterDirections(shelter.lat,shelter.lng);
            return <li key={shelter.id} className="rounded-2xl border border-border bg-background p-4">
              <h4 className="font-semibold text-foreground">{shelter.name}</h4><p className="mt-1 text-sm text-muted-foreground">{shelter.address}</p>
              <p className="mt-2 inline-flex rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">Situação: {shelter.status}</p>
              <div className="mt-3 flex flex-wrap gap-2"><a href={routes.googleMaps} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary">Rota no Google Maps</a><a href={routes.waze} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-info/30 px-3 py-2 text-sm font-semibold text-info hover:bg-info-soft">Rota no Waze</a></div>
            </li>;
          })}</ul>}
        </section>
      </section> : <section className="overflow-hidden rounded-2xl border border-border bg-surface ">
        <div className="border-b border-border px-5 py-5 sm:px-8">
          <h2 className="text-xl font-semibold text-foreground">Informações da ocorrência</h2>
          <p className="mt-1 text-sm text-muted-foreground">Os campos marcados como opcionais podem ficar em branco.</p>
        </div>
        <form onSubmit={submit}>
          <fieldset disabled={sending||locked} className="min-w-0 space-y-5 border-0 px-5 py-6 sm:px-8">
            <label className="block text-sm font-semibold text-foreground"><span>Nome <span aria-hidden="true" className="text-danger">*</span></span><input name="reporterName" required maxLength={120} autoComplete="name" className={inputClass} /></label>
            <label className="block text-sm font-semibold text-foreground"><span>Contato <span aria-hidden="true" className="text-danger">*</span></span><input name="reporterContact" type="tel" inputMode="numeric" pattern="[0-9]+" value={reporterContact} onChange={event=>setReporterContact(event.target.value.replace(/\D/g,''))} required maxLength={40} autoComplete="tel" className={inputClass} /><span className="mt-2 block text-sm font-normal text-muted-foreground">Informe o telefone com DDD, somente números.</span></label>
            <label className="block text-sm font-semibold text-foreground"><span>Tipo de ocorrência <span aria-hidden="true" className="text-danger">*</span></span><select name="type" required defaultValue="" disabled={typesLoading||typesError||occurrenceTypes.length===0} className={`${inputClass} public-intake-select`}><option value="" disabled>{typesLoading?'Carregando tipos de ocorrência...':typesError?'Tipos temporariamente indisponíveis':'Selecione o tipo de ocorrência'}</option>{occurrenceTypes.map(type=><option key={type} value={type}>{type}</option>)}</select>{typesError&&<span role="status" className="mt-2 block text-sm font-normal text-warning">Não foi possível carregar os tipos. Atualize a página para tentar novamente.</span>}{!typesLoading&&!typesError&&occurrenceTypes.length===0&&<span role="status" className="mt-2 block text-sm font-normal text-muted-foreground">Nenhum tipo está disponível no momento.</span>}</label>
            <label className="block text-sm font-semibold text-foreground"><span>Descrição <span aria-hidden="true" className="text-danger">*</span></span><textarea name="description" required maxLength={2000} placeholder="Conte o que aconteceu e indique um ponto de referência próximo. Inclua detalhes que ajudem as equipes a localizar e atender a ocorrência." className={`${inputClass} min-h-32 resize-y`} /></label>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">Precisa de apoio médico? <span aria-hidden="true" className="text-danger">*</span></legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex min-h-11 items-center gap-2 text-sm text-foreground"><input type="radio" name="needsMedicalSupport" value="true" required className="h-4 w-4 accent-primary" />Sim</label>
                <label className="flex min-h-11 items-center gap-2 text-sm text-foreground"><input type="radio" name="needsMedicalSupport" value="false" required className="h-4 w-4 accent-primary" />Não</label>
              </div>
            </fieldset>
            <label className="block text-sm font-semibold text-foreground"><span>Endereço da ocorrência (opcional)</span><input name="address" maxLength={300} autoComplete="street-address" placeholder="Informe o endereço ou local onde ocorreu o problema" className={inputClass} /><span className="mt-2 block text-sm font-normal leading-relaxed text-muted-foreground">Informe o endereço do local, especialmente se estiver sem sinal ou registrando para outra pessoa.</span></label>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Foto opcional <span className="font-normal text-muted-foreground">(JPEG, PNG ou WebP, até 5 MiB)</span></p>
              <div className="flex flex-wrap gap-3">
                <input ref={photoPickerRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" tabIndex={-1} onChange={selectPhoto} />
                <input ref={cameraPickerRef} name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" tabIndex={-1} onChange={selectPhoto} />
                <button type="button" onClick={()=>photoPickerRef.current?.click()} disabled={sending||locked} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-control-border bg-surface px-4 py-2.5 font-semibold text-foreground transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60">Escolher foto</button>
                <button type="button" onClick={()=>cameraPickerRef.current?.click()} disabled={sending||locked} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/30 bg-primary-soft px-4 py-2.5 font-semibold text-primary transition hover:bg-primary-soft focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60">Tirar foto</button>
              </div>
              {selectedPhoto&&<p role="status" aria-live="polite" className="text-sm text-muted-foreground">Foto selecionada: <span className="font-medium text-foreground">{selectedPhoto.name}</span></p>}
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">Localização do dispositivo <span aria-hidden="true" className="text-danger">*</span></p>
                  {position ? <p role="status" className="mt-1 text-sm text-success">Localização obtida. Precisão: {accuracyFormat.format(position.accuracy)} metros.</p> : <p role="note" className="mt-1 text-sm leading-relaxed text-muted-foreground">Para enviar, é necessário permitir o acesso à localização. Toque no botão e autorize quando o navegador solicitar.</p>}
                </div>
              </div>
              <button type="button" onClick={locate} disabled={!ready||locating||sending} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:bg-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60">{locating?'Obtendo localização...':position?'Atualizar localização':'Obter localização'}</button>
            </div>
          </fieldset>

          <div className="space-y-4 border-t border-border bg-background px-5 py-5 sm:px-8">
            {error&&<p role="alert" aria-label="Problema no envio" className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">{error}</p>}
            {!locked&&<label className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${photoFailed?'border-warning/30 bg-warning-soft text-warning':'border-border bg-surface text-foreground'}`}><input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={withoutPhoto} required={!selectedPhoto} onChange={event=>{setWithoutPhoto(event.target.checked);attempt.current=null;setError('');}} disabled={sending}/> <span>Confirmo que desejo enviar esta ocorrência sem foto.{selectedPhoto&&<span className="mt-1 block text-xs">Ao marcar, a foto selecionada não será anexada.</span>}</span></label>}
            <button type="submit" disabled={!ready||!position||locating||sending} className="block min-h-12 w-full rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground  transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted-foreground disabled:shadow-none">{sending?'Registrando ocorrência...':'Enviar ocorrência'}</button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">{position?'Localização obtida. O registro será confirmado com um protocolo.':'Sua localização é necessária para concluir o registro.'}</p>
          </div>
        </form>
      </section>}
      <section aria-label="Instituições de atendimento" className="mt-6 rounded-2xl border border-border bg-surface p-5  sm:p-6">
        <h2 className="text-center text-sm font-semibold text-foreground">Órgãos públicos</h2>
        <div className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <figure className="col-span-2 flex min-h-28 flex-col items-center justify-center rounded-2xl border border-border bg-white px-4 py-3 sm:col-span-1">
            <Image src="/institutional/prefeitura-sap.png" alt="Prefeitura de Santo Antônio da Patrulha" width={3000} height={1256} sizes="(min-width: 1024px) 180px, (min-width: 640px) 200px, 66vw" className="h-14 w-full object-contain" />
            <figcaption className="mt-2 text-center text-xs font-medium text-slate-700">Prefeitura municipal</figcaption>
          </figure>
          <figure className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-border bg-white px-3 py-3">
            <Image src="/institutional/defesa-civil-rs.png" alt="Defesa Civil do Rio Grande do Sul" width={100} height={100} sizes="56px" className="h-14 w-14 object-contain" />
            <figcaption className="mt-2 text-center text-xs font-medium text-slate-700">Defesa Civil RS</figcaption>
          </figure>
          <figure className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-border bg-white px-3 py-3">
            <Image src="/institutional/cbmrs.png" alt="Corpo de Bombeiros Militar do Rio Grande do Sul" width={655} height={655} sizes="56px" className="h-14 w-14 object-contain" />
            <figcaption className="mt-2 text-center text-xs font-medium text-slate-700">Bombeiros RS</figcaption>
          </figure>
          <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-border bg-surface px-3 py-3 text-center">
            <span className="text-sm font-bold tracking-wide text-foreground">SEMOT</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">Obras, Trânsito e Segurança</span>
          </div>
          <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-border bg-surface px-3 py-3 text-center">
            <span className="text-sm font-bold tracking-wide text-foreground">SMTDS</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">Trabalho e Desenvolvimento Social</span>
          </div>
        </div>
      </section>
      <p className="mt-6 text-center text-xs text-muted-foreground">GeoAlerta · Registro de ocorrências para atendimento municipal</p>
    </div>
  </main>;
}
