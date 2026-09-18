"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Boxes, Plus, Archive, RefreshCw, Trash2, Download, Truck, Calendar, UserCheck, Tag } from "lucide-react";
import { PageHeader, Card, Badge, StatCard, Field, inputCls, btnPrimary, btnGhost, EmptyState, Modal, fmtDate } from "@/modules/core/ui";
import { MUNICIPIO } from "@/modules/core/ui";
import { downloadCSV } from "@/lib/csvUtils";

interface Resource {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  batch: string | null;
  donor: string | null;
  received_by: string | null;
  arrival_date: string | null;
  expiry_date: string | null;
  shelter_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const CATEGORIES = ["Água", "Alimentação", "Medicamento", "Cobertores/Vestuário", "Higiene", "Ferramentas", "Combustível/Logística", "Outros"];
const STATUSES = ["Disponível", "Baixo Estoque", "Pedido", "Esgotado"];

export default function RecursosPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [shelters, setShelters] = useState<{ id: string; name: string }[]>([]);
  const [movements, setMovements] = useState<Record<string, number>>({});

  // form
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("un");
  const [batch, setBatch] = useState("");
  const [donor, setDonor] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiry, setExpiry] = useState("");
  const [shelterId, setShelterId] = useState("");
  const [status, setStatus] = useState(STATUSES[0]);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.from("resources").select("*").eq("municipio", MUNICIPIO).order("created_at", { ascending: false }),
      supabase.from("shelters").select("id, name").eq("municipio", MUNICIPIO).order("name"),
    ]);
    if (r.data) setItems(r.data);
    if (s.data) setShelters(s.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      municipio: MUNICIPIO,
      name: name.trim(),
      category,
      quantity: Number(quantity) || 0,
      unit,
      batch: batch.trim() || null,
      donor: donor.trim() || null,
      received_by: receivedBy.trim() || null,
      arrival_date: arrivalDate || null,
      expiry_date: expiry || null,
      shelter_id: shelterId || null,
      status,
      notes: notes.trim() || null,
    };
    let ok = false;
    if (editingId) {
      const { error } = await supabase.from("resources").update(payload).eq("id", editingId);
      ok = !error;
    } else {
      const { error } = await supabase.from("resources").insert(payload);
      ok = !error;
    }
    if (!ok) { alert("Erro ao salvar recurso. Verifique as permissões (RLS)."); return; }
    setShowForm(false);
    setEditingId(null);
    resetForm();
    fetchAll();
  };

  const resetForm = () => {
    setName(""); setCategory(CATEGORIES[0]); setQuantity("0"); setUnit("un");
    setBatch(""); setDonor(""); setReceivedBy(""); setArrivalDate(new Date().toISOString().slice(0, 10));
    setExpiry(""); setShelterId(""); setStatus(STATUSES[0]); setNotes("");
  };

  const openEdit = (r: Resource) => {
    setEditingId(r.id);
    setName(r.name); setCategory(r.category); setQuantity(String(r.quantity)); setUnit(r.unit);
    setBatch(r.batch || ""); setDonor(r.donor || ""); setReceivedBy(r.received_by || "");
    setArrivalDate(r.arrival_date ? r.arrival_date.slice(0, 10) : "");
    setExpiry(r.expiry_date ? r.expiry_date.slice(0, 10) : "");
    setShelterId(r.shelter_id || ""); setStatus(r.status); setNotes(r.notes || "");
    setShowForm(true);
  };

  const openMovements = async (r: Resource) => {
    const { data } = await supabase.from("resource_movements").select("type, quantity").eq("resource_id", r.id);
    const agg: Record<string, number> = { entrada: 0, saida: 0 };
    (data || []).forEach((m) => { agg[m.type] = (agg[m.type] || 0) + Number(m.quantity); });
    setMovements(agg);
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este recurso?")) return;
    await supabase.from("resources").delete().eq("id", id);
    fetchAll();
  };

  const exportCSV = () => {
    if (items.length === 0) {
      alert("Não há recursos cadastrados para exportar.");
      return;
    }
    const headers = [
      "ID",
      "Item",
      "Categoria",
      "Quantidade",
      "Unidade",
      "Lote",
      "Doado Por",
      "Recebido Por",
      "Data de Chegada",
      "Data de Validade",
      "Status",
      "Abrigo Vinculado",
      "Observações",
      "Cadastrado Em"
    ];
    const rows = items.map((r) => [
      r.id,
      r.name,
      r.category,
      r.quantity,
      r.unit,
      r.batch || "—",
      r.donor || "—",
      r.received_by || "—",
      r.arrival_date ? fmtDate(r.arrival_date).slice(0, 8) : "—",
      r.expiry_date ? fmtDate(r.expiry_date).slice(0, 8) : "—",
      r.status,
      shelters.find((s) => s.id === r.shelter_id)?.name || "Nenhum",
      r.notes || "",
      fmtDate(r.created_at),
    ]);
    downloadCSV(`geoalerta_estoque_recursos_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const totalQty = items.reduce((a, r) => a + Number(r.quantity), 0);
  const lowCount = items.filter((r) => r.status === "Baixo Estoque" || r.status === "Esgotado").length;

  const statusTone = (s: string) => (s === "Disponível" ? "green" : s === "Baixo Estoque" ? "amber" : s === "Esgotado" ? "red" : "blue");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Estoque de Recursos"
        subtitle="Itens, quantidades, rastreamento de lotes, doadores e movimentações"
        action={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className={btnGhost} title="Exportar planilha CSV formatada">
              <Download size={15} /> Exportar CSV
            </button>
            <button onClick={() => { setEditingId(null); resetForm(); setShowForm(true); }} className={btnPrimary}>
              <Plus size={16} /> Novo Recurso
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Recursos cadastrados" value={items.length} icon={<Boxes size={14} />} tone="blue" />
        <StatCard label="Quantidade total" value={fmtQty(totalQty)} icon={<Archive size={14} />} tone="green" />
        <StatCard label="Itens críticos (baixo/esgotado)" value={lowCount} icon={<RefreshCw size={14} />} tone="red" />
      </div>

      <Card>
        {loading ? (
          <EmptyState message="Carregando..." />
        ) : items.length === 0 ? (
          <EmptyState message="Nenhum recurso cadastrado. Clique em 'Novo Recurso' para começar." />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[960px] border-collapse">
              <thead className="bg-white/[0.03] sticky top-0 z-10">
                <tr>
                  {["Item / Origem", "Categoria", "Qtd", "Rastreio (Lote / Recebido)", "Datas (Chegada / Validade)", "Status", ""].map((h) => (
                    <th key={h} className="p-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/10">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-3">
                      <span className="text-sm font-bold text-white block">{r.name}</span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.donor && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Truck size={11} className="text-blue-400" /> Doado por: <b className="text-slate-200">{r.donor}</b>
                          </span>
                        )}
                        {r.shelter_id && (
                          <span className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                            Abrigo: {shelters.find((s) => s.id === r.shelter_id)?.name || "Alocado"}
                          </span>
                        )}
                      </div>
                      {r.notes && <span className="text-[11px] text-slate-500 block mt-0.5 italic">{r.notes}</span>}
                    </td>
                    <td className="p-3 text-xs text-slate-300">{r.category}</td>
                    <td className="p-3 text-sm font-bold text-white">
                      {fmtQty(r.quantity)} <span className="text-[10px] text-slate-400 font-normal">{r.unit}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-300">
                      {r.batch ? (
                        <div className="flex items-center gap-1 text-slate-200 font-medium">
                          <Tag size={11} className="text-amber-400" /> Lote: {r.batch}
                        </div>
                      ) : (
                        <span className="text-slate-500">Sem lote</span>
                      )}
                      {r.received_by && (
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <UserCheck size={11} className="text-emerald-400" /> Recebido: {r.received_by}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {r.arrival_date && (
                        <div className="text-slate-300 flex items-center gap-1">
                          <Calendar size={11} className="text-blue-400" /> Chegada: {fmtDate(r.arrival_date).slice(0, 8)}
                        </div>
                      )}
                      {r.expiry_date ? (
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Validade: <span className="text-amber-300 font-medium">{fmtDate(r.expiry_date).slice(0, 8)}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Sem validade</span>
                      )}
                    </td>
                    <td className="p-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button title="Movimentações" onClick={() => openMovements(r)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"><Archive size={14} /></button>
                        <button title="Editar" onClick={() => openEdit(r)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer">✎</button>
                        <button title="Excluir" onClick={() => del(r.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {Object.keys(movements).length > 0 && (
        <Modal onClose={() => setMovements({})} title="Movimentações do recurso">
          <div className="grid grid-cols-2 gap-3">
            <Card><span className="text-xs text-emerald-400 font-bold">Entradas</span><div className="text-2xl font-extrabold text-white mt-1">{fmtQty(movements.entrada || 0)}</div></Card>
            <Card><span className="text-xs text-red-400 font-bold">Saídas</span><div className="text-2xl font-extrabold text-white mt-1">{fmtQty(movements.saida || 0)}</div></Card>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Histórico registrado na tabela <code>resource_movements</code>.
          </p>
        </Modal>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editingId ? "Editar Recurso" : "Novo Recurso"}>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nome do item" required>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Fardos de Água mineral 500ml" required />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} className="bg-slate-900 text-white" value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((s) => <option key={s} className="bg-slate-900 text-white" value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantidade" required>
                <input type="number" min="0" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" required />
              </Field>
              <Field label="Unidade">
                <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ex: un, kg, fardos, caixas" />
              </Field>
            </div>

            {/* Novos campos solicitados: Lote e Data de Chegada */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lote">
                <input className={inputCls} value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="ex: Lote 2024-A01" />
              </Field>
              <Field label="Data de Chegada">
                <input type="date" className={inputCls} value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
              </Field>
            </div>

            {/* Novos campos solicitados: Doado por e Recebido por */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Doado por">
                <input className={inputCls} value={donor} onChange={(e) => setDonor(e.target.value)} placeholder="ex: Defesa Civil Estadual / Supermercado X" />
              </Field>
              <Field label="Recebido por">
                <input className={inputCls} value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="ex: Agente Silva / Central de Triagem" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de Validade">
                <input type="date" className={inputCls} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </Field>
              <Field label="Abrigo vinculado (opcional)">
                <select className={inputCls} value={shelterId} onChange={(e) => setShelterId(e.target.value)}>
                  <option value="" className="bg-slate-900 text-white">Nenhum (Central)</option>
                  {shelters.map((s) => <option key={s.id} className="bg-slate-900 text-white" value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Observações">
              <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Armazenamento, condições da carga, etc." />
            </Field>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button type="submit" className={`${btnPrimary} flex-1`}>{editingId ? "Salvar Alterações" : "Cadastrar Recurso"}</button>
              <button type="button" onClick={() => setShowForm(false)} className={`${btnGhost} flex-1`}>Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function fmtQty(n: number): string {
  return Number(n).toLocaleString("pt-BR");
}