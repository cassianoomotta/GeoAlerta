"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Flame, HardHat, HeartHandshake, Layers, AlertCircle, Clock, RefreshCw } from "lucide-react";

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
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

        {/* Filtros Rápidos por Órgão */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', padding: '0.35rem 0.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
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

      {/* Container do Mapa Tático */}
      <div className="glass-card" style={{ flex: 1, padding: '0.35rem', overflow: 'hidden', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', boxShadow: 'var(--shadow-md)' }}>
        <MapComponent occurrences={filteredOccurrences} />
      </div>
    </div>
  );
}
