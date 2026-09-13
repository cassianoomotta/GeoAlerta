"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Map as MapIcon, List, LogOut, ShieldAlert, Flame, HardHat, HeartHandshake, Building2, AlertTriangle, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Busca as últimas 10 ocorrências ao carregar a página
    const fetchOldNotifications = async () => {
      const { data } = await supabase
        .from('occurrences')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) {
        setNotifications(data);
      }
    };
    
    fetchOldNotifications();

    const channel = supabase
      .channel('public:occurrences')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'occurrences' }, (payload) => {
        setUnread((prev) => prev + 1);
        setNotifications((prev) => [payload.new, ...prev]);
        
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(err => console.log("Áudio bloqueado pelo navegador:", err));
        } catch(e) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      
      {/* Sidebar - Glassmorphism & Dark Mode */}
      <aside className="w-[280px] border-r border-white/5 bg-card/40 backdrop-blur-2xl flex flex-col shadow-2xl relative z-20">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">GeoAlerta</h2>
          </div>
          <span className="text-[0.7rem] font-bold text-primary uppercase tracking-widest block mt-2">
            Gabinete de Crise Integrado
          </span>
          <span className="text-xs text-slate-500 block mt-1">
            Santo Antônio da Patrulha - RS
          </span>

          {/* 4 Órgãos Integrados e Telefones com Mesmo Peso */}
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-col gap-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-400 font-medium">
                <ShieldAlert size={14} className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" /> Defesa Civil
              </span>
              <strong className="text-amber-500 font-mono">199</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-400 font-medium">
                <Flame size={14} className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" /> Bombeiros
              </span>
              <strong className="text-red-500 font-mono">193</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-400 font-medium">
                <HardHat size={14} className="text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" /> Sec. de Obras
              </span>
              <strong className="text-blue-500 font-mono">3662-8400</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-400 font-medium">
                <HeartHandshake size={14} className="text-fuchsia-500 drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]" /> Assist. Social
              </span>
              <strong className="text-fuchsia-500 font-mono">3662-8480</strong>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
          <Link 
            href="/painel" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${pathname === '/painel' ? 'bg-primary/10 text-primary border border-primary/20 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}`}
          >
            <MapIcon size={18} /> Mapa Tático
          </Link>
          <Link 
            href="/painel/tabela" 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${pathname === '/painel/tabela' ? 'bg-primary/10 text-primary border border-primary/20 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}`}
          >
            <List size={18} /> Tabela Operacional
          </Link>
        </nav>

        <div className="p-6 border-t border-white/5">
           <button 
             onClick={async () => {
               await supabase.auth.signOut();
               window.location.href = '/login';
             }}
             className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors text-sm font-medium border border-white/5"
           >
             <LogOut size={16} /> Encerrar Sessão
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900/40 via-background to-background">
        
        {/* Header - Glassmorphism */}
        <header className="h-[70px] border-b border-white/5 flex items-center justify-between px-8 bg-background/50 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 size={16} className="text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
            <span className="font-medium tracking-wide">Prefeitura de Santo Antônio da Patrulha</span>
            <span className="text-white/20 mx-2">•</span>
            <span className="font-semibold text-white">Central de Operações</span>
          </div>

          <div className="relative">
            <button 
              onClick={() => { setShowDropdown(!showDropdown); setUnread(0); }}
              className="flex items-center justify-center p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all relative"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-background">
                  {unread}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute top-[120%] right-0 w-[380px] z-50 p-2 flex flex-col gap-1 max-h-[500px] overflow-y-auto glass-card">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <h4 className="text-sm font-semibold text-white">Últimas Ocorrências</h4>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">Nenhuma nova notificação.</p>
                ) : (
                  notifications.map((n, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('flyToMarker', { detail: n.id }));
                        setShowDropdown(false);
                      }}
                      className="p-3 rounded-xl bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5 text-sm cursor-pointer transition-all flex gap-3 group"
                    >
                      {n.photo_url ? (
                        <img src={n.photo_url} alt="Foto" className="w-12 h-12 object-cover rounded-lg shrink-0 border border-white/10 group-hover:border-white/20 transition-colors" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg shrink-0 border border-white/10 flex items-center justify-center bg-white/5 text-slate-500">
                          <AlertTriangle size={18} />
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <strong className="text-red-400 text-sm drop-shadow-[0_0_3px_rgba(248,113,113,0.3)] truncate">{n.type}</strong>
                        <p className="my-0.5 text-slate-300 text-xs truncate">{n.description || 'Sem descrição'}</p>
                        <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                          {n.reporter_name || 'Anônimo'} • {new Date(n.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-6 overflow-hidden relative z-0">
          {children}
        </div>
      </main>
    </div>
  );
}
