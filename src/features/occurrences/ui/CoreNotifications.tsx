'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Bell,ShieldAlert} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {formatTimeAgo} from '@/lib/dateUtils';
import {isRealtimeAuthorizationFailure,mergeCoreAlerts,parseCoreAlert,type CoreAlert} from '../alerts';

const visibleAlerts=20;
const recoveryLimit=50;

export function CoreNotifications(){
  const [alerts,setAlerts]=useState<CoreAlert[]>([]);
  const [unread,setUnread]=useState(0);
  const [open,setOpen]=useState(false);
  const [error,setError]=useState('');
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
      if(!session){closed=true;clearInterval(reconciliation);void supabase.removeChannel(channel);seen.current.clear();setAlerts([]);setUnread(0);}
    });
    return()=>{closed=true;clearInterval(reconciliation);subscription.unsubscribe();void supabase.removeChannel(channel);};
  },[receive]);

  return <div className="relative">
    <button type="button" onClick={()=>{setOpen(value=>!value);setUnread(0);}} className="flex items-center justify-center p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all relative" aria-label={`Alertas in-app${unread?`, ${unread} não lidos`:''}`} aria-expanded={open}>
      <Bell size={18}/>
      {unread>0&&<span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold border border-background">{unread>99?'99+':unread}</span>}
    </button>
    {open&&<section aria-label="Alertas in-app" className="absolute top-[120%] right-0 w-[calc(100vw-1.5rem)] max-w-[360px] z-50 p-2 flex flex-col gap-1 max-h-[75vh] md:max-h-[500px] overflow-y-auto glass-card shadow-2xl">
      <header className="px-3 py-2 border-b border-white/5 flex items-center justify-between"><h2 className="text-sm font-semibold text-white">Alertas de ocorrências</h2><button type="button" onClick={()=>setOpen(false)} className="text-slate-400 hover:text-white" aria-label="Fechar alertas">×</button></header>
      {error&&<p role="status" className="px-3 py-2 text-xs text-amber-200">{error}</p>}
      {alerts.length===0?<p className="text-sm text-slate-400 py-4 text-center">Nenhum alerta recente.</p>:alerts.map(alert=><Link key={alert.eventId} href={`/painel/ocorrencias/${encodeURIComponent(alert.occurrenceId)}`} onClick={()=>setOpen(false)} className="p-3 rounded-xl hover:bg-white/5 text-sm flex gap-3">
        <span className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center bg-white/5 text-amber-300"><ShieldAlert size={16}/></span>
        <span className="flex min-w-0 flex-col"><strong className="text-red-300 text-xs truncate">Nova ocorrência · Prioridade {alert.priority==='ALTA'?'alta':'normal'}</strong><span className="text-slate-300 text-xs">Status {alert.status}</span><time className="text-[10px] text-slate-500" dateTime={alert.at}>há {formatTimeAgo(alert.at)}</time></span>
      </Link>)}
    </section>}
  </div>;
}
