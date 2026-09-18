"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Flame, HardHat, Plus, Trash2, LocateFixed, Radio, Users, Truck, Satellite, Download } from "lucide-react";
import { PageHeader, Card, Badge, StatCard, Field, inputCls, btnPrimary, btnGhost, EmptyState, Modal, fmtDate } from "@/modules/core/ui";
import { MUNICIPIO } from "@/modules/core/ui";
import { downloadCSV } from "@/lib/csvUtils";

// Leaflet só em client
const TeamMap = dynamic(() => import("./TeamMap").then((m) => m.TeamMap), { ssr: false, loading: () => <div className="h-72 flex items-center justify-center text-slate-500 text-sm">Carregando mapa das equipes...</div> });

interface Team { id: string; name: string; organ: string; type: string; leader: string | null; phone: string | null; vehicle: string | null; capacity: string | null; status: string; created_at: string; }
interface Member { id: string; full_name: string; role: string; phone: string | null; }
interface LivePoint { team_id: string; team_name: string; lat: number; lng: number; accuracy: number | null; sent_at: string; member_name?: string; }

const ORGANS = ["Defesa Civil", "Bombeiros", "Obras", "Assistência Social", "Saúde", "Polícia"];
const TYPES = ["Resgate", "Socorro", "Desobstrução", "Logística", "Saúde", "Avaliação de danos"];
const STATUSES = ["Disponível", "Em missão", "Indisponível"];
const ORGAN_TONE: Record<string, string> = { "Defesa Civil": "amber", "Bombeiros": "red", "Obras": "blue", "Assistência Social": "fuchsia", "Saúde": "emerald", "Polícia": "slate" };

export default function EquipesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [live, setLive] = useState<LivePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showMembers, setShowMembers] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [shareFor, setShareFor] = useState<Team | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // team form
  const [name, setName] = useState(""); const [organ, setOrgan] = useState(ORGANS[0]); const [type, setType] = useState(TYPES[0]);
  const [leader, setLeader] = useState(""); const [phone, setPhone] = useState(""); const [vehicle, setVehicle] = useState(""); const [capacity, setCapacity] = useState(""); const [status, setStatus] = useState(STATUSES[0]);
  // member form
  const [mName, setMName] = useState(""); const [mRole, setMRole] = useState(""); const [mPhone, setMPhone] = useState("");

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("teams").select("*").eq("municipio", MUNICIPIO).order("name");
    if (data) setTeams(data);
    setLoading(false);
  }, []);
  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  // Heartbeat: última localização por equipe, atualizada a cada 10s + realtime
  const fetchLive = useCallback(async () => {
    const { data } = await supabase.from("team_locations").select("*").gte("sent_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()).order("sent_at", { ascending: true });
    if (!data) return;
    const latest = new Map<string, LivePoint>();
    data.forEach((row: any) => {
      latest.set(row.team_id, { team_id: row.team_id, team_name: row.team_name || row.member_name || "Equipe", lat: row.lat, lng: row.lng, accuracy: row.accuracy, sent_at: row.sent_at, member_name: row.member_name });
    });
    setLive(Array.from(latest.values()));
  }, []);
  useEffect(() => {
    fetchLive();
    const iv = setInterval(() => { setNow(Date.now()); fetchLive(); }, 10000);
    const channel = supabase.channel("team-locations-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_locations" }, () => fetchLive())
      .subscribe();
    return () => { clearInterval(iv); supabase.removeChannel(channel); };
  }, [fetchLive]);

  // Compartilhar GPS em tempo real (watchPosition do celular do agente)
  const startSharing = async (team: Team) => {
    setShareFor(team);
    if (watchIdRef.current !== null) return;
    if (!("geolocation" in navigator)) return alert("Geolocalização não suportada no dispositivo.");
    // insere o heartbeat inicial + fica observando
    const push = (pos: GeolocationPosition) => {
      supabase.from("team_locations").insert({
        team_id: team.id, team_name: team.name, lat: pos.coords.latitude, lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy, sent_at: new Date().toISOString(),
      }).then(() => fetchLive());
    };
    navigator.geolocation.getCurrentPosition(push, () => alert("GPS negado. Autorize a localização."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    watchIdRef.current = navigator.geolocation.watchPosition(push, (err) => {
      if (err.code === 1) { setShareFor(null); stopSharing(); }
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };
  const stopSharing = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setShareFor(null);
  };
  useEffect(() => () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

  const submitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { municipio: MUNICIPIO, name: name.trim(), organ, type, leader: leader.trim() || null, phone: phone.trim() || null, vehicle: vehicle.trim() || null, capacity: capacity.trim() || null, status };
    if (editingTeam) {
      const { error } = await supabase.from("teams").update(payload).eq("id", editingTeam.id);
      if (error) return alert("Erro ao salvar equipe.");
    } else {
      const { error } = await supabase.from("teams").insert(payload);
      if (error) return alert("Erro ao criar equipe.");
    }
    setShowTeamForm(false); setEditingTeam(null); resetTeam(); fetchTeams();
  };
  const resetTeam = () => { setName(""); setOrgan(ORGANS[0]); setType(TYPES[0]); setLeader(""); setPhone(""); setVehicle(""); setCapacity(""); setStatus(STATUSES[0]); };
  const openEdit = (t: Team) => { setEditingTeam(t); setName(t.name); setOrgan(t.organ); setType(t.type); setLeader(t.leader || ""); setPhone(t.phone || ""); setVehicle(t.vehicle || ""); setCapacity(t.capacity || ""); setStatus(t.status); setShowTeamForm(true); };
  const delTeam = async (id: string) => { if (!confirm("Excluir esta equipe?")) return; await supabase.from("teams").delete().eq("id", id); fetchTeams(); };

  const openMembers = async (t: Team) => { setShowMembers(t); const { data } = await supabase.from("team_members").select("*").eq("team_id", t.id).order("full_name"); setMembers(data || []); };
  const submitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMembers) return;
    const { error } = await supabase.from("team_members").insert({ team_id: showMembers.id, full_name: mName.trim(), role: mRole.trim() || "Agente", phone: mPhone.trim() || null });
    if (error) return alert("Erro ao adicionar membro.");
    setShowMemberForm(false); setMName(""); setMRole(""); setMPhone(""); const { data } = await supabase.from("team_members").select("*").eq("team_id", showMembers.id).order("full_name"); setMembers(data || []);
  };
  const delMember = async (mid: string) => { await supabase.from("team_members").delete().eq("id", mid); openMembers(showMembers!); };

  const exportCSV = async () => {
    if (teams.length === 0) {
      alert("Não há equipes cadastradas para exportar.");
      return;
    }

    const { data: allMembers } = await supabase
      .from("team_members")
      .select("team_id, full_name, role");

    const membersByTeam: Record<string, string[]> = {};
    (allMembers || []).forEach((m) => {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push(`${m.full_name} (${m.role})`);
    });

    const headers = [
      "ID",
      "Nome da Equipe",
      "Órgão",
      "Tipo de Atuação",
      "Líder / Responsável",
      "Telefone",
      "Veículo / Prefixo",
      "Capacidade e Equipamentos",
      "Status",
      "Total de Integrantes",
      "Lista de Membros",
      "Data de Criação"
    ];

    const rows = teams.map((t) => [
      t.id,
      t.name,
      t.organ,
      t.type,
      t.leader || "—",
      t.phone || "—",
      t.vehicle || "—",
      t.capacity || "—",
      t.status,
      membersByTeam[t.id]?.length || 0,
      (membersByTeam[t.id] || []).join(", ") || "Nenhum membro",
      fmtDate(t.created_at)
    ]);

    downloadCSV(`geoalerta_equipes_campo_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const tone = (org: string) => (ORGAN_TONE[org] || "slate") as "amber" | "red" | "blue" | "fuchsia" | "emerald" | "slate";
  const liveCount = live.filter((p) => new Date(p.sent_at).getTime() > now - 5 * 60 * 1000).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Equipes de Resgate"
        subtitle="Equipes, membros e geolocalização em tempo real (GPS dos agentes)"
        action={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className={btnGhost} title="Exportar planilha CSV das equipes">
              <Download size={15} /> Exportar CSV
            </button>
            <button onClick={() => { setEditingTeam(null); resetTeam(); setShowTeamForm(true); }} className={btnPrimary}>
              <Plus size={16} /> Nova Equipe
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Equipes" value={teams.length} icon={<Truck size={14} />} tone="blue" />
        <StatCard label="Membros total" value={teams.reduce((a, _) => a, members.length)} icon={<Users size={14} />} tone="green" />
        <StatCard label="Em missão" value={teams.filter((t) => t.status === "Em missão").length} icon={<ShieldAlert size={14} />} tone="amber" />
        <StatCard label="Equipes com GPS ativo" value={liveCount} icon={<Satellite size={14} />} tone="emerald" />
      </div>

      {/* Mapa em tempo real */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Radio size={13} className="text-emerald-400" /> Localização em tempo real das equipes
          </span>
          {liveCount > 0 && <Badge tone="green"><span className="animate-pulse">●</span> {liveCount} transmitindo</Badge>}
        </div>
        <div className="h-72 rounded-xl overflow-hidden relative z-0 isolate">
          <TeamMap teams={teams} live={live} />
        </div>
        {liveCount === 0 && <p className="text-[11px] text-slate-500 mt-2">Nenhum agente transmitindo localização agora. Para ativar, clique em &quot;Compartilhar GPS&quot; em uma equipe no dispositivo do agente.</p>}
      </Card>

      {loading ? <EmptyState message="Carregando..." /> : teams.length === 0 ? (
        <EmptyState message="Nenhuma equipe cadastrada. Clique em 'Nova Equipe'." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {teams.map((t) => {
            const isLive = live.find((p) => p.team_id === t.id);
            return (
              <Card key={t.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.organ === "Bombeiros" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                      {t.organ === "Bombeiros" ? <Flame size={20} /> : t.organ === "Obras" ? <HardHat size={20} /> : <ShieldAlert size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{t.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <Badge tone={tone(t.organ)}>{t.organ}</Badge>
                        <Badge tone="slate">{t.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openMembers(t)} title="Membros" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"><Users size={15} /></button>
                    <button onClick={() => openEdit(t)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">✎</button>
                    <button onClick={() => delTeam(t.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-400">
                  {t.leader && <span className="flex items-center gap-1"><ShieldAlert size={12} /> Líder: <b className="text-slate-200">{t.leader}</b></span>}
                  {t.vehicle && <span className="flex items-center gap-1"><Truck size={12} /> {t.vehicle}</span>}
                  {t.capacity && <span>Cap.: {t.capacity}</span>}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 gap-2">
                  <Badge tone={t.status === "Disponível" ? "green" : t.status === "Em missão" ? "amber" : "slate"}>{t.status}</Badge>
                  <div className="flex items-center gap-2">
                    {isLive ? (
                      <button onClick={stopSharing} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer">
                        <LocateFixed size={13} /> Parar GPS
                      </button>
                    ) : (
                      <button onClick={() => startSharing(t)} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 cursor-pointer">
                        <LocateFixed size={13} /> Compartilhar GPS
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showTeamForm && (
        <Modal onClose={() => setShowTeamForm(false)} title={editingTeam ? "Editar Equipe" : "Nova Equipe"}>
          <form onSubmit={submitTeam} className="space-y-4">
            <Field label="Nome da equipe" required><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Equipe de Resgate Norte" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Órgão">
                <select className={inputCls} value={organ} onChange={(e) => setOrgan(e.target.value)}>{ORGANS.map((o) => <option key={o} className="bg-slate-900 text-white" value={o}>{o}</option>)}</select>
              </Field>
              <Field label="Tipo de atuação">
                <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} className="bg-slate-900 text-white" value={t}>{t}</option>)}</select>
              </Field>
            </div>
            <Field label="Líder / Responsável"><input className={inputCls} value={leader} onChange={(e) => setLeader(e.target.value)} placeholder="Nome do comandante ou responsável" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefone de Contato"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(51) 99999-9999" /></Field>
              <Field label="Veículo / Prefixo"><input className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="ex: Caminhonete 4x4, Viatura 02" /></Field>
            </div>
            <Field label="Capacidade e Equipamentos"><input className={inputCls} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="ex: 5 operadores, motobomba, motosserra" /></Field>
            <Field label="Status Operacional">
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} className="bg-slate-900 text-white" value={s}>{s}</option>)}</select>
            </Field>
            <div className="flex gap-2 pt-2">
              <button type="submit" className={`${btnPrimary} flex-1`}>{editingTeam ? "Salvar Alterações" : "Cadastrar Equipe"}</button>
              <button type="button" onClick={() => setShowTeamForm(false)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {showMembers && (
        <Modal onClose={() => setShowMembers(null)} title={`Membros — ${showMembers.name}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">{members.length} membro(s)</span>
            <button onClick={() => setShowMemberForm(true)} className={btnGhost}><Plus size={14} /> Adicionar membro</button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhum membro cadastrado nesta equipe.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div>
                    <div className="text-sm font-semibold text-white">{m.full_name}</div>
                    <div className="text-[11px] text-slate-400">{m.role}{m.phone ? ` • ${m.phone}` : ""}</div>
                  </div>
                  <button onClick={() => delMember(m.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {showMemberForm && (
            <form onSubmit={submitMember} className="space-y-3 mt-4 border-t border-slate-700/80 pt-4">
              <Field label="Nome completo" required><input className={inputCls} value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Nome completo do integrante" required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Função"><input className={inputCls} value={mRole} onChange={(e) => setMRole(e.target.value)} placeholder="ex: Resgatista, Motorista" /></Field>
                <Field label="Telefone"><input className={inputCls} value={mPhone} onChange={(e) => setMPhone(e.target.value)} placeholder="(51) 99999-9999" /></Field>
              </div>
              <div className="flex gap-2">
                <button type="submit" className={`${btnPrimary} flex-1`}>Salvar Membro</button>
                <button type="button" onClick={() => setShowMemberForm(false)} className={`${btnGhost} flex-1`}>Cancelar</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}