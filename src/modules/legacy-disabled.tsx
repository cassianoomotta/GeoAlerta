export function LegacyModuleUnavailable({ name }: { name: string }) {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-slate-100" aria-labelledby="legacy-module-title">
      <h1 id="legacy-module-title" className="text-2xl font-bold">{name} indisponível na release Core</h1>
      <p className="text-sm text-slate-300">Este módulo legado está desativado. Os dados históricos foram preservados e nenhuma operação é iniciada nesta tela.</p>
    </section>
  );
}
