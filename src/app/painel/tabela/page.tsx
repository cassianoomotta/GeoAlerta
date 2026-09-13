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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      
      {/* Topo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.15rem' }}>
            Tabela Operacional de Desastres
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Visão em lista e exportação de dados para relatórios gerenciais
          </p>
        </div>

        <button 
          onClick={exportToCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: '#ffffff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
        >
          <FileSpreadsheet size={16} /> Exportar CSV
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="glass-card" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap' }}>
        
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Buscar por tipo, relator, descrição..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#f8fafc' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1rem' }}>
          <Filter size={16} color="#64748b" />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#f8fafc', cursor: 'pointer' }}
          >
            <option value="TODOS">Qualquer Status</option>
            <option value="Novo">Novo</option>
            <option value="Em Atendimento">Em Atendimento</option>
            <option value="Resolvido">Resolvido</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select 
            value={orgaoFilter}
            onChange={e => setOrgaoFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#334155', background: '#f8fafc', cursor: 'pointer' }}
          >
            <option value="TODOS">Qualquer Órgão</option>
            <option value="Defesa Civil">Defesa Civil</option>
            <option value="Bombeiros">Bombeiros</option>
            <option value="Obras">Obras</option>
            <option value="Assistência Social">Assistência Social</option>
          </select>
        </div>

        <button 
          onClick={fetchOccurrences}
          title="Atualizar dados"
          style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', color: '#64748b' }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>

      </div>

      {/* Tabela */}
      <div className="glass-card" style={{ flex: 1, overflow: 'auto', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: 'var(--shadow-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>ID</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Data/Hora</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Tipo</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Relator</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0' }}>Órgão Atribuído</th>
            </tr>
          </thead>
          <tbody>
            {filteredOccurrences.length > 0 ? filteredOccurrences.map(occ => (
              <tr key={occ.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {occ.id.substring(0, 8)}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569' }}>
                  {new Date(occ.created_at).toLocaleString('pt-BR')}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                  {occ.type}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#334155' }}>
                  {occ.reporter_name || 'Anônimo'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, background: occ.status === 'Resolvido' ? '#dcfce7' : occ.status === 'Em Atendimento' ? '#fef08a' : '#f1f5f9', color: occ.status === 'Resolvido' ? '#166534' : occ.status === 'Em Atendimento' ? '#854d0e' : '#475569' }}>
                    {occ.status || 'Novo'}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                  {occ.assigned_to || '-'}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
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
