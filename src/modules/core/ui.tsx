// =============================================
// GeoAlerta - Design System + Helpers do Núcleo modular
// (componentes compartilhados entre módulos)
// =============================================
import type { ReactNode } from "react";

export const MUNICIPIO = "sa_patrulha";

// ---------- Formatters ----------
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("pt-BR");
}

// ---------- UI Primitivas ----------
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-400 text-xs font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl border border-white/10 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" | "fuchsia" | "emerald" }) {
  const tones: Record<string, string> = {
    slate: "bg-white/5 text-slate-300 border-white/10",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    fuchsia: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, icon, tone = "blue" }: { label: string; value: ReactNode; icon?: ReactNode; tone?: string }) {
  const ring: Record<string, string> = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    green: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    red: "text-red-400 border-red-500/20 bg-red-500/5",
    fuchsia: "text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5",
  };
  return (
    <div className={`rounded-2xl border p-4 ${ring[tone]}`}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-80">
        {icon}{label}
      </div>
      <div className="text-2xl font-extrabold mt-2">{value}</div>
    </div>
  );
}

// ---------- Form primitivas ----------
export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full bg-white/10 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm border border-blue-500/40 cursor-pointer disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors border border-white/10 cursor-pointer disabled:opacity-50";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center text-slate-500 text-sm font-medium">
      {message}
    </div>
  );
}

export function Modal({ onClose, children, title }: { onClose: () => void; children: ReactNode; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full sm:w-[min(30rem,calc(100vw-2rem))] max-h-[92vh] border border-white/15 bg-slate-950/95 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {title && (
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02] shrink-0">
            <h3 className="text-base font-extrabold text-white">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
              ✕
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
}