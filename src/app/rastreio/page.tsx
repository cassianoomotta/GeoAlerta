"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Radio, Satellite, AlertTriangle, ShieldAlert, Navigation } from "lucide-react";

function TrackerContent() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get("equipe");

  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isSharing, setIsSharing] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadTeam() {
      if (!teamId) {
        setError("Link inválido. Nenhum ID de equipe fornecido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (error || !data) {
        setError("Equipe não encontrada. Verifique o link.");
      } else {
        setTeam(data);
      }
      setLoading(false);
    }
    loadTeam();
  }, [teamId]);

  // Limpa o watchPosition se o componente for desmontado
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsSharing(true);

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        // Envia para o supabase
        const { error } = await supabase.from("team_locations").insert([
          {
            team_id: team.id,
            team_name: team.name,
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
            sent_at: new Date().toISOString(),
          },
        ]);

        if (!error) {
          setLastSent(new Date());
        }
      },
      (err) => {
        console.error(err);
        if (err.code === 1) {
          alert("Permissão de localização negada. Por favor, autorize no navegador.");
        } else {
          alert("Erro ao obter localização: " + err.message);
        }
        stopSharing();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Satellite size={48} className="text-blue-500" />
          <p className="text-slate-400 font-medium">Carregando dados da equipe...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Acesso Negado</h1>
        <p className="text-slate-400 text-sm max-w-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {isSharing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] border-[1px] border-emerald-500/10 rounded-full animate-[ping_3s_ease-out_infinite] pointer-events-none"></div>
      )}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Identificação da Equipe */}
        <div className="mb-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-center mb-4">
            <ShieldAlert size={32} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">{team.name}</h1>
          <p className="text-slate-400 font-medium">{team.organ} • {team.type}</p>
        </div>

        {/* Botão de Ação Gigante */}
        <button
          onClick={isSharing ? stopSharing : startSharing}
          className={`relative group w-64 h-64 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-300 shadow-2xl ${
            isSharing 
              ? "bg-emerald-500 border-[8px] border-emerald-400/30 text-white shadow-[0_0_50px_rgba(16,185,129,0.5)]" 
              : "bg-blue-600 border-[8px] border-blue-500/30 text-white hover:bg-blue-500 shadow-[0_0_50px_rgba(37,130,246,0.4)]"
          }`}
        >
          {isSharing ? (
            <>
              <Radio size={48} className="animate-pulse" />
              <div className="flex flex-col items-center">
                <span className="font-bold text-xl uppercase tracking-wider">Transmitindo</span>
                <span className="text-emerald-100 text-xs mt-1 font-medium bg-emerald-700/30 px-3 py-1 rounded-full">Toque para parar</span>
              </div>
            </>
          ) : (
            <>
              <Navigation size={48} className="mb-1" />
              <div className="flex flex-col items-center">
                <span className="font-extrabold text-xl uppercase tracking-wider">Iniciar GPS</span>
                <span className="text-blue-200 text-xs mt-1 font-medium max-w-[140px] leading-tight">Começar a compartilhar localização</span>
              </div>
            </>
          )}
        </button>

        {/* Status Text */}
        <div className="mt-12 h-10">
          {isSharing && lastSent && (
            <p className="text-slate-400 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
              Último sinal enviado às <strong className="text-emerald-400">{lastSent.toLocaleTimeString()}</strong>
            </p>
          )}
          {!isSharing && (
            <p className="text-slate-500 text-xs font-medium max-w-[250px] mx-auto leading-relaxed">
              Deixe esta tela aberta enquanto estiver em missão. A tela não irá desligar enquanto transmitir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Iniciando...</div>}>
      <TrackerContent />
    </Suspense>
  );
}
