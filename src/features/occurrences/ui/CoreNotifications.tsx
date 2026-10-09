'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Bell,X} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {PriorityBadge,StatusBadge} from './OccurrenceBadges';
import {useStatusLabels} from './use-status-labels';
import {formatTimeAgo} from '@/lib/dateUtils';
import {isRealtimeAuthorizationFailure,mergeCoreAlerts,parseAlertOccurrenceMetadata,parseCoreAlert,type CoreAlert} from '../alerts';

const visibleAlerts=20;
const recoveryLimit=50;

export function CoreNotifications(){
  const statusLabels=useStatusLabels();
  const [alerts,setAlerts]=useState<CoreAlert[]>([]);
  const [unread,setUnread]=useState(0);
  const [open,setOpen]=useState(false);
  const [error,setError]=useState('');
  const [metadata,setMetadata]=useState<ReturnType<typeof parseAlertOccurrenceMetadata>>({});
  const [metadataError,setMetadataError]=useState(false);
  const [metadataRetry,setMetadataRetry]=useState(0);
  const requestedMetadata=useRef(new Set<string>());
  const seen=useRef(new Set<string>());

  const receive=useCallback((values:unknown[],isLive:boolean)=>{
    const parsed=values.map(parseCoreAlert).filter((value):value is CoreAlert=>value!==null);
    let fresh=0;
    for(const alert of parsed){if(!seen.current.has(alert.eventId)){seen.current.add(alert.eventId);if(isLive)fresh++;}}
    if(seen.current.size>recoveryLimit*2)seen.current=new Set([...seen.current].slice(-recoveryLimit));
    setAlerts(current=>mergeCoreAlerts(current,parsed,visibleAlerts));
    if(fresh)setUnread(count=>count+fresh);
  },[]);

  useEffect(()=>{
    if(!open)return;
    const ids=[...new Set(alerts.map(alert=>alert.occurrenceId).filter(id=>!metadata[id]&&!requestedMetadata.current.has(id)))];
    if(!ids.length)return;
    ids.forEach(id=>requestedMetadata.current.add(id));
    let active=true;
    void fetch('/api/core/occurrences/notification-metadata',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({occurrenceIds:ids})})
      .then(async response=>{if(!response.ok)throw new Error('metadata-unavailable');const body=await response.json();return parseAlertOccurrenceMetadata(body.occurrences);})
      .then(result=>{if(active){setMetadata(current=>({...current,...result}));setMetadataError(false);}})
      .catch(()=>{ids.forEach(id=>requestedMetadata.current.delete(id));if(active)setMetadataError(true);});
    return()=>{active=false;};
  },[open,alerts,metadata,metadataRetry]);

  useEffect(()=>{
    let closed=false;
    let recovering=false;
    let cursor:string|null=null;
    let reconciliation:ReturnType<typeof setInterval>|undefined;
    const recover=async(isLive=false)=>{
      if(closed||recovering)return;
      recovering=true;
      try{
      const {data,error:queryError}=await supabase.rpc('core_alert_snapshot',{after_cursor:isLive?cursor:null}).abortSignal(AbortSignal.timeout(20_000)).single<{server_time:string;events:unknown[]}>();
      if(closed)return;
      if(queryError){
        if(isRealtimeAuthorizationFailure(queryError)){
          closed=true;
          clearInterval(reconciliation);
          setError('Sua autorização para receber alertas foi revogada. Entre novamente para restabelecer o acesso.');
          void supabase.removeChannel(channel);
          return;
        }
        setError('Não foi possível recuperar os alertas autorizados.');return;
      }
      if(!data||typeof data.server_time!=='string'||!Array.isArray(data.events)){
        setError('Não foi possível recuperar os alertas autorizados.');return;
      }
      cursor=data.server_time;
      receive(data.events,isLive);setError('');
      }finally{recovering=false;}
    };
    const channel=supabase.channel('core:occurrence-alerts',{config:{postgres_changes_options:{wait:true}}})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'occurrence_alerts'},payload=>receive([payload.new],true));
    const start=async()=>{
      const {data,error:sessionError}=await supabase.auth.getSession();
      if(closed)return;
      if(sessionError||!data.session){setError('Entre novamente para receber alertas autorizados.');return;}
      await supabase.realtime.setAuth(data.session.access_token);
      if(closed)return;
      await recover();
      if(closed)return;
      reconciliation=setInterval(()=>{void recover(true).catch(()=>{if(!closed)setError('Não foi possível recuperar os alertas autorizados.');});},3000);
      channel.subscribe((status,channelError)=>{
        if(status==='SUBSCRIBED')void recover();
        if(status==='TIMED_OUT'||status==='CLOSED'){
          setError('Conexão de alertas indisponível. Os alertas recentes serão recuperados quando reconectar.');
        }
        if(status==='CHANNEL_ERROR'&&isRealtimeAuthorizationFailure(channelError)){
          closed=true;
          clearInterval(reconciliation);
          setError('Sua autorização para receber alertas foi revogada. Entre novamente para restabelecer o acesso.');
          void supabase.removeChannel(channel);
        }
        if(status==='CHANNEL_ERROR'&&!isRealtimeAuthorizationFailure(channelError))
          setError('Não foi possível assinar os alertas. A conexão tentará se recuperar automaticamente.');
      });
    };
    void start().catch(()=>{if(!closed)setError('Não foi possível iniciar a conexão de alertas. Entre novamente.');});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(!session){closed=true;clearInterval(reconciliation);void supabase.removeChannel(channel);seen.current.clear();requestedMetadata.current.clear();setAlerts([]);setMetadata({});setMetadataError(false);setUnread(0);}
    });
    return()=>{closed=true;clearInterval(reconciliation);subscription.unsubscribe();void supabase.removeChannel(channel);};
  },[receive]);

  return <div className="relative">
    <span className="sr-only" aria-live="polite" aria-atomic="true">{unread?`${unread} novos alertas de ocorrências.`:''}</span>
    <button type="button" onClick={()=>{setOpen(value=>!value);setUnread(0);}} className="flex items-center justify-center min-h-10 min-w-10 p-2 sm:p-2.5 rounded-md bg-surface hover:bg-surface-subtle border border-border text-muted-foreground transition-all relative" aria-label={`Alertas in-app${unread?`, ${unread} não lidos`:''}`} aria-expanded={open}>
      <Bell size={18}/>
      {unread>0&&<span className="absolute -top-1 -right-1 bg-danger text-danger-foreground rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold border border-background">{unread>99?'99+':unread}</span>}
    </button>
    {open&&<section aria-label="Alertas in-app" className="absolute top-[120%] right-0 w-[calc(100vw-1.5rem)] max-w-[360px] z-50 p-2 flex flex-col gap-1 max-h-[75vh] md:max-h-[500px] overflow-y-auto surface-panel ">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Alertas de ocorrências</h2><button type="button" onClick={()=>setOpen(false)} className="btn btn-text px-3" aria-label="Fechar alertas"><X size={18} aria-hidden="true"/></button></header>
      {error&&<p role="status" className="px-3 py-2 text-xs text-warning">{error}</p>}
      {metadataError&&<p role="status" className="px-3 py-2 text-xs text-warning">Alguns protocolos não carregaram. <button type="button" className="font-semibold underline" onClick={()=>{requestedMetadata.current.clear();setMetadataError(false);setMetadataRetry(value=>value+1);}}>Tentar novamente</button></p>}
      {alerts.length===0?<p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta recente.</p>:alerts.map(alert=>{
        const detail=metadata[alert.occurrenceId];
        return <Link key={alert.eventId} href={`/painel/ocorrencias/${encodeURIComponent(alert.occurrenceId)}`} onClick={()=>setOpen(false)} className="flex gap-3 rounded-xl border border-border bg-surface-subtle p-3 text-sm transition-colors hover:border-primary/40 hover:bg-surface">
        <span className="flex min-w-0 flex-1 flex-col gap-2"><strong className="text-sm font-semibold text-foreground">{detail?.type??'Nova ocorrência'}</strong><span className="text-xs font-medium text-muted-foreground">{detail?`Protocolo ${detail.protocol}`:`Ocorrência ${alert.occurrenceId.slice(0,8)}`}</span><div className="flex flex-wrap gap-2"><PriorityBadge priority={alert.priority}/><StatusBadge status={alert.status} label={statusLabels[alert.status]}/></div><time className="text-sm text-muted-foreground" dateTime={alert.at}>há {formatTimeAgo(alert.at)}</time></span>
      </Link>;
      })}
    </section>}
  </div>;
}
