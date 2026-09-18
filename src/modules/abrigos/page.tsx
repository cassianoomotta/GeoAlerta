"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, Users, PawPrint, Trash2, ChevronDown, UserPlus, Download, Eye, FileText, Clock, Phone, MapPin, Loader2 } from "lucide-react";
import { PageHeader, Card, Badge, StatCard, Field, inputCls, btnPrimary, btnGhost, EmptyState, Modal, fmtDate } from "@/modules/core/ui";
import { MUNICIPIO } from "@/modules/core/ui";
import { downloadCSV } from "@/lib/csvUtils";
import { geocodeAddress } from "@/lib/geoUtils";

interface Shelter {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number;
  occupied: number;
  phone: string | null;
  manager: string | null;
  status: string;
  notes: string | null;
}

interface Person {
  id: string;
  shelter_id: string;
  full_name: string;
  cpf: string | null;
  age: number | null;
  phone: string | null;
  has_pet: boolean;
  pet_details: string | null;
  notes: string | null;
  check_in_at?: string;
  created_at?: string;
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
  const [selectedPerson, setSelectedPerson] = useState<{ person: Person; shelterName: string } | null>(null);

  // shelter form
  const [name, setName] = useState("");
  const [type, setType] = useState("humano");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [capacity, setCapacity] = useState("0");
  const [phone, setPhone] = useState("");
  const [manager, setManager] = useState("");
  const [status, setStatus] = useState(STATUSES[0]);
  const [notes, setNotes] = useState("");

  // person form
  const [pName, setPName] = useState("");
  const [pCpf, setPCpf] = useState("");
  const [pAge, setPAge] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pHasPet, setPHasPet] = useState(false);
  const [pPets, setPPets] = useState("");
  const [pNotes, setPNotes] = useState("");

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

  const handleGeocode = async () => {
    if (!address.trim()) return alert("Digite o endereço ou cole o link do Google Maps primeiro.");
    setGeocoding(true);
    try {
      const coords = await geocodeAddress(address.trim());
      if (coords) {
        setLat(String(coords.lat));
        setLng(String(coords.lng));
      } else {
        alert("Não foi possível localizar as coordenadas automaticamente deste endereço. Digite a latitude e longitude manualmente ou cole o link do Google Maps com coordenadas.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeocoding(false);
    }
  };

  const submitShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalLat = lat.trim() ? parseFloat(lat) : null;
    let finalLng = lng.trim() ? parseFloat(lng) : null;

    if ((finalLat === null || finalLng === null) && address.trim()) {
      setGeocoding(true);
      const coords = await geocodeAddress(address.trim());
      setGeocoding(false);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
      }
    }

    const payload = {
      municipio: MUNICIPIO,
      name: name.trim(),
      type,
      address: address.trim() || null,
      lat: finalLat,
      lng: finalLng,
      capacity: Number(capacity) || 0,
      phone: phone.trim() || null,
      manager: manager.trim() || null,
      status,
      notes: notes.trim() || null,
    };
    if (editingShelter) {
      const { error } = await supabase.from("shelters").update(payload).eq("id", editingShelter.id);
      if (error) return alert("Erro ao salvar abrigo: " + error.message);
    } else {
      const { error } = await supabase.from("shelters").insert(payload);
      if (error) return alert("Erro ao criar abrigo: " + error.message);
    }
    setShowShelterForm(false);
    setEditingShelter(null);
    resetShelter();
    fetchShelters();
  };

  const resetShelter = () => {
    setName(""); setType("humano"); setAddress(""); setLat(""); setLng(""); setCapacity("0");
    setPhone(""); setManager(""); setStatus(STATUSES[0]); setNotes("");
  };

  const resetPerson = () => {
    setPName(""); setPCpf(""); setPAge(""); setPPhone("");
    setPHasPet(false); setPPets(""); setPNotes("");
  };

  const openEditShelter = (s: Shelter) => {
    setEditingShelter(s);
    setName(s.name); setType(s.type); setAddress(s.address || "");
    setLat(s.lat !== null && s.lat !== undefined ? String(s.lat) : "");
    setLng(s.lng !== null && s.lng !== undefined ? String(s.lng) : "");
    setCapacity(String(s.capacity)); setPhone(s.phone || "");
    setManager(s.manager || ""); setStatus(s.status); setNotes(s.notes || "");
    setShowShelterForm(true);
  };

  const delShelter = async (id: string) => {
    if (!confirm("Excluir este abrigo e todos os cadastros vinculados a ele?")) return;
    await supabase.from("shelters").delete().eq("id", id);
    fetchShelters();
  };

  const submitPerson = async (e: React.FormEvent, shelterId: string) => {
    e.preventDefault();
    const { error } = await supabase.from("shelter_people").insert({
      shelter_id: shelterId,
      full_name: pName.trim(),
      cpf: pCpf.trim() || null,
      age: pAge ? Number(pAge) : null,
      phone: pPhone.trim() || null,
      has_pet: pHasPet,
      pet_details: (pHasPet && pPets.trim()) ? pPets.trim() : null,
      notes: pNotes.trim() || null,
    });
    // atualiza ocupação
    const current = people[shelterId]?.length || 0;
    await supabase.from("shelters").update({ occupied: current + 1 }).eq("id", shelterId);
    if (error) return alert("Erro ao cadastrar pessoa.");
    setShowPersonForm(null);
    resetPerson();
    fetchPeople(shelterId);
    fetchShelters();
  };

  const delPerson = async (personId: string, shelterId: string) => {
    if (!confirm("Confirma a saída/remoção desta pessoa do abrigo?")) return;
    await supabase.from("shelter_people").delete().eq("id", personId);
    const current = people[shelterId]?.length || 0;
    await supabase.from("shelters").update({ occupied: Math.max(0, current - 1) }).eq("id", shelterId);
    fetchPeople(shelterId);
    fetchShelters();
  };

  const exportCSV = async () => {
    const { data: allPeople } = await supabase
      .from("shelter_people")
      .select("*, shelters(name, type, status)")
      .order("created_at", { ascending: false });

    if (!allPeople || allPeople.length === 0) {
      alert("Nenhum registro de acolhimento encontrado para exportar.");
      return;
    }

    const headers = [
      "ID",
      "Abrigo",
      "Tipo do Abrigo",
      "Nome Completo",
      "CPF",
      "Idade",
      "Contato",
      "Possui Pets",
      "Detalhes dos Pets",
      "Observações Médicas / Especiais",
      "Data e Hora de Entrada"
    ];

    const rows = allPeople.map((p: any) => [
      p.id,
      p.shelters?.name || "Não informado",
      p.shelters?.type || "Humano",
      p.full_name,
      p.cpf || "—",
      p.age ?? "—",
      p.phone || "—",
      p.has_pet ? "Sim" : "Não",
      p.pet_details || "—",
      p.notes || "Nenhuma",
      fmtDate(p.check_in_at || p.created_at)
    ]);

    downloadCSV(`geoalerta_censo_abrigados_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const totalPeople = Object.values(people).reduce((a, arr) => a + arr.length, 0);
  const capacityTotal = shelters.reduce((a, s) => a + s.capacity, 0);
  const origenTone = (t: string) => (t === "pet" ? "fuchsia" : t === "misto" ? "amber" : "blue");
  const typeLabel = (t: string) => (t === "pet" ? "Pet" : t === "misto" ? "Humano + Pet" : "Humano");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Abrigos e Acolhimento"
        subtitle="Gestão de abrigos, triagem de cidadãos e acolhimento com animais"
        action={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className={btnGhost} title="Exportar censo completo de abrigados em CSV">
              <Download size={15} /> Exportar Censo (CSV)
            </button>
            <button onClick={() => { setEditingShelter(null); resetShelter(); setShowShelterForm(true); }} className={btnPrimary}>
              <Plus size={16} /> Novo Abrigo
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Abrigos ativos" value={shelters.length} icon={<Building2 size={14} />} tone="blue" />
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
                    {s.address && <p className="text-xs text-slate-400 mt-0.5">{s.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:block font-medium">Ocupação</span>
                  <div className="w-28 bg-white/10 rounded-lg h-2 overflow-hidden">
                    <div className={`h-full ${s.capacity > 0 && s.occupied / s.capacity >= 0.85 ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${s.capacity > 0 ? Math.min(100, (s.occupied / s.capacity) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold text-white w-20 text-right">{s.occupied}/{s.capacity}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEditShelter(s); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">✎</button>
                    <button onClick={(e) => { e.stopPropagation(); delShelter(s.id); }} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={14} /></button>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </button>

              {openId === s.id && (
                <div className="border-t border-white/10 p-4 bg-slate-950/40">
                  {(s.notes || s.manager || s.phone) && (
                    <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-400">
                      {s.manager && <Badge tone="slate">Gestor: {s.manager}</Badge>}
                      {s.phone && <Badge tone="slate">Tel: {s.phone}</Badge>}
                      {s.notes && <span className="italic">{s.notes}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Users size={14} /> Pessoas abrigadas ({people[s.id]?.length || 0})
                    </span>
                    <button onClick={() => { setShowPersonForm(s.id); resetPerson(); }} className={btnGhost}>
                      <UserPlus size={14} /> Cadastrar pessoa
                    </button>
                  </div>

                  {(people[s.id] || []).length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center bg-slate-900/50 rounded-xl border border-slate-800">
                      Nenhuma pessoa cadastrada neste abrigo. Clique em &quot;Cadastrar pessoa&quot; acima para registrar acolhidos.
                    </p>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left min-w-[700px] border-collapse">
                        <thead className="bg-white/[0.03]">
                          <tr>
                            {["Nome & Saúde", "CPF", "Idade", "Contato", "Pets", ""].map((h) => (
                              <th key={h} className="p-2.5 text-[11px] uppercase tracking-wider text-slate-300 font-bold border-b border-white/10">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(people[s.id] || []).map((p) => (
                            <tr 
                              key={p.id} 
                              onClick={() => setSelectedPerson({ person: p, shelterName: s.name })}
                              className="hover:bg-blue-500/10 transition-colors cursor-pointer group"
                              title="Clique para abrir a ficha completa da pessoa abrigada"
                            >
                              <td className="p-2.5">
                                <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors block">
                                  {p.full_name}
                                </span>
                                {p.notes ? (
                                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-300 font-medium">
                                    <FileText size={11} className="shrink-0 text-amber-400" />
                                    <span className="truncate max-w-[280px]" title={p.notes}>{p.notes}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-500 block mt-0.5">Sem restrições relatadas</span>
                                )}
                              </td>
                              <td className="p-2.5 text-xs text-slate-300 font-mono">{p.cpf || "—"}</td>
                              <td className="p-2.5 text-xs text-slate-300">{p.age ? `${p.age} anos` : "—"}</td>
                              <td className="p-2.5 text-xs text-slate-300">{p.phone || "—"}</td>
                              <td className="p-2.5 text-xs">
                                {p.has_pet ? (
                                  <Badge tone="fuchsia"><PawPrint size={11} /> {p.pet_details || "Com pet"}</Badge>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button 
                                    onClick={() => setSelectedPerson({ person: p, shelterName: s.name })} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                                    title="Ver Ficha Completa do Abrigado"
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button 
                                    onClick={() => delPerson(p.id, s.id)} 
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                    title="Remover do abrigo"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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

      {/* Modal Ficha Completa da Pessoa Abrigada (Especialista UX) */}
      {selectedPerson && (
        <Modal onClose={() => setSelectedPerson(null)} title="Ficha do Abrigado">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedPerson.person.full_name}</h2>
                <span className="text-xs text-slate-400">Abrigo vinculado: <b className="text-blue-400">{selectedPerson.shelterName}</b></span>
              </div>
              {selectedPerson.person.has_pet && (
                <Badge tone="fuchsia">
                  <PawPrint size={12} /> Com Pet
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CPF</span>
                <span className="text-sm font-semibold text-slate-200 font-mono mt-0.5 block">{selectedPerson.person.cpf || "Não informado"}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Idade</span>
                <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{selectedPerson.person.age ? `${selectedPerson.person.age} anos` : "Não informada"}</span>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contato</span>
                <span className="text-sm font-semibold text-slate-200 mt-0.5 block">{selectedPerson.person.phone || "Não informado"}</span>
              </div>
            </div>

            {selectedPerson.person.has_pet && (
              <div className="bg-fuchsia-950/30 border border-fuchsia-800/40 p-3.5 rounded-xl">
                <span className="text-xs font-bold text-fuchsia-300 flex items-center gap-1.5 mb-1">
                  <PawPrint size={14} /> Animais de Estimação:
                </span>
                <p className="text-sm text-fuchsia-100 font-medium">{selectedPerson.person.pet_details || "Acompanhado de animal de estimação"}</p>
              </div>
            )}

            {selectedPerson.person.notes ? (
              <div className="bg-amber-950/30 border border-amber-800/40 p-3.5 rounded-xl">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                  <FileText size={14} /> Observações Médicas / Necessidades Especiais:
                </span>
                <p className="text-sm text-amber-100 leading-relaxed whitespace-pre-wrap">{selectedPerson.person.notes}</p>
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl text-xs text-slate-400">
                Nenhuma observação médica ou restrição especial informada.
              </div>
            )}

            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5">
              <Clock size={12} /> Entrada no abrigo: {fmtDate(selectedPerson.person.check_in_at || selectedPerson.person.created_at)}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  delPerson(selectedPerson.person.id, selectedPerson.person.shelter_id);
                  setSelectedPerson(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer"
              >
                Dar Baixa / Remover
              </button>
              <button
                type="button"
                onClick={() => setSelectedPerson(null)}
                className={`${btnGhost} flex-1`}
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </Modal>
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
            <Field label="Endereço ou Link do Google Maps">
              <div className="flex gap-2">
                <input 
                  className={inputCls} 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="ex: R. Bolívia, 71 ou cole o link do Google Maps" 
                />
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocoding}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Buscar Latitude e Longitude a partir do endereço"
                >
                  {geocoding ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  <span>{geocoding ? "Buscando..." : "Localizar"}</span>
                </button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
              <Field label="Latitude GPS (Mapa)">
                <input 
                  type="number" 
                  step="any" 
                  className={inputCls} 
                  value={lat} 
                  onChange={(e) => setLat(e.target.value)} 
                  placeholder="ex: -29.8357" 
                />
              </Field>
              <Field label="Longitude GPS (Mapa)">
                <input 
                  type="number" 
                  step="any" 
                  className={inputCls} 
                  value={lng} 
                  onChange={(e) => setLng(e.target.value)} 
                  placeholder="ex: -50.5250" 
                />
              </Field>
              <p className="col-span-2 text-[11px] text-slate-400">
                💡 Ao salvar ou clicar em <b>Localizar</b>, as coordenadas são calculadas automaticamente para exibir o abrigo no mapa.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacidade" required><input type="number" min="0" className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="0" required /></Field>
              <Field label="Telefone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(51) 99999-9999" /></Field>
            </div>
            <Field label="Gestor / Responsável"><input className={inputCls} value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Nome do coordenador do abrigo" /></Field>
            <Field label="Status">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} className="bg-slate-900 text-white" value={s}>{s}</option>)}</select>
            </Field>
            <Field label="Observações"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Estrutura, banheiros, acessibilidade, etc." /></Field>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${btnPrimary} flex-1`}>{editingShelter ? "Salvar Alterações" : "Cadastrar Abrigo"}</button>
              <button type="button" onClick={() => setShowShelterForm(false)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {showPersonForm && (
        <Modal onClose={() => setShowPersonForm(null)} title="Cadastrar Pessoa no Abrigo">
          <form onSubmit={(e) => showPersonForm && submitPerson(e, showPersonForm)} className="space-y-4">
            <Field label="Nome completo" required><input className={inputCls} value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Nome completo do abrigado" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF"><input className={inputCls} value={pCpf} onChange={(e) => setPCpf(e.target.value)} placeholder="000.000.000-00" /></Field>
              <Field label="Idade"><input type="number" min="0" className={inputCls} value={pAge} onChange={(e) => setPAge(e.target.value)} placeholder="Idade" /></Field>
            </div>
            <Field label="Contato"><input className={inputCls} value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="(51) 99999-9999" /></Field>
            <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
              <input type="checkbox" checked={pHasPet} onChange={(e) => setPHasPet(e.target.checked)} className="w-4 h-4 rounded accent-fuchsia-500" />
              Está acompanhado(a) de pet(s)
            </label>
            {pHasPet && <Field label="Detalhes do pet"><input className={inputCls} value={pPets} onChange={(e) => setPPets(e.target.value)} placeholder="ex: 2 cães, 1 gato" /></Field>}
            <Field label="Observações"><textarea className={inputCls} rows={2} value={pNotes} onChange={(e) => setPNotes(e.target.value)} placeholder="Medicamentos de uso contínuo, necessidades especiais, etc." /></Field>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${btnPrimary} flex-1`}>Cadastrar Pessoa</button>
              <button type="button" onClick={() => setShowPersonForm(null)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}