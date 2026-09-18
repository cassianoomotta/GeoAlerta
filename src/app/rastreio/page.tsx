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
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('Wake Lock não disponível ou negado:', e);
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (e) {
      console.warn('Erro ao liberar Wake Lock:', e);
    }
  };

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

  // Limpa recursos ao desmontar
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  const sendPosition = async (latitude: number, longitude: number, accuracy: number) => {
    if (!team) return;
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
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsSharing(true);
    requestWakeLock();

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      sendPosition(latitude, longitude, accuracy);
    };

    // Disparo imediato da posição atual
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => {
        if (err.code === 1) {
          alert("Permissão de GPS negada. Por favor, autorize a localização no navegador.");
          stopSharing();
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Monitoramento contínuo via watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      (err) => {
        console.warn("Aviso de GPS:", err.message);
        if (err.code === 1) {
          alert("Permissão de GPS negada. O compartilhamento foi encerrado.");
          stopSharing();
        }
        // Se for timeout temporário ou perda momentânea de sinal, NÃO interrompe o compartilhamento
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Heartbeat periódico (a cada 15 segundos) para garantir transmissão ininterrupta
    intervalIdRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (err) => console.warn("Heartbeat GPS:", err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }, 15000);
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    releaseWakeLock();
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
        <div className="mt-8">
          {isSharing ? (
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Transmissão Contínua Ativa
              </div>
              {lastSent && (
                <p className="text-slate-400 text-xs font-medium">
                  Último sinal enviado às <strong className="text-emerald-400">{lastSent.toLocaleTimeString()}</strong>
                </p>
              )}
              <p className="text-slate-500 text-[11px] leading-relaxed max-w-[260px] mx-auto">
                A tela permanecerá ligada e a localização será transmitida ininterruptamente até você desativar.
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-xs font-medium max-w-[260px] mx-auto leading-relaxed">
              Mantenha esta tela aberta durante o turno. O envio de GPS permanecerá ativo continuamente até você desativar.
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
