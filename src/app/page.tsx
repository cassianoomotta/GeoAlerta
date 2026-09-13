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

    setLoading(true);

    try {
      // 1. Get Location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
        });
      });

      const { latitude, longitude } = position.coords;

      // 2. Upload Photo (if any)
      let photo_url = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('occurrence_photos')
          .upload(filePath, file);

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
      <main className="mobile-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={36} color="#16a34a" />
          </div>
          <h2>Ocorrência Registrada!</h2>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Seu relato foi transmitido em tempo real para o <strong>Gabinete de Crise</strong> (Defesa Civil, Bombeiros, Obras e Assistência Social).
          </p>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => { setSuccess(false); setFile(null); setDescription(""); }}>
            Registrar Nova Ocorrência
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-slate-500 mb-4 text-sm font-medium">
            <Building2 size={16} />
            <span>Prefeitura de S. Antônio da Patrulha</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GeoAlerta</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Canal Oficial de Registro de Ocorrências Climáticas
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Seu Nome <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Nome completo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tipo de Ocorrência <span className="text-red-500">*</span>
              </label>
              <select 
                required
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900 bg-slate-50 appearance-none"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Detalhes (Opcional)</label>
              <textarea 
                placeholder="Pontos de referência, pessoas no local..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-slate-900 bg-slate-50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Evidência Fotográfica</label>
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
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {file ? file.name : "Anexar Foto"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <MapPin size={18} />
                {loading ? "Processando e obtendo GPS..." : "Enviar Ocorrência"}
              </button>
              <p className="text-center text-xs text-slate-500 mt-3">
                Será solicitado o acesso à sua localização para enviar o socorro exato.
              </p>
            </div>
          </div>
        </form>

        {/* Telefones de Emergência Minimalista */}
        <div className="mt-8 text-center">
          <p className="text-sm font-semibold text-slate-900 mb-4">Contatos de Emergência</p>
          <div className="grid grid-cols-2 gap-3">
            <a href="tel:199" className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-xs text-slate-500 font-medium">Defesa Civil</p>
              <p className="font-bold text-slate-900">199</p>
            </a>
            <a href="tel:193" className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-xs text-slate-500 font-medium">Bombeiros</p>
              <p className="font-bold text-slate-900">193</p>
            </a>
            <a href="tel:5136628400" className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-xs text-slate-500 font-medium">Sec. de Obras</p>
              <p className="font-bold text-slate-900">3662-8400</p>
            </a>
            <a href="tel:5136628480" className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
              <p className="text-xs text-slate-500 font-medium">Assist. Social</p>
              <p className="font-bold text-slate-900">3662-8480</p>
            </a>
          </div>
        </div>

      </div>
    </main>
  );
}
