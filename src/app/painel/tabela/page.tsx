"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  MapPin, 
  Map, 
  ExternalLink, 
  Copy, 
  Check, 
  Navigation,
  Eye,
  X,
  Clock,
  ShieldAlert,
  User,
  FileText,
  Building2,
  CheckCircle2
} from "lucide-react";
import { parseCoordinates, formatCoordinates, getGoogleMapsUrl, getWazeUrl } from "@/lib/geoUtils";

export default function TabelaPage() {
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [orgaoFilter, setOrgaoFilter] = useState("TODOS");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedDetailOcc, setSelectedDetailOcc] = useState<any | null>(null);

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
  }, []);

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(o => {
      const coords = parseCoordinates(o.location);
      const coordsStr = coords ? `${coords.lat} ${coords.lng}` : "";

      // Filtro de Texto (inclui busca por coordenadas)
      const textMatch = 
        (o.type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.reporter_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        coordsStr.includes(searchTerm);
      
      // Filtro de Status
      const statusMatch = statusFilter === "TODOS" || o.status === statusFilter;
      
      // Filtro de Órgão
      const orgaoMatch = orgaoFilter === "TODOS" || o.assigned_to === orgaoFilter;

      return textMatch && statusMatch && orgaoMatch;
    });
  }, [occurrences, searchTerm, statusFilter, orgaoFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToCSV = () => {
    if (filteredOccurrences.length === 0) return;
    
    // Header operacional completo com colunas de geolocalização e rotas
    const headers = [
      "ID", 
      "Tipo", 
      "Data e Hora", 
      "Relator", 
      "Latitude", 
      "Longitude", 
      "Link Google Maps", 
      "Link Waze", 
      "Status", 
      "Órgão Atribuído", 
      "Descrição"
    ];
    
    const rows = filteredOccurrences.map(o => {
      const coords = parseCoordinates(o.location);
      const lat = coords ? coords.lat.toString() : "";
      const lng = coords ? coords.lng.toString() : "";
      const gmaps = getGoogleMapsUrl(coords);
      const waze = getWazeUrl(coords);

      return [
        o.id,
        `"${o.type || ""}"`,
        `"${new Date(o.created_at).toLocaleString('pt-BR')}"`,
        `"${o.reporter_name || "Anônimo"}"`,
        lat,
        lng,
        `"${gmaps}"`,
        `"${waze}"`,
        `"${o.status || "Novo"}"`,
        `"${o.assigned_to || "Nenhum"}"`,
        `"${(o.description || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geoalerta_relatorio_operacional_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('occurrences')
        .update({ status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      setOccurrences(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
      if (selectedDetailOcc && selectedDetailOcc.id === id) {
        setSelectedDetailOcc((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      alert("Erro ao atualizar status.");
    }
  };

  const updateOrgao = async (id: string, newOrgao: string) => {
    try {
      const { error } = await supabase
        .from('occurrences')
        .update({ assigned_to: newOrgao })
        .eq('id', id);
        
      if (error) throw error;
      
      setOccurrences(prev => prev.map(o => o.id === id ? { ...o, assigned_to: newOrgao } : o));
      if (selectedDetailOcc && selectedDetailOcc.id === id) {
        setSelectedDetailOcc((prev: any) => ({ ...prev, assigned_to: newOrgao }));
      }
    } catch (e) {
      console.error("Erro ao atribuir órgão:", e);
      alert("Erro ao atualizar órgão.");
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Topo com Título e Ação de Exportação */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            Tabela Operacional de Desastres
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Rastreio geográfico, visualização de coordenadas em tempo real e exportação para relatórios de campo
          </p>
        </div>

        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(5,150,105,0.4)] border border-emerald-500/50 cursor-pointer"
        >
          <FileSpreadsheet size={16} /> Exportar CSV Completo
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="glass-card flex flex-wrap gap-4 p-4 items-center relative z-20">
        
        <div className="flex-1 min-w-[280px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por tipo, relator, coordenadas (ex: -29.82)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          <Filter size={16} className="text-slate-400" />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="TODOS" className="bg-slate-900 text-white">Qualquer Status</option>
            <option value="Novo" className="bg-slate-900 text-white">Novo</option>
            <option value="Aberto" className="bg-slate-900 text-white">Aberto</option>
            <option value="Em Atendimento" className="bg-slate-900 text-white">Em Atendimento</option>
            <option value="Resolvido" className="bg-slate-900 text-white">Resolvido</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={orgaoFilter}
            onChange={e => setOrgaoFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-slate-300 text-sm rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer"
          >
            <option value="TODOS" className="bg-slate-900 text-white">Qualquer Órgão</option>
            <option value="Defesa Civil" className="bg-slate-900 text-white">Defesa Civil</option>
            <option value="Bombeiros" className="bg-slate-900 text-white">Bombeiros</option>
            <option value="Obras" className="bg-slate-900 text-white">Obras</option>
            <option value="Assistência Social" className="bg-slate-900 text-white">Assistência Social</option>
          </select>
        </div>

        <button 
          onClick={fetchOccurrences}
          title="Atualizar dados agora"
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
        </button>

      </div>

      {/* Tabela com Rastreio de Coordenadas e Ações */}
      <div className="glass-card flex-1 overflow-auto relative z-10 custom-scrollbar">
        <table className="w-full text-left min-w-[1000px] border-collapse">
          <thead className="bg-white/[0.03] sticky top-0 z-20 backdrop-blur-md">
            <tr>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">ID</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">Data/Hora</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">Tipo</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">Relator</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">Rastreio & Coordenadas</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">Status</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">Órgão</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOccurrences.length > 0 ? filteredOccurrences.map(occ => {
              const coords = parseCoordinates(occ.location);
              const hasCoords = !!coords;

              return (
                <tr key={occ.id} className="hover:bg-white/[0.03] transition-colors group">
                  
                  {/* ID */}
                  <td className="p-4 text-xs text-slate-500 font-mono">
                    {occ.id.substring(0, 8)}
                  </td>
                  
                  {/* Data/Hora */}
                  <td className="p-4 text-xs text-slate-400 font-medium whitespace-nowrap">
                    {new Date(occ.created_at).toLocaleString('pt-BR')}
                  </td>
                  
                  {/* Tipo */}
                  <td className="p-4">
                    <span className="text-sm text-white font-bold block">
                      {occ.type}
                    </span>
                    {occ.description && (
                      <span className="text-[11px] text-slate-400 line-clamp-1 max-w-[200px]">
                        {occ.description}
                      </span>
                    )}
                  </td>
                  
                  {/* Relator */}
                  <td className="p-4 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-500" />
                      <span>{occ.reporter_name || 'Anônimo'}</span>
                    </div>
                  </td>
                  
                  {/* Rastreio Geográfico & Coordenadas */}
                  <td className="p-4">
                    {hasCoords ? (
                      <div className="flex flex-col gap-2 min-w-[240px]">
                        
                        {/* Coordenadas e Botão Copiar */}
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-200 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg tracking-tight">
                            <MapPin size={11} className="text-red-400" />
                            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                          </span>

                          <button
                            onClick={() => copyToClipboard(`${coords.lat}, ${coords.lng}`, occ.id)}
                            title="Copiar Coordenadas"
                            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            {copiedId === occ.id ? (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-sans font-bold">
                                <Check size={12} /> Copiado
                              </span>
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>

                        {/* Botões de Ação Direta no Mapa */}
                        <div className="flex items-center gap-2 flex-wrap">
                          
                          {/* Ver no Mapa Tático do GeoAlerta */}
                          <Link
                            href={`/painel?focus=${occ.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300 transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                            title="Localizar no Mapa Tático do GeoAlerta"
                          >
                            <Map size={12} />
                            <span>Ver no Mapa</span>
                          </Link>

                          {/* Link Rota Google Maps */}
                          <a
                            href={getGoogleMapsUrl(coords)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                            title="Abrir rota no Google Maps"
                          >
                            <ExternalLink size={11} />
                            <span>Google Maps</span>
                          </a>

                          {/* Link Rota Waze */}
                          <a
                            href={getWazeUrl(coords)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-cyan-400 transition-colors"
                            title="Navegar com Waze"
                          >
                            <Navigation size={11} />
                            <span>Waze</span>
                          </a>

                        </div>

                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic flex items-center gap-1">
                        <MapPin size={12} className="text-slate-600" /> Sem coordenadas
                      </span>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td className="p-4">
                    <select 
                      value={occ.status || 'Novo'}
                      onChange={(e) => updateStatus(occ.id, e.target.value)}
                      className={`outline-none appearance-none cursor-pointer inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                        occ.status === 'Resolvido' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                          : occ.status === 'Em Atendimento' 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                          : occ.status === 'Aberto' 
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' 
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <option value="Novo" className="bg-slate-900 text-white">Novo</option>
                      <option value="Aberto" className="bg-slate-900 text-white">Aberto</option>
                      <option value="Em Atendimento" className="bg-slate-900 text-white">Em Atendimento</option>
                      <option value="Resolvido" className="bg-slate-900 text-white">Resolvido</option>
                    </select>
                  </td>
                  
                  {/* Órgão Atribuído */}
                  <td className="p-4 text-xs font-semibold">
                    <select
                      value={occ.assigned_to || ""}
                      onChange={(e) => updateOrgao(occ.id, e.target.value)}
                      className={`bg-transparent outline-none border-b border-transparent hover:border-white/20 pb-0.5 cursor-pointer text-xs font-semibold ${
                        occ.assigned_to === 'Defesa Civil' ? 'text-amber-400' :
                        occ.assigned_to === 'Bombeiros' ? 'text-red-400' :
                        occ.assigned_to === 'Obras' ? 'text-blue-400' :
                        occ.assigned_to === 'Assistência Social' ? 'text-fuchsia-400' :
                        'text-slate-500'
                      }`}
                    >
                      <option value="" className="bg-slate-900 text-slate-400">Não Atribuído</option>
                      <option value="Defesa Civil" className="bg-slate-900 text-amber-400">Defesa Civil</option>
                      <option value="Bombeiros" className="bg-slate-900 text-red-400">Bombeiros</option>
                      <option value="Obras" className="bg-slate-900 text-blue-400">Obras</option>
                      <option value="Assistência Social" className="bg-slate-900 text-fuchsia-400">Assistência Social</option>
                    </select>
                  </td>

                  {/* Ações */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedDetailOcc(occ)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                      title="Ver todos os detalhes e evidências"
                    >
                      <Eye size={13} className="text-primary" />
                      <span>Detalhes</span>
                    </button>
                  </td>

                </tr>
              );
            }) : (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-500 text-sm font-medium">
                  Nenhuma ocorrência encontrada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes da Ocorrência e Rastreio Completo */}
      {selectedDetailOcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card max-w-xl w-full border border-white/15 bg-slate-950/95 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {selectedDetailOcc.type}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {selectedDetailOcc.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailOcc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              
              {/* Card de Rastreio e Localização */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} className="text-red-400" /> Rastreamento Geográfico do Chamado
                </span>

                {(() => {
                  const coords = parseCoordinates(selectedDetailOcc.location);
                  if (!coords) {
                    return <p className="text-xs text-slate-500">Nenhuma coordenada registrada para este chamado.</p>;
                  }
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5 font-mono text-xs text-slate-200">
                        <div>
                          <span className="text-slate-500 mr-2">LAT:</span>{coords.lat.toFixed(6)}
                          <span className="text-slate-500 mx-3">|</span>
                          <span className="text-slate-500 mr-2">LNG:</span>{coords.lng.toFixed(6)}
                        </div>
                        <button
                          onClick={() => copyToClipboard(`${coords.lat}, ${coords.lng}`, 'modal')}
                          className="text-[11px] font-sans font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === 'modal' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          {copiedId === 'modal' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex gap-2.5">
                        <Link
                          href={`/painel?focus=${selectedDetailOcc.id}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
                        >
                          <Map size={14} /> Ver no Mapa Tático
                        </Link>
                        <a
                          href={getGoogleMapsUrl(coords)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-colors"
                        >
                          <ExternalLink size={14} className="text-emerald-400" /> Google Maps
                        </a>
                        <a
                          href={getWazeUrl(coords)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-colors"
                        >
                          <Navigation size={14} className="text-cyan-400" /> Waze
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Informações do Relator e Data */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cidadão / Relator</span>
                  <p className="text-sm font-semibold text-white">{selectedDetailOcc.reporter_name || 'Anônimo'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Data de Registro</span>
                  <p className="text-xs font-medium text-slate-300">{new Date(selectedDetailOcc.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Descrição */}
              {selectedDetailOcc.description && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Relato do Cidadão</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedDetailOcc.description}</p>
                </div>
              )}

              {/* Foto da Evidência */}
              {selectedDetailOcc.photo_url && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Evidência Fotográfica</span>
                  <div className="relative rounded-lg overflow-hidden border border-white/10 max-h-56">
                    <img 
                      src={selectedDetailOcc.photo_url} 
                      alt="Evidência da ocorrência" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>
              )}

              {/* Controles de Status e Órgão */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Status da Ocorrência</label>
                  <select
                    value={selectedDetailOcc.status || 'Novo'}
                    onChange={(e) => updateStatus(selectedDetailOcc.id, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="Novo" className="bg-slate-900 text-white">Novo</option>
                    <option value="Aberto" className="bg-slate-900 text-white">Aberto</option>
                    <option value="Em Atendimento" className="bg-slate-900 text-white">Em Atendimento</option>
                    <option value="Resolvido" className="bg-slate-900 text-white">Resolvido</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Órgão Designado</label>
                  <select
                    value={selectedDetailOcc.assigned_to || ""}
                    onChange={(e) => updateOrgao(selectedDetailOcc.id, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Não Atribuído</option>
                    <option value="Defesa Civil" className="bg-slate-900 text-white">Defesa Civil</option>
                    <option value="Bombeiros" className="bg-slate-900 text-white">Bombeiros</option>
                    <option value="Obras" className="bg-slate-900 text-white">Obras</option>
                    <option value="Assistência Social" className="bg-slate-900 text-white">Assistência Social</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Footer do Modal */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
              <button
                onClick={() => setSelectedDetailOcc(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
