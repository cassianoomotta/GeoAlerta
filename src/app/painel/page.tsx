"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Flame, HardHat, HeartHandshake, X, MapPin, ExternalLink, RefreshCw, CheckCircle2, Layers } from "lucide-react";

// Leaflet precisa ser carregado dinamicamente para evitar erro de 'window is not defined' no SSR
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc' }}>
      Carregando Mapa Tático da Cidade...
    </div>
  )
});

export default function PainelPage() {
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("TODOS");
  const [loading, setLoading] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchOccurrences = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('occurrences')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) {
      setOccurrences(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOccurrences();

    const channel = supabase
      .channel('public:occurrences:map')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'occurrences' }, (payload) => {
        setOccurrences((prev) => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'occurrences' }, (payload) => {
        setOccurrences((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
        setSelectedOccurrence((prev: any) => (prev && prev.id === payload.new.id ? payload.new : prev));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [showOccurrences, setShowOccurrences] = useState(true);
  const [showFloodZones, setShowFloodZones] = useState(true);
  const [showShelters, setShowShelters] = useState(true);

  // Filtragem inteligente por Órgão com mesmo peso
  const filteredOccurrences = useMemo(() => {
    if (selectedFilter === "TODOS") return occurrences;
    if (selectedFilter === "DEFESA_CIVIL") {
      return occurrences.filter(o => o.type?.includes("Alagamento") || o.type?.includes("Deslizamento"));
    }
    if (selectedFilter === "BOMBEIROS") {
      return occurrences.filter(o => o.type?.includes("Árvore") || o.type?.includes("Fio") || o.type?.includes("Deslizamento"));
    }
    if (selectedFilter === "OBRAS") {
      return occurrences.filter(o => o.type?.includes("Bueiro") || o.type?.includes("Via") || o.type?.includes("Alagamento"));
    }
    if (selectedFilter === "ASSISTENCIA") {
      return occurrences.filter(o => o.type?.includes("Desabrigados") || o.type?.includes("Alimentos") || o.type?.includes("Acolhimento"));
    }
    return occurrences;
  }, [occurrences, selectedFilter]);

  const updateOccurrence = async (id: string, updates: any) => {
    setUpdating(true);
    try {
      const { error } = await supabase.from('occurrences').update(updates).eq('id', id);
      if (error) throw error;
      // Interface atualiza via real-time (postgres_changes)
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar ocorrência. Verifique permissões (RLS).");
    } finally {
      setUpdating(false);
    }
  };

  const getGoogleMapsLink = (location: any) => {
    if (!location) return "";
    let lat = 0, lng = 0;
    try {
      if (typeof location === 'string') {
        if (location.length === 50 && location.startsWith('0101')) {
          const bytes = new Uint8Array(location.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
          const view = new DataView(bytes.buffer);
          const isLittleEndian = bytes[0] === 1;
          lng = view.getFloat64(9, isLittleEndian);
          lat = view.getFloat64(17, isLittleEndian);
        } else {
          const match = location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          }
        }
      } else if (location.coordinates) {
         lng = location.coordinates[0];
         lat = location.coordinates[1];
      }
      return `https://www.google.com/maps?q=${lat},${lng}`;
    } catch(e) { return ""; }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      
      {/* Barra de Topo com Título e Filtros dos 4 Órgãos */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.15rem' }}>
            Mapa Tático de Monitoramento em Tempo Real
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Visão integrada das equipes de resposta em Santo Antônio da Patrulha (RS)
          </p>
        </div>

        {/* Filtros Rápidos por Órgão e Camadas */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Layers size={14} /> CAMADAS:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>
              <input type="checkbox" checked={showOccurrences} onChange={(e) => setShowOccurrences(e.target.checked)} /> Ocorrências
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>
              <input type="checkbox" checked={showFloodZones} onChange={(e) => setShowFloodZones(e.target.checked)} /> Manchas de Inundação
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', color: '#0f172a', fontWeight: 600 }}>
              <input type="checkbox" checked={showShelters} onChange={(e) => setShowShelters(e.target.checked)} /> Abrigos Oficiais
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', padding: '0.35rem 0.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setSelectedFilter("TODOS")}
              style={{ 
                padding: '0.35rem 0.75rem', 
                borderRadius: '0.5rem', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                border: 'none', 
                cursor: 'pointer',
                background: selectedFilter === "TODOS" ? '#0f172a' : 'transparent',
                color: selectedFilter === "TODOS" ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease'
              }}
            >
              Todos ({occurrences.length})
            </button>

            <button 
              onClick={() => setSelectedFilter("DEFESA_CIVIL")}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', 
                borderRadius: '0.5rem', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                border: 'none', 
                cursor: 'pointer',
                background: selectedFilter === "DEFESA_CIVIL" ? '#fffbeb' : 'transparent',
                color: selectedFilter === "DEFESA_CIVIL" ? '#92400e' : '#64748b',
                borderWidth: selectedFilter === "DEFESA_CIVIL" ? '1px' : '0',
                borderColor: '#fde68a',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldAlert size={14} color="#d97706" /> Defesa Civil
            </button>

            <button 
              onClick={() => setSelectedFilter("BOMBEIROS")}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', 
                borderRadius: '0.5rem', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                border: 'none', 
                cursor: 'pointer',
                background: selectedFilter === "BOMBEIROS" ? '#fef2f2' : 'transparent',
                color: selectedFilter === "BOMBEIROS" ? '#991b1b' : '#64748b',
                borderWidth: selectedFilter === "BOMBEIROS" ? '1px' : '0',
                borderColor: '#fecaca',
                transition: 'all 0.15s ease'
              }}
            >
              <Flame size={14} color="#dc2626" /> Bombeiros
            </button>

            <button 
              onClick={() => setSelectedFilter("OBRAS")}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', 
                borderRadius: '0.5rem', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                border: 'none', 
                cursor: 'pointer',
                background: selectedFilter === "OBRAS" ? '#eff6ff' : 'transparent',
                color: selectedFilter === "OBRAS" ? '#1e40af' : '#64748b',
                borderWidth: selectedFilter === "OBRAS" ? '1px' : '0',
                borderColor: '#bfdbfe',
                transition: 'all 0.15s ease'
              }}
            >
              <HardHat size={14} color="#2563eb" /> Obras
            </button>

            <button 
              onClick={() => setSelectedFilter("ASSISTENCIA")}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', 
                borderRadius: '0.5rem', 
                fontSize: '0.78rem', 
                fontWeight: 600, 
                border: 'none', 
                cursor: 'pointer',
                background: selectedFilter === "ASSISTENCIA" ? '#fdf4ff' : 'transparent',
                color: selectedFilter === "ASSISTENCIA" ? '#86198f' : '#64748b',
                borderWidth: selectedFilter === "ASSISTENCIA" ? '1px' : '0',
                borderColor: '#f5d0fe',
                transition: 'all 0.15s ease'
              }}
            >
              <HeartHandshake size={14} color="#a21caf" /> Assist. Social
            </button>

            <button 
              onClick={fetchOccurrences}
              title="Atualizar dados"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center', color: '#64748b' }}
            >
              <RefreshCw size={15} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Container do Mapa Tático */}
      <div className="glass-card" style={{ flex: 1, padding: '0.35rem', overflow: 'hidden', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: 'var(--shadow-md)', position: 'relative' }}>
        <MapComponent 
          occurrences={filteredOccurrences} 
          onMarkerClick={setSelectedOccurrence} 
          showOccurrences={showOccurrences}
          showFloodZones={showFloodZones}
          showShelters={showShelters}
        />
        
        {/* Modal Sobreposto no Mapa */}
        {selectedOccurrence && (
          <div style={{ position: 'absolute', top: 0, right: 0, width: '420px', maxWidth: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.98)', borderLeft: '1px solid #e2e8f0', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 1000, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                  {selectedOccurrence.type}
                </h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={12} /> Aberto há {Math.floor((Date.now() - new Date(selectedOccurrence.created_at).getTime()) / 60000)} minutos
                </div>
              </div>
              <button onClick={() => setSelectedOccurrence(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {selectedOccurrence.photo_url ? (
                <a href={selectedOccurrence.photo_url} target="_blank" rel="noopener noreferrer">
                  <div style={{ width: '100%', height: '200px', borderRadius: '0.75rem', backgroundImage: `url(${selectedOccurrence.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center', marginBottom: '1rem', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                </a>
              ) : (
                <div style={{ width: '100%', height: '100px', borderRadius: '0.75rem', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Nenhuma foto enviada
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.25rem' }}>Relator</strong>
                <div style={{ fontSize: '0.95rem', color: '#0f172a' }}>{selectedOccurrence.reporter_name || 'Anônimo'}</div>
              </div>

              {selectedOccurrence.description && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.25rem' }}>Descrição</strong>
                  <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    {selectedOccurrence.description}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.25rem' }}>Status Atual</strong>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600, background: selectedOccurrence.status === 'Resolvido' ? '#dcfce7' : selectedOccurrence.status === 'Em Atendimento' ? '#fef08a' : '#f1f5f9', color: selectedOccurrence.status === 'Resolvido' ? '#166534' : selectedOccurrence.status === 'Em Atendimento' ? '#854d0e' : '#475569' }}>
                  {selectedOccurrence.status || 'Novo'}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: '0.5rem' }}>Triagem e Despacho (Atribuir a:)</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Defesa Civil', status: 'Em Atendimento' })}
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fde68a', background: selectedOccurrence.assigned_to === 'Defesa Civil' ? '#fef3c7' : '#ffffff', color: '#92400e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <ShieldAlert size={14} /> Defesa Civil
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Bombeiros', status: 'Em Atendimento' })}
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fecaca', background: selectedOccurrence.assigned_to === 'Bombeiros' ? '#fee2e2' : '#ffffff', color: '#991b1b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <Flame size={14} /> Bombeiros
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Obras', status: 'Em Atendimento' })}
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #bfdbfe', background: selectedOccurrence.assigned_to === 'Obras' ? '#dbeafe' : '#ffffff', color: '#1e40af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <HardHat size={14} /> Obras
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Assistência Social', status: 'Em Atendimento' })}
                    style={{ padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #f5d0fe', background: selectedOccurrence.assigned_to === 'Assistência Social' ? '#fae8ff' : '#ffffff', color: '#86198f', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                    <HeartHandshake size={14} /> Assist. Social
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '0.5rem' }}>
              <a 
                href={getGoogleMapsLink(selectedOccurrence.location)} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <ExternalLink size={16} /> Abrir GPS
              </a>
              <button 
                disabled={updating || selectedOccurrence.status === 'Resolvido'}
                onClick={() => updateOccurrence(selectedOccurrence.id, { status: 'Resolvido' })}
                style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', background: selectedOccurrence.status === 'Resolvido' ? '#e2e8f0' : '#10b981', border: 'none', color: selectedOccurrence.status === 'Resolvido' ? '#94a3b8' : '#ffffff', fontSize: '0.85rem', fontWeight: 600, cursor: selectedOccurrence.status === 'Resolvido' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <CheckCircle2 size={16} /> {selectedOccurrence.status === 'Resolvido' ? 'Resolvido' : 'Marcar Resolvido'}
              </button>
            </div>
            <style jsx>{`
              @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
