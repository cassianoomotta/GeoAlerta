"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Download, Search, Filter, RefreshCw, FileSpreadsheet } from "lucide-react";

export default function TabelaPage() {
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [orgaoFilter, setOrgaoFilter] = useState("TODOS");

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
      // Filtro de Texto
      const textMatch = 
        (o.type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.reporter_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro de Status
      const statusMatch = statusFilter === "TODOS" || o.status === statusFilter;
      
      // Filtro de Órgão
      const orgaoMatch = orgaoFilter === "TODOS" || o.assigned_to === orgaoFilter;

      return textMatch && statusMatch && orgaoMatch;
    });
  }, [occurrences, searchTerm, statusFilter, orgaoFilter]);

  const exportToCSV = () => {
    if (filteredOccurrences.length === 0) return;
    
    // Header
    const headers = ["ID", "Tipo", "Data", "Relator", "Status", "Órgão Atribuído", "Descrição"];
    
    const rows = filteredOccurrences.map(o => {
      return [
        o.id,
        `"${o.type || ""}"`,
        `"${new Date(o.created_at).toLocaleString('pt-BR')}"`,
        `"${o.reporter_name || "Anônimo"}"`,
        `"${o.status || "Novo"}"`,
        `"${o.assigned_to || "Nenhum"}"`,
        `"${(o.description || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `geoalerta_ocorrencias_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Topo */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
            Tabela Operacional de Desastres
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Visão em lista e exportação de dados para relatórios gerenciais
          </p>
        </div>

        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(5,150,105,0.4)] border border-emerald-500/50"
        >
          <FileSpreadsheet size={16} /> Exportar CSV
        </button>
      </div>

      {/* Barra de Filtros (Glassmorphism) */}
      <div className="glass-card flex flex-wrap gap-4 p-4 items-center relative z-20">
        
        <div className="flex-1 min-w-[250px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por tipo, relator, descrição..." 
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
          title="Atualizar dados"
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          <RefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
        </button>

      </div>

      {/* Tabela (Bento Box) */}
      <div className="glass-card flex-1 overflow-auto relative z-10 custom-scrollbar">
        <table className="w-full text-left min-w-[800px] border-collapse">
          <thead className="bg-white/[0.02] sticky top-0 z-20 backdrop-blur-md">
            <tr>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/10">ID</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/10">Data/Hora</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/10">Tipo</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/10">Relator</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/10">Status</th>
              <th className="p-4 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-white/10">Órgão Atribuído</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOccurrences.length > 0 ? filteredOccurrences.map(occ => (
              <tr key={occ.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4 text-xs text-slate-500 font-mono">
                  {occ.id.substring(0, 8)}
                </td>
                <td className="p-4 text-xs text-slate-400 font-medium">
                  {new Date(occ.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="p-4 text-sm text-white font-semibold">
                  {occ.type}
                </td>
                <td className="p-4 text-xs text-slate-300">
                  {occ.reporter_name || 'Anônimo'}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${occ.status === 'Resolvido' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : occ.status === 'Em Atendimento' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : occ.status === 'Aberto' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                    {occ.status || 'Novo'}
                  </span>
                </td>
                <td className="p-4 text-xs font-semibold">
                  <span className={`${occ.assigned_to === 'Defesa Civil' ? 'text-amber-400' : occ.assigned_to === 'Bombeiros' ? 'text-red-400' : occ.assigned_to === 'Obras' ? 'text-blue-400' : occ.assigned_to === 'Assistência Social' ? 'text-fuchsia-400' : 'text-slate-500'}`}>
                    {occ.assigned_to || '-'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500 text-sm font-medium">
                  Nenhuma ocorrência encontrada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
