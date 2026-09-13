"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Flame, HardHat, HeartHandshake, X, MapPin, ExternalLink, RefreshCw, CheckCircle2, Layers } from "lucide-react";
import { parseCoordinates, getGoogleMapsUrl, formatCoordinates } from "@/lib/geoUtils";

// Leaflet precisa ser carregado dinamicamente para evitar erro de 'window is not defined' no SSR
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc' }}>
      Carregando Mapa Tático da Cidade...
    </div>
  )
});

function PainelContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

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

  useEffect(() => {
    if (focusId && occurrences.length > 0) {
      const target = occurrences.find(o => o.id === focusId);
      if (target) {
        setSelectedOccurrence(target);
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('flyToMarker', { detail: focusId }));
        }, 500);
      }
    }
  }, [focusId, occurrences]);

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
    const coords = parseCoordinates(location);
    return getGoogleMapsUrl(coords);
  };

  return (
    <div className="flex flex-col h-full gap-4 relative">
      
      {/* Barra de Topo com Título e Filtros dos 4 Órgãos */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            Mapa Tático de Monitoramento
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Visão em tempo real das equipes de resposta rápida
          </p>
        </div>

        {/* Filtros Rápidos por Órgão e Camadas */}
        <div className="flex gap-4 flex-wrap">
          
          <div className="glass-card flex items-center gap-4 px-4 py-2 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5 tracking-wider">
              <Layers size={12} /> Camadas
            </span>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium">
              <input type="checkbox" checked={showOccurrences} onChange={(e) => setShowOccurrences(e.target.checked)} className="accent-primary" /> Ocorrências
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium">
              <input type="checkbox" checked={showFloodZones} onChange={(e) => setShowFloodZones(e.target.checked)} className="accent-red-500" /> Manchas
            </label>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium">
              <input type="checkbox" checked={showShelters} onChange={(e) => setShowShelters(e.target.checked)} className="accent-emerald-500" /> Abrigos
            </label>
          </div>

          <div className="glass-card flex items-center gap-1.5 px-2 py-1.5 rounded-xl">
            <button 
              onClick={() => setSelectedFilter("TODOS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${selectedFilter === "TODOS" ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              Todos ({occurrences.length})
            </button>

            <button 
              onClick={() => setSelectedFilter("DEFESA_CIVIL")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${selectedFilter === "DEFESA_CIVIL" ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <ShieldAlert size={14} className={selectedFilter === "DEFESA_CIVIL" ? "text-amber-400" : "text-amber-600"} /> Defesa Civil
            </button>

            <button 
              onClick={() => setSelectedFilter("BOMBEIROS")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${selectedFilter === "BOMBEIROS" ? 'bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <Flame size={14} className={selectedFilter === "BOMBEIROS" ? "text-red-400" : "text-red-600"} /> Bombeiros
            </button>

            <button 
              onClick={() => setSelectedFilter("OBRAS")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${selectedFilter === "OBRAS" ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <HardHat size={14} className={selectedFilter === "OBRAS" ? "text-blue-400" : "text-blue-600"} /> Obras
            </button>

            <button 
              onClick={() => setSelectedFilter("ASSISTENCIA")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${selectedFilter === "ASSISTENCIA" ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <HeartHandshake size={14} className={selectedFilter === "ASSISTENCIA" ? "text-fuchsia-400" : "text-fuchsia-600"} /> Social
            </button>

            <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

            <button 
              onClick={fetchOccurrences}
              title="Atualizar dados"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Container do Mapa Tático (Bento Grid) */}
      <div className="glass-card flex-1 p-1 overflow-hidden relative group">
        <MapComponent 
          occurrences={filteredOccurrences} 
          onMarkerClick={setSelectedOccurrence} 
          showOccurrences={showOccurrences}
          showFloodZones={showFloodZones}
          showShelters={showShelters}
        />
        
        {/* Modal Sobreposto no Mapa - Dark Glassmorphism */}
        {selectedOccurrence && (
          <div className="absolute top-0 right-0 w-[420px] max-w-full h-full bg-card/90 backdrop-blur-3xl border-l border-white/10 shadow-[auto_-20px_50px_rgba(0,0,0,0.5)] z-[1000] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/[0.01]">
              <div>
                <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  {selectedOccurrence.type}
                </h3>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <MapPin size={12} className="text-primary" /> Aberto há {Math.floor((Date.now() - new Date(selectedOccurrence.created_at).getTime()) / 60000)} minutos
                </div>
              </div>
              <button onClick={() => setSelectedOccurrence(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {selectedOccurrence.photo_url ? (
                <a href={selectedOccurrence.photo_url} target="_blank" rel="noopener noreferrer">
                  <div className="w-full h-48 rounded-2xl bg-cover bg-center mb-6 border border-white/10 shadow-lg group-hover:border-white/20 transition-all relative overflow-hidden" style={{ backgroundImage: `url(${selectedOccurrence.photo_url})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  </div>
                </a>
              ) : (
                <div className="w-full h-24 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 text-xs font-medium mb-6">
                  Nenhuma evidência fotográfica
                </div>
              )}

              <div className="mb-6 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <strong className="block text-[10px] uppercase tracking-[0.1em] text-slate-500 mb-1">Relator</strong>
                <div className="text-sm font-semibold text-white">{selectedOccurrence.reporter_name || 'Cidadão Anônimo'}</div>
              </div>

              {selectedOccurrence.description && (
                <div className="mb-6">
                  <strong className="block text-[10px] uppercase tracking-[0.1em] text-slate-500 mb-2 pl-1">Descrição do Evento</strong>
                  <div className="text-sm text-slate-300 leading-relaxed p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    {selectedOccurrence.description}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <strong className="block text-[10px] uppercase tracking-[0.1em] text-slate-500 mb-2 pl-1">Status Operacional</strong>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedOccurrence.status === 'Resolvido' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : selectedOccurrence.status === 'Em Atendimento' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                  {selectedOccurrence.status === 'Resolvido' && <CheckCircle2 size={12} />}
                  {selectedOccurrence.status || 'Novo Registro'}
                </div>
              </div>

              <div>
                <strong className="block text-[10px] uppercase tracking-[0.1em] text-slate-500 mb-3 pl-1">Triagem e Despacho Tático</strong>
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Defesa Civil', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${selectedOccurrence.assigned_to === 'Defesa Civil' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400'}`}>
                    <ShieldAlert size={14} /> Defesa Civil
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Bombeiros', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${selectedOccurrence.assigned_to === 'Bombeiros' ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'}`}>
                    <Flame size={14} /> Bombeiros
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Obras', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${selectedOccurrence.assigned_to === 'Obras' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400'}`}>
                    <HardHat size={14} /> Obras
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Assistência Social', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${selectedOccurrence.assigned_to === 'Assistência Social' ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.2)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 hover:text-fuchsia-400'}`}>
                    <HeartHandshake size={14} /> Ass. Social
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-white/[0.01] flex gap-3">
              <a 
                href={getGoogleMapsLink(selectedOccurrence.location)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors"
              >
                <ExternalLink size={14} className="text-primary" /> Rota GPS
              </a>
              <button 
                disabled={updating || selectedOccurrence.status === 'Resolvido'}
                onClick={() => updateOccurrence(selectedOccurrence.id, { status: 'Resolvido' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${selectedOccurrence.status === 'Resolvido' ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)] hover:bg-emerald-500 border border-emerald-500/50'}`}
              >
                <CheckCircle2 size={14} /> {selectedOccurrence.status === 'Resolvido' ? 'Resolvido' : 'Marcar Resolvido'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PainelPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Carregando painel...</div>}>
      <PainelContent />
    </Suspense>
  );
}

