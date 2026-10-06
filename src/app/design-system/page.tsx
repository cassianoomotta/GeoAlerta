import Link from 'next/link';
import { Download } from 'lucide-react';
import { ThemeSelect } from '@/components/theme/theme-select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { PriorityBadge, StatusBadge } from '@/features/occurrences/ui/OccurrenceBadges';
import tokens from '../../../docs/design-system/tokens.json';

const statuses = [
  ['NOVA', 'Nova'], ['EM_TRIAGEM', 'Em triagem'], ['EM_ATENDIMENTO', 'Em atendimento'],
  ['RESOLVIDA', 'Resolvida'], ['CANCELADA', 'Cancelada'],
] as const;

export default function DesignSystemPage() {
  return <main id="content" className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
    <PageHeader title="Design system" description="GeoAlerta · Componentes e estados da interface. Exemplos ilustrativos com dados fictícios." action={<ThemeSelect />} />
    <section aria-labelledby="actions-title" className="border-t pt-6">
      <h2 id="actions-title" className="mb-4 text-lg font-semibold">Ações</h2>
      <div className="flex flex-wrap gap-3">
        <Button>Registrar ocorrência</Button><Button variant="secondary"><Download size={18} aria-hidden="true" />Baixar CSV</Button>
        <Button variant="text">Ver detalhes</Button><Button variant="danger">Cancelar ocorrência</Button>
        <Button disabled>Sem autorização</Button><Button loading>Salvar</Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Botões demonstrativos: as ações acima não alteram ocorrências.</p>
    </section>
    <section aria-labelledby="fields-title" className="border-t pt-6">
      <h2 id="fields-title" className="mb-4 text-lg font-semibold">Campos e validação</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Contato" placeholder="Telefone ou e-mail" hint="Informe como podemos entrar em contato." />
        <Field label="Descrição com erro" required error="Descreva a ocorrência para continuar." />
        <Field label="Protocolo" value="GEO-2026-000128" readOnly hint="Dados fictícios. O campo permite selecionar e copiar." />
        <Field label="Campo indisponível" disabled placeholder="Indisponível" hint="Exemplo de indisponibilidade com motivo associado." />
      </div>
    </section>
    <section aria-labelledby="statuses-title" className="border-t pt-6">
      <h2 id="statuses-title" className="mb-4 text-lg font-semibold">Prioridade e situação</h2>
      <div className="flex flex-wrap gap-3"><PriorityBadge priority="NORMAL" /><PriorityBadge priority="ALTA" /></div>
      <div className="mt-4 flex flex-wrap gap-3">{statuses.map(([status, label]) => <StatusBadge key={status} status={status} label={label} />)}</div>
      <p className="mt-3 text-sm text-muted-foreground">Na plataforma, a situação usa o rótulo configurado pelo município.</p>
    </section>
    <section aria-labelledby="notices-title" className="border-t pt-6">
      <h2 id="notices-title" className="mb-4 text-lg font-semibold">Mensagens operacionais</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <InlineNotice tone="info">O recorte do mapa acompanha os filtros aplicados.</InlineNotice>
        <InlineNotice tone="success">Alteração salva.</InlineNotice>
        <InlineNotice tone="warning">Conexão indisponível. Os dados exibidos podem estar desatualizados.</InlineNotice>
        <InlineNotice tone="danger">Não foi possível carregar as ocorrências. Tente novamente.</InlineNotice>
      </div>
    </section>
    <section aria-labelledby="palette-title" className="border-t pt-6">
      <h2 id="palette-title" className="mb-4 text-lg font-semibold">Paleta semântica</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {['background', 'surface', 'surface-subtle', 'primary', 'danger', 'warning', 'success', 'info', 'text', 'text-muted', 'border', 'control-border'].map(name => <div key={name} className="min-w-0">
          <div className="h-16 rounded-md border" style={{ background: `var(--${name})` }} />
          <p className="mt-2 break-words text-sm text-muted-foreground">{name}</p>
        </div>)}
      </div>
    </section>
    <section aria-labelledby="layout-title" className="border-t pt-6">
      <h2 id="layout-title" className="mb-4 text-lg font-semibold">Leitura e estados de conteúdo</h2>
      <div className="grid gap-8 sm:grid-cols-2">
        <div><p className="max-w-[70ch] text-base leading-6">A informação orienta a operação. Prioridade, situação e localização permanecem legíveis, com cor e texto. As ações indicam seu resultado e as mensagens apresentam um caminho de recuperação.</p><p className="mt-4 text-sm text-muted-foreground">Helvetica Neue / Arial · Corpo 16/24 · Controles 40/48 px</p></div>
        <div><Skeleton label="Carregando ocorrências…" className="h-12" /><EmptyState title="Nenhuma ocorrência neste período." description="Altere o período para consultar outros registros." /></div>
      </div>
    </section>
    <footer className="flex flex-wrap justify-between gap-4 border-t pt-6 text-sm text-muted-foreground">
      <span>Tokens {tokens.version} · Claro, Escuro e Sistema</span><Link href="/" className="text-primary underline">Abrir registro de ocorrências</Link>
    </footer>
  </main>;
}
