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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight mb-0.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            Mapa Tático de Monitoramento
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Visão em tempo real das equipes de resposta rápida
          </p>
        </div>

        {/* Filtros Rápidos por Órgão e Camadas */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          
          <div className="glass-card flex items-center justify-between sm:justify-start gap-3 px-3 py-1.5 rounded-xl shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 tracking-wider">
              <Layers size={12} /> Camadas
            </span>
            <div className="flex items-center gap-2.5">
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
          </div>

          <div className="glass-card flex items-center gap-1.5 px-2 py-1.5 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button 
              onClick={() => setSelectedFilter("TODOS")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${selectedFilter === "TODOS" ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              Todos ({occurrences.length})
            </button>

            <button 
              onClick={() => setSelectedFilter("DEFESA_CIVIL")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${selectedFilter === "DEFESA_CIVIL" ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <ShieldAlert size={14} className={selectedFilter === "DEFESA_CIVIL" ? "text-amber-400" : "text-amber-600"} /> Defesa Civil
            </button>

            <button 
              onClick={() => setSelectedFilter("BOMBEIROS")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${selectedFilter === "BOMBEIROS" ? 'bg-red-500/10 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <Flame size={14} className={selectedFilter === "BOMBEIROS" ? "text-red-400" : "text-red-600"} /> Bombeiros
            </button>

            <button 
              onClick={() => setSelectedFilter("OBRAS")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${selectedFilter === "OBRAS" ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <HardHat size={14} className={selectedFilter === "OBRAS" ? "text-blue-400" : "text-blue-600"} /> Obras
            </button>

            <button 
              onClick={() => setSelectedFilter("ASSISTENCIA")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${selectedFilter === "ASSISTENCIA" ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]' : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-white'}`}
            >
              <HeartHandshake size={14} className={selectedFilter === "ASSISTENCIA" ? "text-fuchsia-400" : "text-fuchsia-600"} /> Social
            </button>

            <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0"></div>

            <button 
              onClick={fetchOccurrences}
              title="Atualizar dados"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Container do Mapa Tático */}
      <div className="glass-card flex-1 min-h-[300px] p-1 overflow-hidden relative group rounded-2xl">
        <MapComponent 
          occurrences={filteredOccurrences} 
          onMarkerClick={setSelectedOccurrence} 
          showOccurrences={showOccurrences}
          showFloodZones={showFloodZones}
          showShelters={showShelters}
        />
        
        {/* Backdrop para fechar no mobile */}
        {selectedOccurrence && (
          <div 
            onClick={() => setSelectedOccurrence(null)} 
            className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[999]"
          />
        )}

        {/* Modal Sobreposto no Mapa - Responsivo (Bottom Sheet no Mobile, Drawer na Direita no Desktop) */}
        {selectedOccurrence && (
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] sm:max-h-full sm:absolute sm:top-0 sm:right-0 sm:left-auto sm:w-[420px] sm:h-full bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-700/80 shadow-2xl z-[1000] flex flex-col rounded-t-2xl sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-start bg-slate-900 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"></span>
                  {selectedOccurrence.type}
                </h3>
                <div className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <MapPin size={13} className="text-blue-400 shrink-0" /> Aberto há {Math.floor((Date.now() - new Date(selectedOccurrence.created_at).getTime()) / 60000)} minutos
                </div>
              </div>
              <button 
                onClick={() => setSelectedOccurrence(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-800/80 border border-slate-700 transition-colors"
                title="Fechar painel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {selectedOccurrence.photo_url ? (
                <div className="mb-5">
                  <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 pl-0.5">Evidência Fotográfica</strong>
                  <a href={selectedOccurrence.photo_url} target="_blank" rel="noopener noreferrer" className="block group">
                    <div 
                      className="w-full h-48 rounded-xl bg-cover bg-center border-2 border-slate-700 shadow-md group-hover:border-blue-500 transition-all relative overflow-hidden" 
                      style={{ backgroundImage: `url(${selectedOccurrence.photo_url})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                        <span className="text-xs font-semibold text-white bg-black/60 px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5">
                          <ExternalLink size={12} /> Abrir Foto Original
                        </span>
                      </div>
                    </div>
                  </a>
                </div>
              ) : (
                <div className="w-full h-20 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 text-xs font-medium mb-5">
                  Nenhuma evidência fotográfica anexada
                </div>
              )}

              <div className="mb-5 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
                <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">Relator</strong>
                <div className="text-sm font-bold text-white">{selectedOccurrence.reporter_name || 'Cidadão Anônimo'}</div>
              </div>

              {selectedOccurrence.description && (
                <div className="mb-5">
                  <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 pl-0.5">Descrição do Evento</strong>
                  <div className="text-sm font-medium text-slate-200 leading-relaxed p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-sm">
                    {selectedOccurrence.description}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 pl-0.5">Status Operacional</strong>
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${selectedOccurrence.status === 'Resolvido' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : selectedOccurrence.status === 'Em Atendimento' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'}`}>
                  {selectedOccurrence.status === 'Resolvido' && <CheckCircle2 size={13} />}
                  {selectedOccurrence.status || 'Novo Registro'}
                </div>
              </div>

              <div className="mb-2">
                <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-300 mb-3 pl-0.5">Triagem e Despacho Tático</strong>
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Defesa Civil', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${selectedOccurrence.assigned_to === 'Defesa Civil' ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:border-amber-500/50 hover:text-amber-200 font-semibold'}`}>
                    <ShieldAlert size={15} /> Defesa Civil
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Bombeiros', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${selectedOccurrence.assigned_to === 'Bombeiros' ? 'bg-red-500/25 border-2 border-red-400 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.25)]' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-red-300 hover:border-red-500/50 hover:text-red-200 font-semibold'}`}>
                    <Flame size={15} /> Bombeiros
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Obras', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${selectedOccurrence.assigned_to === 'Obras' ? 'bg-blue-500/25 border-2 border-blue-400 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.25)]' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 hover:border-blue-500/50 hover:text-blue-200 font-semibold'}`}>
                    <HardHat size={15} /> Obras
                  </button>
                  <button 
                    disabled={updating}
                    onClick={() => updateOccurrence(selectedOccurrence.id, { assigned_to: 'Assistência Social', status: 'Em Atendimento' })}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all border ${selectedOccurrence.assigned_to === 'Assistência Social' ? 'bg-fuchsia-500/25 border-2 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_15px_rgba(217,70,239,0.25)]' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-fuchsia-300 hover:border-fuchsia-500/50 hover:text-fuchsia-200 font-semibold'}`}>
                    <HeartHandshake size={15} /> Ass. Social
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-3">
              <a 
                href={getGoogleMapsLink(selectedOccurrence.location)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <ExternalLink size={15} className="text-blue-400" /> Rota GPS
              </a>
              <button 
                disabled={updating || selectedOccurrence.status === 'Resolvido'}
                onClick={() => updateOccurrence(selectedOccurrence.id, { status: 'Resolvido' })}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${selectedOccurrence.status === 'Resolvido' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(5,150,105,0.4)] hover:bg-emerald-500 border border-emerald-400/40'}`}
              >
                <CheckCircle2 size={15} /> {selectedOccurrence.status === 'Resolvido' ? 'Resolvido' : 'Marcar Resolvido'}
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

