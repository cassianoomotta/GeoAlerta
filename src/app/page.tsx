"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Camera, AlertTriangle, CheckCircle2 } from "lucide-react";

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
      <main className="mobile-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <CheckCircle2 size={64} color="var(--primary)" />
          <h2>Ocorrência Registrada!</h2>
          <p>Sua ocorrência foi enviada à Defesa Civil com sua localização exata.</p>
          <button className="btn btn-primary" onClick={() => { setSuccess(false); setFile(null); setDescription(""); }}>
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mobile-container">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h1>GeoAlerta</h1>
        <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>Reporte uma ocorrência com sua localização exata em apenas um clique.</p>
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
          O sistema pedirá acesso ao seu GPS. Aceite para que a equipe saiba exatamente onde você está.
        </p>

      </form>
    </main>
  );
}
