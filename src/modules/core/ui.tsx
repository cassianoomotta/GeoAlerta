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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
        {label} {required && <span className="text-red-400 font-extrabold">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full bg-slate-950/90 border border-slate-600/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all shadow-inner";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/25 border border-blue-400/30 cursor-pointer disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 text-sm font-bold px-5 py-2.5 rounded-xl transition-all border border-slate-600/60 cursor-pointer disabled:opacity-50";

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center text-slate-400 text-sm font-medium">
      {message}
    </div>
  );
}

export function Modal({ onClose, children, title }: { onClose: () => void; children: ReactNode; title?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10">
        {title && (
          <div className="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-950/60 shrink-0">
            <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-base font-bold"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
}