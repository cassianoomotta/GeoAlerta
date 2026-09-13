"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  MapPin, 
  Camera, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  ShieldAlert, 
  Flame, 
  HardHat, 
  HeartHandshake, 
  PhoneCall 
} from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("Alagamento / Inundação");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // 1. Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });

      const { latitude, longitude } = position.coords;

      // 2. Upload Photo com Sanitizacao Rigorosa
      let photo_url = null;
      if (file) {
        // Validacao estrita de tipo MIME
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

        // Limite de 5MB para protecao de armazenamento
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          alert("A foto selecionada é muito grande. O limite máximo é de 5MB.");
          setLoading(false);
          return;
        }

        // Geracao de nome canônico seguro com UUID v4 (sem concatenar input do usuario)
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
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-lg transition-colors text-sm"
              onClick={() => { setSuccess(false); setFile(null); setDescription(""); }}
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
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 text-slate-500 mb-3 sm:mb-4 text-xs sm:text-sm font-medium">
            <Building2 size={16} />
            <span>Prefeitura de S. Antônio da Patrulha</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">GeoAlerta</h1>
          <p className="text-slate-500 mt-1 sm:mt-2 text-xs sm:text-sm">
            Canal Oficial de Registro de Ocorrências Climáticas
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          
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
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Evidência Fotográfica</label>
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full px-4 py-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                  <Camera size={18} />
                  <span className="text-xs sm:text-sm font-medium truncate max-w-[200px]">
                    {file ? file.name : "Anexar Foto"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer shadow-sm"
              >
                <MapPin size={18} />
                {loading ? "Processando e obtendo GPS..." : "Enviar Ocorrência"}
              </button>
              <p className="text-center text-[11px] sm:text-xs text-slate-500 mt-2.5">
                Será solicitado o acesso à sua localização para enviar o socorro exato.
              </p>
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
