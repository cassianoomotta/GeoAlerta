"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Flame, HardHat, HeartHandshake, X, MapPin, ExternalLink, RefreshCw, CheckCircle2, Layers, Radio, Boxes, Users, AlertOctagon, Check, PhoneCall, Target, FileText, Search, Clock } from "lucide-react";
import { parseCoordinates, getGoogleMapsUrl, formatCoordinates, findClosestEntity } from "@/lib/geoUtils";
import { formatOpenedAgo } from "@/lib/dateUtils";
import { MUNICIPIO } from "@/modules/core/ui";
import { floodZonesGeoJSON } from "@/data/geo";
import { findSmartRecommendedTeam, checkOccurrenceInRiskZone } from "@/lib/dispatchIntelligence";
import type { MapShelter, MapTeamLive, MapResource, MapVolunteerSummary } from "@/components/MapComponent";

// Leaflet precisa ser carregado dinamicamente para evitar erro de 'window is not defined' no SSR
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc' }}>
      Carregando Mapa Tático da Cidade...
    </div>
  )
});

export const ORGAN_DEFAULT_BASES: Record<string, { lat: number; lng: number }> = {
  "Defesa Civil": { lat: -29.8285, lng: -50.5192 },
  "Bombeiros": { lat: -29.8214, lng: -50.5140 },
  "Obras": { lat: -29.8320, lng: -50.5230 },
  "Assistência Social": { lat: -29.8260, lng: -50.5165 },
  "Saúde": { lat: -29.8270, lng: -50.5150 },
  "Polícia": { lat: -29.8240, lng: -50.5210 },
};

function PainelContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  // ---------- Estado: Ocorrências ----------
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("TODOS");
  const [loading, setLoading] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [, setTimeTick] = useState(0);

  // Estados de Despacho e Apoio
  const [showSupportSelector, setShowSupportSelector] = useState(false);
  const [realtimeAlert, setRealtimeAlert] = useState<any | null>(null);
  const [showOccList, setShowOccList] = useState(false);
  const [occSearch, setOccSearch] = useState("");
  const [occStatusFilter, setOccStatusFilter] = useState<string>("TODOS");

  // ---------- Estado: Dados dos módulos ----------
  const [shelters, setShelters] = useState<MapShelter[]>([]);
  const [liveTeams, setLiveTeams] = useState<MapTeamLive[]>([]);
  const [resources, setResources] = useState<MapResource[]>([]);
  const [volunteerSummary, setVolunteerSummary] = useState<MapVolunteerSummary>({ total: 0, available: 0, bySpecialty: [] });

  // ---------- Estado: Visibilidade das camadas ----------
  const [showOccurrences, setShowOccurrences] = useState(true);
  const [showFloodZones, setShowFloodZones] = useState(false);
  const [showAutoFloodZones, setShowAutoFloodZones] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showVolunteers, setShowVolunteers] = useState(true);

  // Atualiza o contador de tempo relativo periodicamente a cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(t => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // ---------- Fetch: Ocorrências ----------
  const fetchOccurrences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('occurrences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOccurrences(data || []);
    } catch (e) {
      console.error('Erro ao buscar ocorrências:', e);
    }
  }, []);

  // ---------- Fetch: Abrigos (do Supabase) ----------
  const fetchShelters = useCallback(async () => {
    const { data } = await supabase
      .from("shelters")
      .select("*")
      .eq("municipio", MUNICIPIO);
    if (data) setShelters(data);
  }, []);

  // ---------- Fetch: Equipes GPS (em tempo real) ----------
  const fetchLiveTeams = useCallback(async () => {
    // 1. Buscar equipes cadastradas no município
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, organ, type, phone, leader, status")
      .eq("municipio", MUNICIPIO)
      .order("name");

    // 2. Buscar últimas posições enviadas pelos agentes
    const { data: locData } = await supabase
      .from("team_locations")
      .select("*")
      .order("sent_at", { ascending: false });

    // Guardar a coordenada mais recente de cada equipe
    const latestLocMap = new Map<string, any>();
    (locData || []).forEach((loc: any) => {
      if (!latestLocMap.has(loc.team_id)) {
        latestLocMap.set(loc.team_id, loc);
      }
    });

    const teamList: MapTeamLive[] = [];

    // Exibir no mapa SOMENTE equipes reais que realmente transmitiram sinal de GPS e estão ativas
    if (teamsData && teamsData.length > 0) {
      teamsData.forEach((t: any) => {
        const loc = latestLocMap.get(t.id);
        if (loc && t.status !== 'Indisponível' && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
          teamList.push({
            team_id: t.id,
            team_name: t.name,
            organ: t.organ || "Defesa Civil",
            type: t.type,
            lat: loc.lat,
            lng: loc.lng,
            accuracy: loc.accuracy,
            sent_at: loc.sent_at,
            member_name: loc.member_name || t.leader,
            phone: t.phone,
            status: t.status,
          });
        }
      });
    }

    // Posições adicionais de agentes em team_locations
    latestLocMap.forEach((loc: any, teamId: string) => {
      const alreadyInList = teamList.some(item => item.team_id === teamId);
      if (!alreadyInList && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
        teamList.push({
          team_id: loc.team_id,
          team_name: loc.team_name || "Equipe em Campo",
          organ: "Defesa Civil",
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          sent_at: loc.sent_at,
          member_name: loc.member_name,
        });
      }
    });

    setLiveTeams(teamList);
  }, []);

  // ---------- Fetch: Recursos ----------
  const fetchResources = useCallback(async () => {
    const { data } = await supabase
      .from("resources")
      .select("id, name, category, quantity, unit, status, shelter_id")
      .eq("municipio", MUNICIPIO);
    if (data) setResources(data);
  }, []);

  // ---------- Fetch: Voluntários (resumo agregado) ----------
  const fetchVolunteers = useCallback(async () => {
    const { data } = await supabase
      .from("volunteers")
      .select("specialty, available, status")
      .eq("municipio", MUNICIPIO);

    if (!data) return;

    const total = data.length;
    const available = data.filter((v: any) => v.available && v.status === "Ativo").length;

    // Agrupar por especialidade (só ativos)
    const specMap = new Map<string, number>();
    data.filter((v: any) => v.available && v.status === "Ativo").forEach((v: any) => {
      specMap.set(v.specialty, (specMap.get(v.specialty) || 0) + 1);
    });

    const bySpecialty = Array.from(specMap.entries())
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count);

    setVolunteerSummary({ total, available, bySpecialty });
  }, []);

  // ---------- Fetch inicial + Real-time ----------
  useEffect(() => {
    fetchOccurrences();
    fetchShelters();
    fetchLiveTeams();
    fetchResources();
    fetchVolunteers();

    // Real-time: ocorrências
    const occChannel = supabase
      .channel('public:occurrences:map')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'occurrences' }, (payload) => {
        const newOcc = payload.new;
        setOccurrences((prev) => [newOcc, ...prev]);
        setRealtimeAlert(newOcc);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'occurrences' }, (payload) => {
        setOccurrences((prev) => prev.map(o => o.id === payload.new.id ? payload.new : o));
        setSelectedOccurrence((prev: any) => (prev && prev.id === payload.new.id ? payload.new : prev));
      })
      .subscribe();

    // Real-time: equipes GPS (atualiza a cada insert)
    const teamChannel = supabase
      .channel('team-locations-map')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_locations' }, () => {
        fetchLiveTeams();
      })
      .subscribe();

    // Real-time: abrigos (ocupação pode mudar)
    const shelterChannel = supabase
      .channel('shelters-map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shelters' }, () => {
        fetchShelters();
      })
      .subscribe();

    // Heartbeat: atualizar GPS e recursos a cada 15s
    const heartbeat = setInterval(() => {
      fetchLiveTeams();
    }, 15000);

    return () => {
      supabase.removeChannel(occChannel);
      supabase.removeChannel(teamChannel);
      supabase.removeChannel(shelterChannel);
      clearInterval(heartbeat);
    };
  }, [fetchShelters, fetchLiveTeams, fetchResources, fetchVolunteers]);

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

  // Filtragem para a gaveta lateral de chamados
  const listFilteredOccurrences = useMemo(() => {
    return occurrences.filter((occ) => {
      if (occStatusFilter !== "TODOS" && (occ.status || "Aberto") !== occStatusFilter) {
        return false;
      }
      if (occSearch.trim()) {
        const q = occSearch.toLowerCase();
        const matchType = occ.type?.toLowerCase().includes(q);
        const matchDesc = occ.description?.toLowerCase().includes(q);
        const matchRep = occ.reporter_name?.toLowerCase().includes(q);
        if (!matchType && !matchDesc && !matchRep) return false;
      }
      return true;
    });
  }, [occurrences, occStatusFilter, occSearch]);

  // Identificar equipe mais próxima de qualquer ocorrência para exibir na listagem
  const getNearestTeamForOcc = useCallback((occ: any): { team: MapTeamLive; distKm: number } | null => {
    const coords = parseCoordinates(occ.location);
    if (!coords || liveTeams.length === 0) return null;
    let closest: MapTeamLive | null = null;
    let minD = Infinity;
    liveTeams.forEach((t) => {
      const dLat = (t.lat - coords.lat) * 111;
      const dLng = (t.lng - coords.lng) * 111 * Math.cos((coords.lat * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < minD) {
        minD = dist;
        closest = t;
      }
    });
    return closest ? { team: closest, distKm: Number(minD.toFixed(2)) } : null;
  }, [liveTeams]);

  const updateOccurrence = async (id: string, updates: any) => {
    setUpdating(true);
    try {
      const { error } = await supabase.from('occurrences').update(updates).eq('id', id);
      if (error) throw error;
      // Interface atualiza via real-time (postgres_changes)
      setOccurrences(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      setSelectedOccurrence((prev: any) => (prev && prev.id === id ? { ...prev, ...updates } : prev));
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

  // Identificar coordenadas do chamado selecionado e calcular a equipe recomendada via inteligência de despacho
  const occurrenceCoords = useMemo(() => {
    if (!selectedOccurrence) return null;
    return parseCoordinates(selectedOccurrence.location);
  }, [selectedOccurrence]);

  // Alocação Inteligente: cruza tipo de chamado, especialidade do órgão, status de disponibilidade e menor distância
  const recommendedTeam = useMemo(() => {
    if (!occurrenceCoords || liveTeams.length === 0) return null;
    return findSmartRecommendedTeam(occurrenceCoords, selectedOccurrence?.type, liveTeams);
  }, [occurrenceCoords, selectedOccurrence?.type, liveTeams]);

  // Vetor Tático de Resposta (desenha a linha visual no mapa conectando o chamado à viatura)
  const dispatchVector = useMemo(() => {
    if (!occurrenceCoords || !recommendedTeam || !recommendedTeam.team.lat || !recommendedTeam.team.lng) return null;
    return {
      from: [occurrenceCoords.lat, occurrenceCoords.lng] as [number, number],
      to: [recommendedTeam.team.lat, recommendedTeam.team.lng] as [number, number],
      teamName: recommendedTeam.team.team_name,
      distanceKm: recommendedTeam.distanceKm,
    };
  }, [occurrenceCoords, recommendedTeam]);

  // Verificação Point-in-Polygon: alerta se o chamado caiu dentro de uma mancha de inundação ativa
  const riskZoneCheck = useMemo(() => {
    if (!occurrenceCoords) return null;
    return checkOccurrenceInRiskZone(occurrenceCoords, floodZonesGeoJSON);
  }, [occurrenceCoords]);

  // Equipe recomendada para o chamado em tempo real
  const realtimeAlertClosest = useMemo(() => {
    if (!realtimeAlert) return null;
    const coords = parseCoordinates(realtimeAlert.location);
    if (!coords || liveTeams.length === 0) return null;
    return findSmartRecommendedTeam(coords, realtimeAlert?.type, liveTeams);
  }, [realtimeAlert, liveTeams]);

  // Contadores rápidos
  const liveTeamCount = liveTeams.length;

  // ---------- Fetch all on refresh ----------
  const refreshAll = () => {
    fetchOccurrences();
    fetchShelters();
    fetchLiveTeams();
    fetchResources();
    fetchVolunteers();
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
          
          {/* Controle de Camadas */}
          <div className="glass-card flex items-center justify-between sm:justify-start gap-2.5 px-3 py-1.5 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 tracking-wider shrink-0">
              <Layers size={12} /> Camadas
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showOccurrences} onChange={(e) => setShowOccurrences(e.target.checked)} className="accent-red-500 w-3 h-3" /> Ocorrências
              </label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showFloodZones} onChange={(e) => setShowFloodZones(e.target.checked)} className="accent-red-400 w-3 h-3" /> Manchas Oficiais
              </label>
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer text-sky-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showAutoFloodZones} onChange={(e) => setShowAutoFloodZones(e.target.checked)} className="accent-sky-400 w-3 h-3" /> 
                <span>Mancha IA</span>
                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 rounded-full font-bold">Auto</span>
              </label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showShelters} onChange={(e) => setShowShelters(e.target.checked)} className="accent-emerald-500 w-3 h-3" /> Abrigos
              </label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showTeams} onChange={(e) => setShowTeams(e.target.checked)} className="accent-blue-500 w-3 h-3" /> 
                Equipes
                {liveTeamCount > 0 && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded-full font-bold">{liveTeamCount}</span>}
              </label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showResources} onChange={(e) => setShowResources(e.target.checked)} className="accent-amber-500 w-3 h-3" /> Recursos
              </label>
              <label className="flex items-center gap-1 text-[10px] cursor-pointer text-slate-300 hover:text-white transition-colors font-medium whitespace-nowrap">
                <input type="checkbox" checked={showVolunteers} onChange={(e) => setShowVolunteers(e.target.checked)} className="accent-pink-500 w-3 h-3" /> Voluntários
              </label>
            </div>
          </div>

          {/* Filtros de Órgão */}
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

            <button 
              onClick={() => setShowOccList(prev => !prev)}
              title="Abrir Central de Chamados e Requisições"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer ${
                showOccList 
                  ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10'
              }`}
            >
              <FileText size={14} className={showOccList ? "text-white" : "text-blue-400"} />
              <span>Chamados ({occurrences.length})</span>
            </button>

            <div className="w-[1px] h-6 bg-white/10 mx-1 shrink-0"></div>

            <button 
              onClick={refreshAll}
              title="Atualizar todos os dados"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-primary" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Container do Mapa Tático */}
      <div className="glass-card flex-1 min-h-[300px] p-1 overflow-hidden relative group rounded-2xl">
        {/* Banner de Alerta em Tempo Real quando nova ocorrência entra */}
        {realtimeAlert && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] glass-card px-4 py-3 rounded-2xl shadow-2xl border border-red-500/50 bg-slate-900/95 flex items-center gap-3 animate-in slide-in-from-top duration-300 max-w-lg w-[92%]">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <AlertOctagon size={20} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">🚨 Novo Chamado Recebido</span>
              </div>
              <p className="text-xs text-white font-bold truncate">{realtimeAlert.type} • {realtimeAlert.reporter_name || 'Cidadão'}</p>
              {realtimeAlertClosest && (
                <p className="text-[11px] text-blue-300 truncate">
                  Alocação recomendada: <b>{realtimeAlertClosest.team.team_name}</b> (a {realtimeAlertClosest.distanceKm.toLocaleString('pt-BR')} km) • {realtimeAlertClosest.specialtyLabel}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => {
                  setSelectedOccurrence(realtimeAlert);
                  setRealtimeAlert(null);
                  window.dispatchEvent(new CustomEvent('flyToMarker', { detail: realtimeAlert.id }));
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Atender
              </button>
              <button 
                onClick={() => setRealtimeAlert(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar alerta"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <MapComponent 
          occurrences={filteredOccurrences} 
          onMarkerClick={setSelectedOccurrence} 
          showOccurrences={showOccurrences}
          showFloodZones={showFloodZones}
          showAutoFloodZones={showAutoFloodZones}
          showShelters={showShelters}
          showTeams={showTeams}
          showResources={showResources}
          showVolunteers={showVolunteers}
          shelters={shelters}
          liveTeams={liveTeams}
          resources={resources}
          volunteerSummary={volunteerSummary}
          dispatchVector={dispatchVector}
        />
        
        {/* Backdrop para fechar no mobile */}
        {(selectedOccurrence || showOccList) && (
          <div 
            onClick={() => {
              setSelectedOccurrence(null);
              setShowOccList(false);
            }} 
            className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[940]"
          />
        )}

        {/* Drawer Esquerdo: Central de Chamados / Requisições */}
        {showOccList && (
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] sm:max-h-full sm:absolute sm:top-0 sm:left-0 sm:w-[410px] sm:h-full bg-slate-900/98 border-t sm:border-t-0 sm:border-r border-slate-700/80 shadow-2xl z-[950] flex flex-col rounded-t-2xl sm:rounded-none animate-in slide-in-from-bottom sm:slide-in-from-left duration-300 backdrop-blur-xl">
            {/* Cabeçalho */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-blue-400" />
                  Central de Chamados
                </h3>
                <span className="text-xs text-slate-400">
                  {listFilteredOccurrences.length} de {occurrences.length} solicitações cadastradas
                </span>
              </div>
              <button
                onClick={() => setShowOccList(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar lista de chamados"
              >
                <X size={18} />
              </button>
            </div>

            {/* Barra de Busca e Filtros Rápidos */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-col gap-2 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por tipo, descrição ou relator..."
                  value={occSearch}
                  onChange={(e) => setOccSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 text-white placeholder-slate-500 border border-slate-700 rounded-lg focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { key: "TODOS", label: "Todos" },
                  { key: "Aberto", label: "Abertos" },
                  { key: "Em Atendimento", label: "Em Atendimento" },
                  { key: "Resolvido", label: "Resolvidos" },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setOccStatusFilter(st.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      occStatusFilter === st.key
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Cards */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 custom-scrollbar">
              {listFilteredOccurrences.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Nenhum chamado encontrado para este filtro.
                </div>
              ) : (
                listFilteredOccurrences.map((occ) => {
                  const nearest = getNearestTeamForOcc(occ);
                  const isAtTeamLocation = nearest && nearest.distKm < 0.1;
                  const isSelected = selectedOccurrence?.id === occ.id;

                  return (
                    <div
                      key={occ.id}
                      onClick={() => {
                        setSelectedOccurrence(occ);
                        window.dispatchEvent(new CustomEvent("flyToMarker", { detail: occ.id }));
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600/15 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                          : isAtTeamLocation
                          ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60"
                          : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: occ.type?.includes("Alagamento") ? "#38bdf8" : occ.type?.includes("Desabrigados") ? "#f59e0b" : "#ef4444" }}
                          />
                          <strong className="text-white text-xs font-bold leading-snug">
                            {occ.type}
                          </strong>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            occ.status === "Resolvido"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : occ.status === "Em Atendimento"
                              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {occ.status || "Aberto"}
                        </span>
                      </div>

                      {/* Informações complementares */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1.5">
                        <span>{occ.reporter_name || "Cidadão Anônimo"}</span>
                        <span>•</span>
                        <span>{formatOpenedAgo(occ.created_at)}</span>
                      </div>

                      {occ.description && (
                        <p className="text-xs text-slate-300 line-clamp-2 mb-2 bg-black/20 p-1.5 rounded-md">
                          {occ.description}
                        </p>
                      )}

                      {/* Indicador de Equipe Próxima / No Local */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        {nearest ? (
                          <span
                            className={`text-[10px] font-semibold flex items-center gap-1 ${
                              isAtTeamLocation
                                ? "text-amber-300 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            <span>🚒</span>
                            {isAtTeamLocation ? (
                              <span className="text-amber-300 font-bold">📍 No local da {nearest.team.team_name}</span>
                            ) : (
                              <span>{nearest.team.team_name} ({nearest.distKm.toLocaleString("pt-BR")} km)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Sem equipe próxima</span>
                        )}

                        <span className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5">
                          Ver no Mapa →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

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
                  <MapPin size={13} className="text-blue-400 shrink-0" /> {formatOpenedAgo(selectedOccurrence.created_at)}
                </div>
              </div>
              <button 
                onClick={() => setSelectedOccurrence(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 bg-slate-800/80 border border-slate-700 transition-colors cursor-pointer"
                title="Fechar painel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Alerta Point-in-Polygon se o chamado estiver dentro de área de risco */}
              {riskZoneCheck?.inRiskZone && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 animate-pulse shadow-xs">
                  <AlertOctagon size={20} className="text-red-400 shrink-0" />
                  <div>
                    <strong className="block text-red-300 font-bold">Chamado em Área de Risco Crítico</strong>
                    <span className="text-[11px] text-red-200/90">Sobreposto ao polígono: <b>{riskZoneCheck.zoneName}</b> ({riskZoneCheck.riskLevel})</span>
                  </div>
                </div>
              )}

              {/* Card de Destaque da Equipe Recomendada para Despacho via Inteligência */}
              {recommendedTeam && (
                <div className="mb-5 p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-left shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                      <Radio size={13} className="animate-pulse" />
                      <span>Alocação Inteligente de Despacho</span>
                    </div>
                    <span className="text-xs font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                      a {recommendedTeam.distanceKm.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <strong className="text-white text-base block">{recommendedTeam.team.team_name}</strong>
                  <span className="text-xs text-slate-300 block mb-2">{recommendedTeam.team.organ} • Status: <b className={recommendedTeam.isAvailable ? 'text-emerald-400' : 'text-amber-400'}>{recommendedTeam.team.status || 'Disponível'}</b></span>
                  
                  <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-500/20 text-[11px] text-blue-200 flex items-center gap-1.5">
                    <Target size={13} className="text-blue-400 shrink-0" />
                    <span>{recommendedTeam.matchReason}</span>
                  </div>
                </div>
              )}

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

              <div className="mb-5">
                <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 pl-0.5">Status Operacional</strong>
                <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${selectedOccurrence.status === 'Resolvido' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : selectedOccurrence.status === 'Em Atendimento' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : selectedOccurrence.status === 'Recusado' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40'}`}>
                  {selectedOccurrence.status === 'Resolvido' && <CheckCircle2 size={13} />}
                  {selectedOccurrence.status === 'Recusado' && <X size={13} />}
                  {selectedOccurrence.status || 'Novo Registro'}
                </div>
              </div>

              {/* Bloco de Ações e Fluxo de Decisão do Gestor */}
              <div className="mb-4">
                <strong className="block text-[11px] uppercase tracking-wider font-bold text-slate-300 mb-3 pl-0.5">
                  Decisão e Despacho Tático
                </strong>

                {/* CASO 1: Ocorrência ainda NÃO aceita nem recusada */}
                {selectedOccurrence.status !== 'Em Atendimento' && selectedOccurrence.status !== 'Resolvido' && selectedOccurrence.status !== 'Recusado' && (
                  <div className="flex flex-col gap-2.5">
                    <button
                      disabled={updating}
                      onClick={async () => {
                        const teamName = recommendedTeam ? recommendedTeam.team.team_name : 'Defesa Civil';
                        await updateOccurrence(selectedOccurrence.id, { 
                          status: 'Em Atendimento',
                          assigned_to: teamName
                        });
                        if (recommendedTeam?.team.team_id && !recommendedTeam.team.team_id.startsWith('defesa-civil-') && !recommendedTeam.team.team_id.startsWith('bombeiros-') && !recommendedTeam.team.team_id.startsWith('obras-') && !recommendedTeam.team.team_id.startsWith('social-')) {
                          await supabase.from('teams').update({ status: 'Em missão' }).eq('id', recommendedTeam.team.team_id);
                          fetchLiveTeams();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(5,150,105,0.3)] border border-emerald-400/40 cursor-pointer"
                    >
                      <CheckCircle2 size={16} /> Aceitar a solicitação
                      {recommendedTeam && <span className="text-[11px] font-normal opacity-90">({recommendedTeam.team.team_name})</span>}
                    </button>

                    <button
                      disabled={updating}
                      onClick={() => updateOccurrence(selectedOccurrence.id, { status: 'Recusado' })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                    >
                      <X size={15} /> Recusar a solicitação
                    </button>
                  </div>
                )}

                {/* CASO 2: Ocorrência já ACEITA (Em Atendimento) */}
                {selectedOccurrence.status === 'Em Atendimento' && (
                  <div className="flex flex-col gap-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                      <div className="font-bold text-amber-300 mb-0.5">Em atendimento por:</div>
                      <div className="text-white font-semibold text-sm">{selectedOccurrence.assigned_to || recommendedTeam?.team.team_name || 'Equipe Despachada'}</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        disabled={updating}
                        onClick={() => setShowSupportSelector(prev => !prev)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Users size={15} /> Solicitar ajuda de outras equipes
                      </button>

                      <button
                        disabled={updating}
                        onClick={async () => {
                          await updateOccurrence(selectedOccurrence.id, { status: 'Resolvido' });
                          if (recommendedTeam?.team.team_id && !recommendedTeam.team.team_id.startsWith('defesa-civil-') && !recommendedTeam.team.team_id.startsWith('bombeiros-') && !recommendedTeam.team.team_id.startsWith('obras-') && !recommendedTeam.team.team_id.startsWith('social-')) {
                            await supabase.from('teams').update({ status: 'Disponível' }).eq('id', recommendedTeam.team.team_id);
                            fetchLiveTeams();
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                      >
                        <CheckCircle2 size={15} /> Encerrar a ocorrência
                      </button>
                    </div>

                    {/* Seletor Expansível de Equipes de Apoio Adicional */}
                    {showSupportSelector && (
                      <div className="p-3.5 bg-slate-800/95 border border-slate-700 rounded-xl mt-1 space-y-2.5">
                        <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                          Selecione equipe ou órgão para solicitar apoio:
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {['Bombeiros', 'Defesa Civil', 'Obras', 'Assistência Social', 'Saúde', 'Polícia'].map(supportOrgan => (
                            <button
                              key={supportOrgan}
                              disabled={updating}
                              onClick={() => {
                                const current = selectedOccurrence.assigned_to || '';
                                if (!current.includes(supportOrgan)) {
                                  const updatedAssigned = current ? `${current} + ${supportOrgan} (Apoio)` : `${supportOrgan} (Apoio)`;
                                  updateOccurrence(selectedOccurrence.id, { assigned_to: updatedAssigned });
                                  setShowSupportSelector(false);
                                }
                              }}
                              className="py-2 px-2.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-left truncate flex items-center justify-between cursor-pointer"
                            >
                              <span>{supportOrgan}</span>
                              <span className="text-[10px] text-blue-400 font-bold">+ Apoio</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* CASO 3: Ocorrência Encerrada (Resolvido) */}
                {selectedOccurrence.status === 'Resolvido' && (
                  <div className="flex flex-col gap-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Ocorrência encerrada e atendida com sucesso.
                    </div>
                    <button
                      disabled={updating}
                      onClick={() => updateOccurrence(selectedOccurrence.id, { status: 'Em Atendimento' })}
                      className="text-xs text-slate-400 hover:text-white underline text-center mt-1 cursor-pointer"
                    >
                      Reabrir chamado para atendimento
                    </button>
                  </div>
                )}

                {/* CASO 4: Ocorrência Recusada */}
                {selectedOccurrence.status === 'Recusado' && (
                  <div className="flex flex-col gap-2">
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                      <X size={16} /> Solicitação recusada pela coordenação.
                    </div>
                    <button
                      disabled={updating}
                      onClick={() => updateOccurrence(selectedOccurrence.id, { status: 'Em Atendimento' })}
                      className="text-xs text-slate-400 hover:text-white underline text-center mt-1 cursor-pointer"
                    >
                      Reconsiderar e aceitar solicitação
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900 flex gap-2.5">
              <a 
                href={getGoogleMapsLink(selectedOccurrence.location)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <ExternalLink size={15} className="text-blue-400" /> Rota no Google Maps
              </a>

              {/* Botão de Notificação/Despacho no WhatsApp da Equipe */}
              {recommendedTeam && (
                <a
                  href={`https://api.whatsapp.com/send?${recommendedTeam.team.phone ? `phone=55${recommendedTeam.team.phone.replace(/\D/g, '')}&` : ''}text=${encodeURIComponent(
                    `🚨 *ALERTA DE DESPACHO - GEOALERTA*\n\n*Tipo:* ${selectedOccurrence.type}\n*Equipe Designada:* ${recommendedTeam.team.team_name} (a ${recommendedTeam.distanceKm} km)\n*Localização GPS:* ${getGoogleMapsLink(selectedOccurrence.location)}\n*Relator:* ${selectedOccurrence.reporter_name || 'Cidadão'}\n*Detalhes:* ${selectedOccurrence.description || 'Sem descrição adicional'}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors shadow-sm"
                  title={recommendedTeam.team.phone ? `Enviar despacho para ${recommendedTeam.team.phone}` : "Compartilhar detalhes via WhatsApp"}
                >
                  <PhoneCall size={14} /> WhatsApp
                </a>
              )}
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
