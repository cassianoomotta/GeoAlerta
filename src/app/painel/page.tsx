"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Leaflet precisa ser carregado dinamicamente para evitar erro de 'window is not defined' no SSR
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => <div className="glass-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Mapa Tático...</div>
});

export default function PainelPage() {
  const [occurrences, setOccurrences] = useState<any[]>([]);

  useEffect(() => {
    const fetchOccurrences = async () => {
      const { data, error } = await supabase
        .from('occurrences')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) {
        setOccurrences(data);
      }
    };

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Visão Geral - Santo Antônio da Patrulha (RS)</h1>
        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Acompanhe as ocorrências ativas na cidade em tempo real.</p>
      </div>

      <div className="glass-card" style={{ flex: 1, padding: '0.5rem', overflow: 'hidden' }}>
        <MapComponent occurrences={occurrences} />
      </div>
    </div>
  );
}
