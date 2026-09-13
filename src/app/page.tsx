"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Camera, AlertTriangle, CheckCircle2, Building2, ShieldAlert, Flame, HardHat, PhoneCall } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("Alagamento");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            reporter_name: name || "Anônimo",
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
        <div className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <CheckCircle2 size={64} color="var(--primary)" />
          <h2>Ocorrência Registrada!</h2>
          <p style={{ opacity: 0.85, fontSize: '0.95rem' }}>
            Seu relato foi transmitido em tempo real para a <strong>Defesa Civil</strong>, <strong>Corpo de Bombeiros</strong> e equipes de plantão.
          </p>
          <button className="btn btn-primary" onClick={() => { setSuccess(false); setFile(null); setDescription(""); }}>
            Registrar Nova Ocorrência
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mobile-container" style={{ paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        
        {/* Selo Oficial do Município */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.4rem 0.9rem',
          background: 'rgba(37, 99, 235, 0.12)',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          borderRadius: '2rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--primary)',
          marginBottom: '1.25rem',
          letterSpacing: '0.03em'
        }}>
          <Building2 size={15} /> Prefeitura Municipal de Santo Antônio da Patrulha
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <AlertTriangle size={36} color="var(--danger)" />
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>GeoAlerta</h1>
        </div>

        <p style={{ opacity: 0.85, fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Canal Oficial de Emergências e Alertas Climáticos
        </p>

        {/* Órgãos Integrados */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.4rem',
          marginTop: '0.85rem'
        }}>
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <ShieldAlert size={12} color="#f59e0b" /> Defesa Civil
          </span>
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <Flame size={12} color="#ef4444" /> Bombeiros Militar (193)
          </span>
          <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--card-border)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            <HardHat size={12} color="#3b82f6" /> Obras e Infraestrutura
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2rem' }}>
        
        <div className="form-group">
          <label className="form-label">Seu Nome (Opcional)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Como podemos te chamar?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo de Ocorrência</label>
          <select 
            className="form-select" 
            value={type} 
            onChange={(e) => setType(e.target.value)}
          >
            <option value="Alagamento">Alagamento / Inundação</option>
            <option value="Deslizamento">Deslizamento de Terra</option>
            <option value="Queda de Árvore">Queda de Árvore</option>
            <option value="Fio Partido">Fio Partido / Choque</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Descrição (Opcional)</label>
          <textarea 
            className="form-textarea" 
            placeholder="Detalhes adicionais..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Anexar Foto (Opcional)</label>
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
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.1)' }}>
              <Camera size={20} />
              {file ? file.name : "Tirar Foto ou Escolher"}
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-danger" 
          style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }}
          disabled={loading}
        >
          <MapPin size={24} />
          {loading ? "Enviando e capturando GPS..." : "REPORTAR EMERGÊNCIA"}
        </button>
        <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '1rem', opacity: 0.6 }}>
          O sistema pedirá acesso ao seu GPS. Aceite para que as equipes saibam exatamente onde você está.
        </p>

      </form>

      {/* Contatos Emergenciais */}
      <div style={{ marginTop: '1.75rem', textAlign: 'center', padding: '1.25rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
          <PhoneCall size={18} /> Risco Iminente à Vida?
        </div>
        <p style={{ fontSize: '0.8rem', opacity: 0.85 }}>
          Ligue imediatamente: <strong>193</strong> (Bombeiros Militar) ou <strong>199</strong> (Defesa Civil).
        </p>
      </div>

      <footer style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.72rem', opacity: 0.55, lineHeight: 1.5 }}>
        Plataforma Oficial de Gestão de Riscos e Desastres Climáticos<br />
        Prefeitura Municipal de Santo Antônio da Patrulha - RS
      </footer>
    </main>
  );
}
