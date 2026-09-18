"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, HeartHandshake, Truck, Users, PhoneCall, Stethoscope } from "lucide-react";
import { PageHeader, Card, Badge, StatCard, Field, inputCls, btnPrimary, btnGhost, EmptyState, Modal } from "@/modules/core/ui";
import { MUNICIPIO } from "@/modules/core/ui";

interface Volunteer {
  id: string; full_name: string; specialty: string; phone: string | null; email: string | null;
  vehicle: string | null; capacity: string | null; available: boolean; status: string; notes: string | null;
}

const SPECIALTIES = ["Jipeiro", "Saúde", "Logística", "Barco/Embarcação", "Cozinha", "Motorista", "Comunicação", "Bombeiro Civil", "Outros"];
const STATUSES = ["Ativo", "De prontidão", "Indisponível"];

export default function VoluntariosPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fullName, setFullName] = useState(""); const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [vehicle, setVehicle] = useState("");
  const [capacity, setCapacity] = useState(""); const [available, setAvailable] = useState(true); const [status, setStatus] = useState(STATUSES[0]); const [notes, setNotes] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("volunteers").select("*").eq("municipio", MUNICIPIO).order("full_name");
    if (data) setVolunteers(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const reset = () => { setFullName(""); setSpecialty(SPECIALTIES[0]); setPhone(""); setEmail(""); setVehicle(""); setCapacity(""); setAvailable(true); setStatus(STATUSES[0]); setNotes(""); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { municipio: MUNICIPIO, full_name: fullName.trim(), specialty, phone: phone.trim() || null, email: email.trim() || null, vehicle: vehicle.trim() || null, capacity: capacity.trim() || null, available, status, notes: notes.trim() || null };
    if (editingId) {
      const { error } = await supabase.from("volunteers").update(payload).eq("id", editingId);
      if (error) return alert("Erro ao salvar voluntário.");
    } else {
      const { error } = await supabase.from("volunteers").insert(payload);
      if (error) return alert("Erro ao cadastrar voluntário.");
    }
    setShowForm(false); setEditingId(null); reset(); fetchAll();
  };

  const openEdit = (v: Volunteer) => { setEditingId(v.id); setFullName(v.full_name); setSpecialty(v.specialty); setPhone(v.phone || ""); setEmail(v.email || ""); setVehicle(v.vehicle || ""); setCapacity(v.capacity || ""); setAvailable(v.available); setStatus(v.status); setNotes(v.notes || ""); setShowForm(true); };
  const del = async (id: string) => { if (!confirm("Excluir este voluntário?")) return; await supabase.from("volunteers").delete().eq("id", id); fetchAll(); };
  const toggleAvailable = async (v: Volunteer) => { await supabase.from("volunteers").update({ available: !v.available }).eq("id", v.id); fetchAll(); };

  const availableCount = volunteers.filter((v) => v.available && v.status === "Ativo").length;
  const jipeiros = volunteers.filter((v) => v.specialty === "Jipeiro").length;
  const saude = volunteers.filter((v) => v.specialty === "Saúde").length;
  const specialtyTone = (s: string) => (s === "Jipeiro" ? "amber" : s === "Saúde" ? "emerald" : s === "Barco/Embarcação" ? "blue" : "fuchsia");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Controle de Voluntários"
        subtitle="Jipeiros, equipes de saúde, embarcações e apoio logístico"
        action={<button onClick={() => { setEditingId(null); reset(); setShowForm(true); }} className={btnPrimary}><Plus size={16} /> Novo Voluntário</button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Voluntários ativos" value={availableCount} icon={<Users size={14} />} tone="green" />
        <StatCard label="Jipeiros" value={jipeiros} icon={<Truck size={14} />} tone="amber" />
        <StatCard label="Saúde" value={saude} icon={<Stethoscope size={14} />} tone="emerald" />
        <StatCard label="Cadastrados" value={volunteers.length} icon={<HeartHandshake size={14} />} tone="blue" />
      </div>

      {loading ? <EmptyState message="Carregando..." /> : volunteers.length === 0 ? (
        <EmptyState message="Nenhum voluntário cadastrado. Clique em 'Novo Voluntário'." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {volunteers.map((v) => (
            <Card key={v.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    {v.specialty === "Saúde" ? <Stethoscope size={20} /> : v.specialty === "Jipeiro" ? <Truck size={20} /> : <Users size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white truncate">{v.full_name}</h3>
                    <Badge tone={specialtyTone(v.specialty)}>{v.specialty}</Badge>
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailable(v)}
                  title={v.available ? "Marcar como indisponível" : "Marcar como disponível"}
                  className={`w-3 h-3 rounded-full shrink-0 mt-1 cursor-pointer ${v.available ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-slate-600"}`}
                />
              </div>

              <div className="flex flex-col gap-1.5 mt-3 text-xs text-slate-400 flex-1">
                {v.vehicle && <span className="flex items-center gap-1.5"><Truck size={12} /> {v.vehicle}{v.capacity ? ` (${v.capacity})` : ""}</span>}
                {v.notes && <span className="italic">{v.notes}</span>}
                <span className="text-[11px] text-slate-500">Status: <b className={v.status === "Ativo" ? "text-emerald-400" : v.status === "De prontidão" ? "text-amber-400" : "text-slate-500"}>{v.status}</b></span>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 gap-2">
                <div className="flex items-center gap-1.5">
                  {v.phone ? (
                    <a href={`tel:${v.phone}`} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer text-slate-300">
                      <PhoneCall size={12} /> Ligar
                    </a>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(v)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">✎</button>
                  <button onClick={() => del(v.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editingId ? "Editar Voluntário" : "Novo Voluntário"}>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nome completo" required><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome completo do voluntário" required /></Field>
            <Field label="Especialidade">
              <select className={inputCls} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>{SPECIALTIES.map((s) => <option key={s} className="bg-slate-900 text-white" value={s}>{s}</option>)}</select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(51) 99999-9999" /></Field>
              <Field label="E-mail"><input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Veículo"><input className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="ex: Jipe Toyota 4x4" /></Field>
              <Field label="Capacidade"><input className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="ex: 4 passageiros, reboque" /></Field>
            </div>
            <Field label="Status">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} className="bg-slate-900 text-white" value={s}>{s}</option>)}</select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="w-4 h-4 rounded accent-emerald-500" />
              Disponível para atuação imediata
            </label>
            <Field label="Observações"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Disponibilidade de horários, equipamentos próprios, etc." /></Field>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${btnPrimary} flex-1`}>{editingId ? "Salvar Alterações" : "Cadastrar Voluntário"}</button>
              <button type="button" onClick={() => setShowForm(false)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}