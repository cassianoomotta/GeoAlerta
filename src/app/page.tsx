"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, 
  MapPinOff,
  Camera, 
  ImageIcon,
  X,
  CheckCircle2, 
  Building2, 
  PhoneCall, 
  LocateFixed,
  RefreshCw,
  RotateCw,
  Loader2,
  Lock,
  AlertOctagon,
  ShieldAlert
} from "lucide-react";

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

type GeoStatusType = "idle" | "requesting" | "granted" | "denied" | "unavailable" | "timeout";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("Alagamento / Inundação");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Estados de Geolocalização
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatusType>("idle");
  const [geoErrorMessage, setGeoErrorMessage] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Helper com fallback robusto (Satélite -> Rede/Wi-Fi) compatível com Safari iOS e Chrome
  const fetchBrowserPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        return reject(new Error("Geolocalização não suportada neste navegador."));
      }

      // Tentativa 1: Alta precisão (GPS por satélite)
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => {
          // Se o usuário recusou explicitamente (código 1), não adianta tentar outro modo
          if (error.code === 1) {
            return reject(error);
          }

          // Se deu timeout (3) ou indisponível (2), tenta o modo balanceado (Wi-Fi / Antenas)
          // Esse fallback é crucial no Safari iOS quando o usuário está dentro de casa
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => resolve(fallbackPos),
            (fallbackErr) => reject(fallbackErr),
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000,
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 5000,
        }
      );
    });
  }, []);

  // Solicitar localização
  const requestLocation = useCallback(async (isSilentAutoCheck = false) => {
    if (!isSilentAutoCheck) {
      setIsLocating(true);
      setGeoStatus("requesting");
      setGeoErrorMessage(null);
    }

    try {
      const position = await fetchBrowserPosition();
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setGeoStatus("granted");
      setGeoErrorMessage(null);
    } catch (error: any) {
      console.warn("Erro ao obter geolocalização:", error);
      if (isSilentAutoCheck) {
        // No Safari iOS, chamadas automáticas no mount sem toque do usuário
        // frequentemente falham com PERMISSION_DENIED.
        // NÃO marcamos como 'denied' no silent check para não exibir a tela vermelha antes do usuário clicar!
        setGeoStatus("idle");
      } else {
        if (error?.code === 1) {
          setGeoStatus("denied");
          setGeoErrorMessage("Acesso à localização recusado pelo navegador ou pelo sistema operacional.");
        } else if (error?.code === 2) {
          setGeoStatus("unavailable");
          setGeoErrorMessage("Sinal de GPS indisponível no momento. Verifique se o GPS está ligado nas configurações do celular.");
        } else if (error?.code === 3) {
          setGeoStatus("timeout");
          setGeoErrorMessage("Tempo esgotado ao buscar sinal de satélite. Tente novamente.");
        } else {
          setGeoStatus("denied");
          setGeoErrorMessage("Não foi possível capturar a localização.");
        }
      }
    } finally {
      if (!isSilentAutoCheck) {
        setIsLocating(false);
      }
    }
  }, [fetchBrowserPosition]);

  // Checagem inicial ao carregar a página
  useEffect(() => {
    requestLocation(true);

    // Monitora alterações de permissão na Permissions API (se disponível)
    if (typeof window !== "undefined" && navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions
          .query({ name: "geolocation" as PermissionName })
          .then((permissionStatus) => {
            permissionStatus.onchange = () => {
              if (permissionStatus.state === "granted") {
                requestLocation(false);
              } else if (permissionStatus.state === "denied") {
                setGeoStatus("denied");
                setGeoErrorMessage("Acesso à localização foi desativado nas configurações do navegador.");
              } else {
                setGeoStatus("idle");
              }
            };
          })
          .catch(() => {
            // Safari / navegadores antigos podem ignorar query para geolocation
          });
      } catch {
        // Ignora erros no Safari
      }
    }
  }, [requestLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. REGRA ESTRITA: O sistema não funciona sem a localização habilitada
    let activeCoords = coords;
    if (geoStatus !== "granted" || !activeCoords) {
      setIsLocating(true);
      try {
        const position = await fetchBrowserPosition();
        activeCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCoords(activeCoords);
        setGeoStatus("granted");
      } catch (err) {
        console.error("Geolocalização não autorizada no submit:", err);
        setGeoStatus("denied");
        alert("SISTEMA BLOQUEADO: O GeoAlerta NÃO funciona sem o acesso à sua localização. Por favor, autorize o GPS no navegador para que possamos enviar as viaturas de socorro com exatidão.");
        setIsLocating(false);
        return;
      } finally {
        setIsLocating(false);
      }
    }

    if (!name.trim()) {
      alert("Por favor, preencha o seu nome antes de enviar.");
      return;
    }

    if (!type.trim()) {
      alert("Por favor, selecione o tipo de ocorrência.");
      return;
    }

    if (name.trim().length > 100) {
      alert("O nome informado é muito longo (máximo de 100 caracteres).");
      return;
    }

    if (description.length > 1000) {
      alert("A descrição informada ultrapassa o limite de 1000 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { latitude, longitude } = activeCoords!;

      // 2. Upload Photo com Sanitização Rigorosa
      let photo_url = null;
      if (file) {
        const ALLOWED_TYPES: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp'
        };

        if (!ALLOWED_TYPES[file.type]) {
          alert("Formato de arquivo não suportado. Envie apenas fotos nos formatos JPG, PNG ou WebP.");
          setLoading(false);
          return;
        }

        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          alert("A foto selecionada é muito grande. O limite máximo é de 5MB.");
          setLoading(false);
          return;
        }

        const safeExt = ALLOWED_TYPES[file.type];
        const fileName = `${crypto.randomUUID()}.${safeExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('occurrence_photos')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('occurrence_photos')
          .getPublicUrl(filePath);
          
        photo_url = data.publicUrl;
      }

      // 3. Insert into DB using PostGIS format for location
      const { error: dbError } = await supabase
        .from('occurrences')
        .insert([
          {
            type,
            description,
            reporter_name: name.trim(),
            photo_url,
            location: `POINT(${longitude} ${latitude})`
          }
        ]);

      if (dbError) throw dbError;

      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Ocorreu um erro ao enviar a ocorrência. Tente novamente ou verifique as permissões de GPS.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Ocorrência Registrada!</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Mantenha a calma. Sua localização exata já foi enviada em tempo real para as equipes de resgate do <strong>Gabinete de Crise</strong>.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2 text-sm">
              <Building2 size={16} /> Abrigo Mais Próximo Ativo
            </div>
            <p className="text-blue-900 font-bold">Ginásio Municipal de Esportes</p>
            <p className="text-blue-700 text-xs mt-1">Rua Cel. Antônio Inácio, Centro (Aprox. 2km)</p>
            <p className="text-blue-600 text-xs mt-2 font-medium">As equipes de Assistência Social já estão no local com mantimentos, água e cobertores.</p>
          </div>

          <div className="flex flex-col gap-3">
            <a href="tel:193" className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm border border-red-200">
              <PhoneCall size={16} /> Ligar Urgente 193
            </a>
            <button 
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-lg transition-colors text-sm cursor-pointer"
              onClick={() => { 
                setSuccess(false); 
                setFile(null); 
                setDescription(""); 
                requestLocation(false);
              }}
            >
              Registrar Outra Ocorrência
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-2 text-slate-500 mb-3 sm:mb-4 text-xs sm:text-sm font-medium">
            <Building2 size={16} />
            <span>Prefeitura de S. Antônio da Patrulha</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">GeoAlerta</h1>
          <p className="text-slate-500 mt-1 sm:mt-2 text-xs sm:text-sm">
            Canal Oficial de Registro de Ocorrências Climáticas
          </p>
        </div>

        {/* Aviso Institucional Enfático: O sistema não funciona sem localização */}
        <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl shadow-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={19} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Aviso Importante: Localização Obrigatória
              </p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                <strong>O sistema NÃO funciona se a localização não for habilitada.</strong> Sem as coordenadas de GPS, as viaturas de socorro não conseguem encontrar o local do chamado.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          
          {/* Card de Autorização de Localização (GPS) */}
          <div className="mb-5">
            {geoStatus === "granted" && coords ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 sm:p-4 text-emerald-950 transition-all shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 mt-0.5">
                      <LocateFixed size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-950">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        Localização Ativa e Autorizada
                      </div>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        GPS: <span className="font-mono font-semibold">{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
                      </p>
                      {coords.accuracy && (
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Precisão estimada: ±{Math.round(coords.accuracy)}m • <strong>Envio liberado</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLocating}
                    onClick={() => requestLocation(false)}
                    title="Recalcular localização GPS"
                    className="text-xs text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isLocating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    <span className="hidden sm:inline">{isLocating ? "Obtendo..." : "Atualizar"}</span>
                  </button>
                </div>
              </div>
            ) : geoStatus === "denied" ? (
              <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-4 text-rose-950 transition-all shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 rounded-xl text-rose-600 mt-0.5 flex-shrink-0">
                    <AlertOctagon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-rose-950 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock size={14} className="text-rose-600" />
                      Localização Não Autorizada
                    </p>
                    <p className="text-xs text-rose-900 mt-1 font-medium leading-relaxed">
                      O sistema <strong>NÃO FUNCIONA</strong> e não enviará ocorrências sem o GPS ativo. O resgate exige saber suas coordenadas exatas.
                    </p>

                    {/* Instruções detalhadas para Safari (iOS) e navegadores móveis */}
                    <div className="text-[11px] text-rose-900 mt-2.5 bg-rose-100 p-2.5 rounded-lg leading-relaxed border border-rose-200">
                      <p className="font-bold text-rose-950 mb-1">📱 No iPhone (Safari):</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Toque no menu <strong>&quot;aA&quot;</strong> ou <strong>&quot;...&quot;</strong> na barra de endereços &gt; <strong>Ajustes do Site</strong> &gt; mude <strong>Localização</strong> para <strong>Permitir</strong>.</li>
                        <li><strong>IMPORTANTE:</strong> Toque no botão <strong>Recarregar Página</strong> abaixo para o Safari aplicar a permissão.</li>
                        <li>Se continuar bloqueado, confira: <em>Ajustes do iPhone &gt; Privacidade e Segurança &gt; Serviços de Localização &gt; Safari</em>.</li>
                      </ol>
                    </div>

                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="flex-1 bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                      >
                        <RotateCw size={15} />
                        Recarregar Página para Ativar
                      </button>
                      <button
                        type="button"
                        disabled={isLocating}
                        onClick={() => requestLocation(false)}
                        className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isLocating ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={15} />
                            Tentar Novamente
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 text-amber-950 transition-all shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-700 mt-0.5 flex-shrink-0">
                    <Lock size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-amber-950 uppercase tracking-wide">
                      Localização Obrigatória (Envio Travado)
                    </p>
                    <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                      O sistema <strong>NÃO funciona</strong> sem a localização ativa. Toque no botão abaixo para habilitar o GPS e liberar o formulário.
                    </p>
                    <button
                      type="button"
                      disabled={isLocating}
                      onClick={() => requestLocation(false)}
                      className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
                    >
                      {isLocating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Buscando sinal de GPS...
                        </>
                      ) : (
                        <>
                          <LocateFixed size={16} />
                          Habilitar Localização para Liberar o Sistema
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Seu Nome <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Nome completo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900 bg-slate-50 text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Tipo de Ocorrência <span className="text-red-500">*</span>
              </label>
              <select 
                required
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900 bg-slate-50 appearance-none text-base sm:text-sm"
              >
                <option value="Alagamento / Inundação">Alagamento / Inundação</option>
                <option value="Deslizamento de Terra">Deslizamento de Terra / Encosta</option>
                <option value="Desabrigados / Acolhimento e Abrigo">Desabrigados / Acolhimento</option>
                <option value="Queda de Árvore">Queda de Árvore</option>
                <option value="Fio Partido / Choque Elétrico">Risco Elétrico / Fio Partido</option>
                <option value="Bueiro / Via Pública Obstruída">Via Pública Obstruída</option>
                <option value="Alimentos / Água / Resgate Humanitário">Ajuda Humanitária</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Detalhes (Opcional)</label>
              <textarea 
                placeholder="Pontos de referência, pessoas no local..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900 bg-slate-50 resize-none text-base sm:text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs sm:text-sm font-medium text-slate-700">
                  Evidência Fotográfica (Opcional)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">Câmera ou Galeria</span>
              </div>

              {file ? (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-slate-200 overflow-hidden relative flex-shrink-0 border border-slate-300">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Pré-visualização da foto" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Foto selecionada
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    title="Remover foto"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-4 py-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600 flex items-center justify-center gap-2.5 hover:bg-slate-100 hover:border-slate-400 transition-all cursor-pointer group">
                    <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-slate-800 transition-colors">
                      <Camera size={18} />
                      <span className="text-slate-300">/</span>
                      <ImageIcon size={18} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      Tirar Foto ou Escolher da Galeria
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading || geoStatus !== "granted" || isLocating}
                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm sm:text-base shadow-sm ${
                  geoStatus === "granted"
                    ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                    : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enviando ocorrência...
                  </>
                ) : isLocating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Obtendo localização...
                  </>
                ) : geoStatus === "granted" ? (
                  <>
                    <MapPin size={18} />
                    Enviar Ocorrência (GPS Liberado)
                  </>
                ) : (
                  <>
                    <Lock size={18} />
                    Envio Bloqueado — Habilite a Localização
                  </>
                )}
              </button>

              {geoStatus !== "granted" ? (
                <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                  <p className="text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5">
                    <AlertOctagon size={14} />
                    O sistema NÃO funciona sem a localização autorizada.
                  </p>
                  <p className="text-[11px] text-rose-600 mt-0.5">
                    Autorize o GPS no card acima para desbloquear o envio do formulário.
                  </p>
                </div>
              ) : (
                <p className="text-center text-[11px] sm:text-xs text-emerald-700 mt-2.5 font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} />
                  GPS confirmado. Seu chamado será enviado com precisão ao Gabinete de Crise.
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Telefones de Emergência */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">Contatos de Emergência</p>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <a href="tel:199" className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Defesa Civil</p>
              <p className="font-bold text-slate-900 text-sm sm:text-base">199</p>
            </a>
            <a href="tel:193" className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Bombeiros</p>
              <p className="font-bold text-slate-900 text-sm sm:text-base">193</p>
            </a>
            <a href="tel:5136628400" className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Sec. de Obras</p>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">3662-8400</p>
            </a>
            <a href="tel:5136628480" className="p-2.5 sm:p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Assist. Social</p>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">3662-8480</p>
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
