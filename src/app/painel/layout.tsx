"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Map as MapIcon, List, LogOut, ShieldAlert, Flame, HardHat, Building2, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

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
    <div style={{ display: 'flex', height: '100vh', background: 'var(--background)' }}>
      <aside style={{ width: '270px', borderRight: '1px solid var(--card-border)', background: 'var(--card-bg)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <AlertTriangle size={20} color="var(--danger)" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>GeoAlerta</h2>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
            Gabinete de Crise Integrado
          </span>
          <span style={{ fontSize: '0.72rem', opacity: 0.65, display: 'block', marginTop: '0.15rem' }}>
            Santo Antônio da Patrulha - RS
          </span>

          {/* Selos de Órgãos Integrados e Telefones */}
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.85 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldAlert size={13} color="#f59e0b" /> Defesa Civil
              </span>
              <strong style={{ color: '#f59e0b' }}>199</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.85 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Flame size={13} color="#ef4444" /> Bombeiros (CBMRS)
              </span>
              <strong style={{ color: '#ef4444' }}>193</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.85 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardHat size={13} color="#3b82f6" /> Sec. de Obras
              </span>
              <strong style={{ color: 'var(--primary)' }}>3662-8400</strong>
            </div>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          <Link href="/painel" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', color: 'var(--foreground)', textDecoration: 'none', borderLeft: '3px solid var(--primary)', background: 'rgba(37,99,235,0.08)', fontWeight: 600, fontSize: '0.9rem' }}>
            <MapIcon size={18} /> Mapa Tático
          </Link>
          <Link href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', color: 'var(--foreground)', textDecoration: 'none', opacity: 0.6, fontSize: '0.9rem' }}>
            <List size={18} /> Ocorrências (Em breve)
          </Link>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
           <button className="btn" style={{ width: '100%', background: 'transparent', color: 'var(--foreground)' }}>
             <LogOut size={18} /> Sair
           </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <header style={{ height: '70px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 2rem', background: 'var(--background)' }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setShowDropdown(!showDropdown); setUnread(0); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.5rem', color: 'var(--foreground)' }}
            >
              <Bell size={24} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white', borderRadius: '50%', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  {unread}
                </span>
              )}
            </button>

            {showDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: '350px', zIndex: 9999, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Últimas Ocorrências</h4>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Nenhuma nova notificação.</p>
                ) : (
                  notifications.map((n, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('flyToMarker', { detail: n.id }));
                        setShowDropdown(false);
                      }}
                      style={{ 
                        padding: '0.75rem', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '0.5rem', 
                        border: '1px solid var(--card-border)', 
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        gap: '0.75rem'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                      {n.photo_url && (
                        <img src={n.photo_url} alt="Foto" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem', flexShrink: 0 }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--danger)' }}>{n.type}</strong>
                        <p style={{ margin: '0.25rem 0', opacity: 0.8 }}>{n.description || 'Sem descrição'}</p>
                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>
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

        <div style={{ flex: 1, padding: '2rem', overflow: 'hidden' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
