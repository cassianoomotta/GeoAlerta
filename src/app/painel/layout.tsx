"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Map as MapIcon, List, LogOut, ShieldAlert, Flame, HardHat, HeartHandshake, Building2, AlertTriangle } from "lucide-react";
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
      <aside style={{ width: '270px', borderRight: '1px solid var(--card-border)', background: '#ffffff', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <AlertTriangle size={22} color="#dc2626" />
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: '#0f172a' }}>GeoAlerta</h2>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
            Gabinete de Crise Integrado
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.15rem' }}>
            Santo Antônio da Patrulha - RS
          </span>

          {/* 4 Órgãos Integrados e Telefones com Mesmo Peso */}
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 500 }}>
                <ShieldAlert size={14} color="#d97706" /> Defesa Civil
              </span>
              <strong style={{ color: '#d97706' }}>199</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 500 }}>
                <Flame size={14} color="#dc2626" /> Bombeiros (CBMRS)
              </span>
              <strong style={{ color: '#dc2626' }}>193</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 500 }}>
                <HardHat size={14} color="#2563eb" /> Sec. de Obras
              </span>
              <strong style={{ color: '#2563eb' }}>3662-8400</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontWeight: 500 }}>
                <HeartHandshake size={14} color="#a21caf" /> Assist. Social
              </span>
              <strong style={{ color: '#a21caf' }}>3662-8480</strong>
            </div>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link href="/painel" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#1d4ed8', textDecoration: 'none', borderRadius: '0.5rem', background: '#eff6ff', fontWeight: 600, fontSize: '0.875rem' }}>
            <MapIcon size={18} /> Mapa Tático
          </Link>
          <Link href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', color: '#64748b', textDecoration: 'none', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            <List size={18} /> Ocorrências (Em breve)
          </Link>
        </nav>

        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--card-border)' }}>
           <button className="btn" style={{ width: '100%', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
             <LogOut size={16} /> Sair
           </button>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <header style={{ height: '65px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#64748b' }}>
            <Building2 size={16} color="#2563eb" />
            <span>Prefeitura Municipal de Santo Antônio da Patrulha</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Central Operacional de Desastres</span>
          </div>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setShowDropdown(!showDropdown); setUnread(0); }}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', cursor: 'pointer', position: 'relative', padding: '0.5rem', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={20} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: 'white', borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold' }}>
                  {unread}
                </span>
              )}
            </button>

            {showDropdown && (
              <div style={{ position: 'absolute', top: '115%', right: 0, width: '360px', zIndex: 9999, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto', background: '#ffffff', border: '1px solid var(--card-border)', borderRadius: '1rem', boxShadow: 'var(--shadow-lg)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>Últimas Ocorrências</h4>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', padding: '1rem 0', textAlign: 'center' }}>Nenhuma nova notificação.</p>
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
                        background: '#f8fafc', 
                        borderRadius: '0.5rem', 
                        border: '1px solid #e2e8f0', 
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        gap: '0.75rem'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      {n.photo_url && (
                        <img src={n.photo_url} alt="Foto" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '0.375rem', flexShrink: 0, border: '1px solid #e2e8f0' }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>{n.type}</strong>
                        <p style={{ margin: '0.2rem 0', color: '#334155', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.description || 'Sem descrição'}</p>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
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

        <div style={{ flex: 1, padding: '1.5rem', overflow: 'hidden' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
