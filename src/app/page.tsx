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
    <main className="mobile-container" style={{ paddingBottom: '3.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        
        {/* Selo Institucional do Município */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.45rem 1rem',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '2rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#1d4ed8',
          marginBottom: '1.25rem',
          letterSpacing: '0.02em'
        }}>
          <Building2 size={15} /> Prefeitura de Santo Antônio da Patrulha
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <AlertTriangle size={36} color="#dc2626" />
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>GeoAlerta</h1>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.25rem', fontWeight: 500 }}>
          Canal Oficial de Emergências e Alertas Climáticos
        </p>

        {/* 4 Órgãos Integrados com Mesmo Peso */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem',
          marginTop: '1.25rem'
        }}>
          <a href="tel:199" style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem', borderRadius: '0.625rem', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#92400e', textDecoration: 'none', fontWeight: 600 }}>
            <ShieldAlert size={14} color="#d97706" /> Defesa Civil (199)
          </a>
          <a href="tel:193" style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem', borderRadius: '0.625rem', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#991b1b', textDecoration: 'none', fontWeight: 600 }}>
            <Flame size={14} color="#dc2626" /> Bombeiros (193)
          </a>
          <a href="tel:5136628400" style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem', borderRadius: '0.625rem', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e40af', textDecoration: 'none', fontWeight: 600 }}>
            <HardHat size={14} color="#2563eb" /> Obras (3662-8400)
          </a>
          <a href="tel:5136628480" style={{ fontSize: '0.75rem', padding: '0.45rem 0.6rem', borderRadius: '0.625rem', background: '#fdf4ff', border: '1px solid #f5d0fe', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#86198f', textDecoration: 'none', fontWeight: 600 }}>
            <HeartHandshake size={14} color="#a21caf" /> Assist. Social (3662-8480)
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem 1.75rem' }}>
        
        <div className="form-group">
          <label className="form-label">
            Seu Nome <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Digite seu nome completo"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Tipo de Ocorrência <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select 
            className="form-select" 
            required
            value={type} 
            onChange={(e) => setType(e.target.value)}
          >
            <option value="Alagamento / Inundação">🌊 Alagamento / Inundação</option>
            <option value="Deslizamento de Terra">⛰️ Deslizamento de Terra / Encosta</option>
            <option value="Desabrigados / Acolhimento e Abrigo">🏠 Desabrigados / Acolhimento e Abrigo (Social)</option>
            <option value="Queda de Árvore">🌳 Queda de Árvore</option>
            <option value="Fio Partido / Choque Elétrico">⚡ Fio Partido / Risco Elétrico</option>
            <option value="Bueiro / Via Pública Obstruída">🚧 Bueiro / Via Pública Obstruída (Obras)</option>
            <option value="Alimentos / Água / Resgate Humanitário">📦 Alimentos / Água / Ajuda Humanitária</option>
            <option value="Outros">⚠️ Outros</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Descrição da Situação (Opcional)</label>
          <textarea 
            className="form-textarea" 
            placeholder="Descreva pontos de referência, número de pessoas ou detalhes da situação..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Foto do Local (Opcional)</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="file" 
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{
                opacity: 0,
                position: 'absolute',
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', borderColor: '#cbd5e1', color: '#475569' }}>
              <Camera size={18} color="#64748b" />
              {file ? file.name : "Tirar Foto ou Escolher da Galeria"}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-danger" 
          style={{ width: '100%', marginTop: '0.75rem', padding: '1rem', fontSize: '1.05rem', fontWeight: 700 }}
          disabled={loading}
        >
          <MapPin size={22} />
          {loading ? "Enviando e capturando GPS..." : "REPORTAR EMERGÊNCIA"}
        </button>
        <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.85rem', color: '#64748b' }}>
          O navegador solicitará acesso à sua localização (GPS). Aceite para direcionar o socorro exato.
        </p>

      </form>

      {/* Contatos Emergenciais e Plantões Oficiais */}
      <div style={{ marginTop: '1.75rem', padding: '1.25rem', background: '#ffffff', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#dc2626', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.85rem' }}>
          <PhoneCall size={18} /> Telefones Úteis e Emergências
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a href="tel:193" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#fef2f2', borderRadius: '0.625rem', textDecoration: 'none', color: '#0f172a', border: '1px solid #fee2e2' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
              <Flame size={15} color="#dc2626" /> Bombeiros Militar (Resgate)
            </span>
            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.9rem' }}>193</span>
          </a>

          <a href="tel:199" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#fffbeb', borderRadius: '0.625rem', textDecoration: 'none', color: '#0f172a', border: '1px solid #fef3c7' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
              <ShieldAlert size={15} color="#d97706" /> Defesa Civil Municipal
            </span>
            <span style={{ color: '#d97706', fontWeight: 700, fontSize: '0.88rem' }}>199 / (51) 99767-4224</span>
          </a>

          <a href="tel:5136628400" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#eff6ff', borderRadius: '0.625rem', textDecoration: 'none', color: '#0f172a', border: '1px solid #dbeafe' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
              <HardHat size={15} color="#2563eb" /> Obras e Infraestrutura
            </span>
            <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.88rem' }}>(51) 3662-8400</span>
          </a>

          <a href="tel:5136628480" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#fdf4ff', borderRadius: '0.625rem', textDecoration: 'none', color: '#0f172a', border: '1px solid #fae8ff' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600 }}>
              <HeartHandshake size={15} color="#a21caf" /> Assist. Social (Abrigos/Apoio)
            </span>
            <span style={{ color: '#a21caf', fontWeight: 700, fontSize: '0.88rem' }}>(51) 3662-8480</span>
          </a>
        </div>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5 }}>
        Gabinete de Gestão Integrada de Crises e Desastres Climáticos<br />
        Prefeitura Municipal de Santo Antônio da Patrulha - RS
      </footer>
    </main>
  );
}
