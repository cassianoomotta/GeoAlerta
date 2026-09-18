"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, Users, PawPrint, Trash2, ChevronDown, UserPlus } from "lucide-react";
import { PageHeader, Card, Badge, StatCard, Field, inputCls, btnPrimary, btnGhost, EmptyState, Modal } from "@/modules/core/ui";
import { MUNICIPIO } from "@/modules/core/ui";

interface Shelter {
  id: string; name: string; type: string; address: string | null;
  lat: number | null; lng: number | null; capacity: number; occupied: number;
  phone: string | null; manager: string | null; status: string; notes: string | null;
}
interface Person {
  id: string; full_name: string; cpf: string | null; age: number | null;
  phone: string | null; has_pet: boolean; pet_details: string | null; notes: string | null;
}

const TYPES = ["humano", "pet", "misto"];
const STATUSES = ["Aberto", "Lotado", "Encerrado"];

export default function AbrigosPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [editingShelter, setEditingShelter] = useState<Shelter | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [people, setPeople] = useState<Record<string, Person[]>>({});
  const [showPersonForm, setShowPersonForm] = useState<string | null>(null);

  // shelter form
  const [name, setName] = useState(""); const [type, setType] = useState("humano");
  const [address, setAddress] = useState(""); const [capacity, setCapacity] = useState("0");
  const [phone, setPhone] = useState(""); const [manager, setManager] = useState("");
  const [status, setStatus] = useState(STATUSES[0]); const [notes, setNotes] = useState("");

  // person form
  const [pName, setPName] = useState(""); const [pCpf, setPCpf] = useState(""); const [pAge, setPAge] = useState("");
  const [pPhone, setPPhone] = useState(""); const [pHasPet, setPHasPet] = useState(false); const [pPets, setPPets] = useState(""); const [pNotes, setPNotes] = useState("");

  const fetchShelters = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("shelters").select("*").eq("municipio", MUNICIPIO).order("name");
    if (data) setShelters(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchShelters(); }, [fetchShelters]);

  const fetchPeople = async (shelterId: string) => {
    const { data } = await supabase.from("shelter_people").select("*").eq("shelter_id", shelterId).order("created_at", { ascending: false });
    setPeople((p) => ({ ...p, [shelterId]: data || [] }));
  };

  useEffect(() => {
    if (openId) fetchPeople(openId);
  }, [openId]);

  const toggleOpen = (id: string) => {
    setOpenId((cur) => (cur === id ? null : id));
    if (openId !== id) fetchPeople(id);
  };

  const submitShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { municipio: MUNICIPIO, name: name.trim(), type, address: address.trim() || null, capacity: Number(capacity) || 0, phone: phone.trim() || null, manager: manager.trim() || null, status, notes: notes.trim() || null };
    if (editingShelter) {
      const { error } = await supabase.from("shelters").update(payload).eq("id", editingShelter.id);
      if (error) return alert("Erro ao salvar abrigo.");
    } else {
      const { error } = await supabase.from("shelters").insert(payload);
      if (error) return alert("Erro ao criar abrigo.");
    }
    setShowShelterForm(false); setEditingShelter(null); resetShelter(); fetchShelters();
  };

  const resetShelter = () => { setName(""); setType("humano"); setAddress(""); setCapacity("0"); setPhone(""); setManager(""); setStatus(STATUSES[0]); setNotes(""); };
  const resetPerson = () => { setPName(""); setPCpf(""); setPAge(""); setPPhone(""); setPHasPet(false); setPPets(""); setPNotes(""); };

  const openEditShelter = (s: Shelter) => { setEditingShelter(s); setName(s.name); setType(s.type); setAddress(s.address || ""); setCapacity(String(s.capacity)); setPhone(s.phone || ""); setManager(s.manager || ""); setStatus(s.status); setNotes(s.notes || ""); setShowShelterForm(true); };

  const delShelter = async (id: string) => {
    if (!confirm("Excluir este abrigo e seus cadastros?")) return;
    await supabase.from("shelters").delete().eq("id", id);
    fetchShelters();
  };

  const submitPerson = async (e: React.FormEvent, shelterId: string) => {
    e.preventDefault();
    const { error } = await supabase.from("shelter_people").insert({
      shelter_id: shelterId, full_name: pName.trim(), cpf: pCpf.trim() || null,
      age: pAge ? Number(pAge) : null, phone: pPhone.trim() || null,
      has_pet: pHasPet, pet_details: (pHasPet && pPets.trim()) ? pPets.trim() : null, notes: pNotes.trim() || null,
    });
    // atualiza ocupação
    const current = people[shelterId]?.length || 0;
    await supabase.from("shelters").update({ occupied: current + 1 }).eq("id", shelterId);
    if (error) return alert("Erro ao cadastrar pessoa.");
    setShowPersonForm(null); resetPerson(); fetchPeople(shelterId); fetchShelters();
  };

  const delPerson = async (personId: string, shelterId: string) => {
    await supabase.from("shelter_people").delete().eq("id", personId);
    const current = people[shelterId]?.length || 0;
    await supabase.from("shelters").update({ occupied: Math.max(0, current - 1) }).eq("id", shelterId);
    fetchPeople(shelterId); fetchShelters();
  };

  const totalPeople = Object.values(people).reduce((a, arr) => a + arr.length, 0);
  const capacityTotal = shelters.reduce((a, s) => a + s.capacity, 0);
  const origenTone = (t: string) => (t === "pet" ? "fuchsia" : t === "misto" ? "amber" : "blue");
  const typeLabel = (t: string) => (t === "pet" ? "Pet" : t === "misto" ? "Humano + Pet" : "Humano");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Abrigos"
        subtitle="Abrigos humanos, pet e mistos — com cadastro de pessoas e pets"
        action={<button onClick={() => { setEditingShelter(null); resetShelter(); setShowShelterForm(true); }} className={btnPrimary}><Plus size={16} /> Novo Abrigo</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Abrigos" value={shelters.length} icon={<Building2 size={14} />} tone="blue" />
        <StatCard label="Capacidade total" value={capacityTotal} icon={<Users size={14} />} tone="green" />
        <StatCard label="Cidadãos abrigados" value={totalPeople} icon={<Users size={14} />} tone="amber" />
      </div>

      {loading ? <EmptyState message="Carregando..." /> : shelters.length === 0 ? (
        <EmptyState message="Nenhum abrigo cadastrado. Clique em 'Novo Abrigo'." />
      ) : (
        <div className="flex flex-col gap-3">
          {shelters.map((s) => (
            <Card key={s.id} className="!p-0 overflow-hidden">
              <button onClick={() => toggleOpen(s.id)} className="w-full p-4 flex items-center justify-between gap-3 cursor-pointer text-left hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.type === "pet" ? "bg-fuchsia-500/10 text-fuchsia-400" : "bg-blue-500/10 text-blue-400"}`}>
                    {s.type === "pet" ? <PawPrint size={20} /> : <Users size={20} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white">{s.name}</h3>
                      <Badge tone={origenTone(s.type)}>{typeLabel(s.type)}</Badge>
                      <Badge tone={s.status === "Aberto" ? "green" : s.status === "Lotado" ? "amber" : "slate"}>{s.status}</Badge>
                    </div>
                    {s.address && <p className="text-xs text-slate-500">{s.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:block">Ocupação</span>
                  <div className="w-28 bg-white/10 rounded-lg h-1.5 overflow-hidden">
                    <div className={`h-full ${s.capacity > 0 && s.occupied / s.capacity >= 0.85 ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${s.capacity > 0 ? Math.min(100, (s.occupied / s.capacity) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white w-24 text-right">{s.occupied}/{s.capacity}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEditShelter(s); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">✎</button>
                    <button onClick={(e) => { e.stopPropagation(); delShelter(s.id); }} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={14} /></button>
                    <ChevronDown size={18} className={`text-slate-500 transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </button>

              {openId === s.id && (
                <div className="border-t border-white/10 p-4">
                  {(s.notes || s.manager || s.phone) && (
                    <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-400">
                      {s.manager && <Badge tone="slate">Gestor: {s.manager}</Badge>}
                      {s.phone && <Badge tone="slate">Tel: {s.phone}</Badge>}
                      {s.notes && <span className="italic">{s.notes}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users size={13} /> Pessoas abrigadas ({people[s.id]?.length || 0})
                    </span>
                    <button onClick={() => { setShowPersonForm(s.id); resetPerson(); }} className={btnGhost}><UserPlus size={14} /> Cadastrar pessoa</button>
                  </div>

                  {(people[s.id] || []).length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Nenhuma pessoa cadastrada neste abrigo.</p>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left min-w-[560px] border-collapse">
                        <thead className="bg-white/[0.03]">
                          <tr>
                            {["Nome", "CPF", "Idade", "Contato", "Pet", ""].map((h) => (
                              <th key={h} className="p-2 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(people[s.id] || []).map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.02]">
                              <td className="p-2 text-sm font-semibold text-white">{p.full_name}</td>
                              <td className="p-2 text-xs text-slate-400 font-mono">{p.cpf || "—"}</td>
                              <td className="p-2 text-xs text-slate-400">{p.age ?? "—"}</td>
                              <td className="p-2 text-xs text-slate-400">{p.phone || "—"}</td>
                              <td className="p-2 text-xs">
                                {p.has_pet ? <Badge tone="fuchsia"><PawPrint size={11} /> {p.pet_details || "com pet"}</Badge> : <span className="text-slate-600">—</span>}
                              </td>
                              <td className="p-2 text-right">
                                <button onClick={() => delPerson(p.id, s.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 cursor-pointer"><Trash2 size={13} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showShelterForm && (
        <Modal onClose={() => setShowShelterForm(false)} title={editingShelter ? "Editar Abrigo" : "Novo Abrigo"}>
          <form onSubmit={submitShelter} className="space-y-4">
            <Field label="Nome do abrigo" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Ginásio Municipal" required /></Field>
            <Field label="Tipo de abrigo">
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="humano" className="bg-slate-900 text-white">Humano</option>
                <option value="pet" className="bg-slate-900 text-white">Pet (animais)</option>
                <option value="misto" className="bg-slate-900 text-white">Misto (humano + pet)</option>
              </select>
            </Field>
            <Field label="Endereço"><input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacidade" required><input type="number" min="0" className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} required /></Field>
              <Field label="Telefone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
            </div>
            <Field label="Gestor"><input className={inputCls} value={manager} onChange={(e) => setManager(e.target.value)} /></Field>
            <Field label="Status">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} className="bg-slate-900 text-white" value={s}>{s}</option>)}</select>
            </Field>
            <Field label="Observações"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${btnPrimary} flex-1`}>{editingShelter ? "Salvar" : "Cadastrar"}</button>
              <button type="button" onClick={() => setShowShelterForm(false)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {showPersonForm && (
        <Modal onClose={() => setShowPersonForm(null)} title="Cadastrar Pessoa no Abrigo">
          <form onSubmit={(e) => showPersonForm && submitPerson(e, showPersonForm)} className="space-y-4">
            <Field label="Nome completo" required><input className={inputCls} value={pName} onChange={(e) => setPName(e.target.value)} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF"><input className={inputCls} value={pCpf} onChange={(e) => setPCpf(e.target.value)} /></Field>
              <Field label="Idade"><input type="number" min="0" className={inputCls} value={pAge} onChange={(e) => setPAge(e.target.value)} /></Field>
            </div>
            <Field label="Contato"><input className={inputCls} value={pPhone} onChange={(e) => setPPhone(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={pHasPet} onChange={(e) => setPHasPet(e.target.checked)} className="accent-fuchsia-500" />
              Está acompanhado(a) de pet(s)
            </label>
            {pHasPet && <Field label="Detalhes do pet"><input className={inputCls} value={pPets} onChange={(e) => setPPets(e.target.value)} placeholder="ex: 2 cães, 1 gato" /></Field>}
            <Field label="Observações"><textarea className={inputCls} rows={2} value={pNotes} onChange={(e) => setPNotes(e.target.value)} /></Field>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${btnPrimary} flex-1`}>Cadastrar</button>
              <button type="button" onClick={() => setShowPersonForm(null)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}