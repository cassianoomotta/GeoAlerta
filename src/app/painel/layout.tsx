"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Bell, 
  Map as MapIcon, 
  List, 
  LogOut, 
  ShieldAlert, 
  Flame, 
  HardHat, 
  HeartHandshake, 
  Building2, 
  AlertTriangle,
  Menu,
  X,
  PhoneCall
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatTimeAgo } from "@/lib/dateUtils";
import { getEnabledModules } from "@/modules/registry";
import { MapPin, Boxes, Truck } from "lucide-react";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  monitoramento: <MapPin size={18} />,
  tabela: <List size={18} />,
  recursos: <Boxes size={18} />,
  abrigos: <Building2 size={18} />,
  equipes: <Truck size={18} />,
  voluntarios: <HeartHandshake size={18} />,
};

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Fechar gaveta mobile e dropdown ao navegar
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
  }, [pathname]);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      
      {/* 1. Sidebar Desktop (Oculta no mobile) */}
      <aside className="hidden md:flex md:w-[260px] lg:w-[280px] border-r border-white/5 bg-card/40 backdrop-blur-2xl flex-col shadow-2xl relative z-20 shrink-0">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 shrink-0">
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

          {/* 4 Órgãos Integrados e Telefones */}
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
          {getEnabledModules().map((m) => {
            const active = m.href === "/painel" ? pathname === "/painel" : pathname.startsWith(m.href);
            return (
              <Link
                key={m.slug}
                href={m.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${active ? 'bg-primary/10 text-primary border border-primary/20 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'}`}
              >
                {MODULE_ICONS[m.slug]} {m.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
           <button 
             onClick={handleLogout}
             className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors text-sm font-medium border border-white/5"
           >
             <LogOut size={16} /> Encerrar Sessão
           </button>
        </div>
      </aside>

      {/* 2. Gaveta / Drawer Mobile Lateral */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Escuro */}
          <div 
            onClick={() => setMobileMenuOpen(false)} 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />
          
          {/* Conteúdo da Gaveta */}
          <div className="relative w-[85%] max-w-[320px] bg-slate-900 border-r border-white/10 h-full flex flex-col shadow-2xl z-10 p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">GeoAlerta</h3>
                  <span className="text-[10px] text-slate-400">Gabinete de Crise SAP</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white bg-white/5 border border-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="my-5 flex flex-col gap-2">
              {getEnabledModules().map((m) => {
                const active = m.href === "/painel" ? pathname === "/painel" : pathname.startsWith(m.href);
                return (
                  <Link
                    key={m.slug}
                    href={m.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-300 hover:bg-white/5'}`}
                  >
                    {MODULE_ICONS[m.slug]} {m.label}
                  </Link>
                );
              })}
            </nav>

            {/* Contatos Rápidos no Mobile */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-2.5 text-xs mt-auto">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                Plantão de Emergência
              </span>
              <a href="tel:199" className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <span className="flex items-center gap-2 font-semibold"><ShieldAlert size={14} /> Defesa Civil</span>
                <strong className="font-mono">199</strong>
              </a>
              <a href="tel:193" className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">
                <span className="flex items-center gap-2 font-semibold"><Flame size={14} /> Bombeiros</span>
                <strong className="font-mono">193</strong>
              </a>
              <a href="tel:5136628400" className="flex items-center justify-between p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                <span className="flex items-center gap-2 font-semibold"><HardHat size={14} /> Obras</span>
                <strong className="font-mono">3662-8400</strong>
              </a>
              <a href="tel:5136628480" className="flex items-center justify-between p-2.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300">
                <span className="flex items-center gap-2 font-semibold"><HeartHandshake size={14} /> Assist. Social</span>
                <strong className="font-mono">3662-8480</strong>
              </a>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10">
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-sm font-semibold border border-red-500/20"
              >
                <LogOut size={16} /> Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Área de Conteúdo Principal */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900/40 via-background to-background">
        
        {/* Header - Totalmente Responsivo para Celular */}
        <header className="h-[56px] md:h-[70px] border-b border-white/5 flex items-center justify-between px-3 sm:px-6 md:px-8 bg-background/80 backdrop-blur-md relative z-30 shrink-0">
          
          {/* Lado Esquerdo (Botão Menu Mobile + Identificação) */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 md:hidden transition-colors flex items-center justify-center"
              aria-label="Abrir Menu"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Building2 size={16} className="text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.5)] shrink-0" />
              <span className="font-medium tracking-wide hidden sm:inline">Prefeitura de Santo Antônio da Patrulha</span>
              <span className="font-medium tracking-wide sm:hidden text-white font-bold">Gabinete de Crise</span>
              <span className="text-white/20 mx-1 hidden sm:inline">•</span>
              <span className="font-semibold text-white hidden sm:inline">Central de Operações</span>
            </div>
          </div>

          {/* Lado Direito (Sininho de Notificações) */}
          <div className="relative">
            <button 
              onClick={() => { setShowDropdown(!showDropdown); setUnread(0); }}
              className="flex items-center justify-center p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all relative"
              aria-label="Notificações"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-background">
                  {unread}
                </span>
              )}
            </button>

            {/* Dropdown Adaptado para Celular */}
            {showDropdown && (
              <div className="absolute top-[120%] right-0 w-[calc(100vw-1.5rem)] max-w-[360px] z-50 p-2 flex flex-col gap-1 max-h-[75vh] md:max-h-[500px] overflow-y-auto glass-card shadow-2xl">
                <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Últimas Ocorrências</h4>
                  <button onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-white sm:hidden p-1">
                    <X size={14} />
                  </button>
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
                      className="p-2.5 rounded-xl bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5 text-sm cursor-pointer transition-all flex gap-3 group"
                    >
                      {n.photo_url ? (
                        <img src={n.photo_url} alt="Foto" className="w-11 h-11 object-cover rounded-lg shrink-0 border border-white/10" />
                      ) : (
                        <div className="w-11 h-11 rounded-lg shrink-0 border border-white/10 flex items-center justify-center bg-white/5 text-slate-500">
                          <AlertTriangle size={16} />
                        </div>
                      )}
                      <div className="flex flex-col flex-1 min-w-0 justify-center">
                        <strong className="text-red-400 text-xs sm:text-sm truncate">{n.type}</strong>
                        <p className="my-0.5 text-slate-300 text-[11px] truncate">{n.description || 'Sem descrição'}</p>
                        <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                          {n.reporter_name || 'Anônimo'} • há {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        {/* 4. Container de Conteúdo (Filhos) com espaçamento responsivo */}
        <div className="flex-1 p-2 sm:p-4 md:p-6 pb-20 md:pb-6 overflow-hidden relative z-0 flex flex-col">
          {children}
        </div>

        {/* 5. Barra Inferior de Navegação Rápida (Mobile Bottom Bar) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 z-40 flex items-center justify-around px-2 shadow-2xl">
          <Link 
            href="/painel" 
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-xl text-[11px] font-semibold transition-all ${pathname === '/painel' ? 'text-primary bg-primary/10' : 'text-slate-400'}`}
          >
            <MapIcon size={18} />
            <span>Mapa</span>
          </Link>
          <Link 
            href="/painel/tabela" 
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-xl text-[11px] font-semibold transition-all ${pathname === '/painel/tabela' ? 'text-primary bg-primary/10' : 'text-slate-400'}`}
          >
            <List size={18} />
            <span>Tabela</span>
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-white"
          >
            <PhoneCall size={18} />
            <span>Plantão</span>
          </button>
        </nav>

      </main>
    </div>
  );
}
