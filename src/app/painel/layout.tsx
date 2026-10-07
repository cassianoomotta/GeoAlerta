'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CloudRain, LayoutDashboard, List, MapPin, Menu, Plus, UserRound, X } from 'lucide-react';
import { CoreNotifications } from '@/features/occurrences/ui/CoreNotifications';
import { getEnabledModules } from '@/modules/registry';
import { ThemeSelect } from '@/components/theme/theme-select';
import { GeoAlertaLogo } from '@/components/brand/geoalerta-logo';

const icons: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} aria-hidden="true" />,
  monitoramento: <MapPin size={18} aria-hidden="true" />,
  tabela: <List size={18} aria-hidden="true" />,
  "nova-ocorrencia": <Plus size={18} aria-hidden="true" />,
};
const contacts = [
  { name: 'Defesa Civil', number: '199', href: 'tel:199' },
  { name: 'Bombeiros', number: '193', href: 'tel:193' },
  { name: 'Sec. de Obras', number: '3662-8400', href: 'tel:5136628400' },
  { name: 'Assist. Social', number: '3662-8480', href: 'tel:5136628480' },
];
function isModuleActive(href: string, pathname: string) {
  if (href === '/painel/ocorrencias' && pathname === '/painel/ocorrencias/nova') return false;
  return href === '/painel' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [canAdminister, setCanAdminister] = useState(false);
  const [canManageEvents, setCanManageEvents] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/core/access?capability=administer', { cache: 'no-store' }),
      fetch('/api/core/access?capability=reclassify', { cache: 'no-store' }),
    ]).then(([admin, events]) => {
      if (active) { setCanAdminister(admin.ok); setCanManageEvents(events.ok); }
    }).catch(() => { if (active) { setCanAdminister(false); setCanManageEvents(false); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [mobileMenuOpen]);

  const links = [
    ...getEnabledModules().map(module => ({ href: module.href, label: module.label, icon: icons[module.slug] })),
    ...(canManageEvents ? [{ href: '/painel/admin/climate-events', label: 'Eventos climáticos', icon: <CloudRain size={18} aria-hidden="true" /> }] : []),
    ...(canAdminister ? [{ href: '/painel/admin/shelters', label: 'Abrigos', icon: <Building2 size={18} aria-hidden="true" /> }] : []),
    { href: '/painel/perfil', label: 'Meu perfil', icon: <UserRound size={18} aria-hidden="true" /> },
  ];
  const navigation = <nav aria-label="Navegação do painel" className="flex flex-col gap-2">
    {links.map(link => <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} aria-current={isModuleActive(link.href, pathname) ? 'page' : undefined}
      className={`flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors ${isModuleActive(link.href, pathname) ? 'bg-primary-soft text-primary' : 'text-muted-foreground hover:bg-surface-subtle hover:text-foreground'}`}>
      {link.icon}{link.label}
    </Link>)}
  </nav>;
  const identity = <div className="min-w-0">
    <Link href="/painel" aria-label="Ir para o dashboard do GeoAlerta" className="inline-block max-w-full rounded-md">
      <GeoAlertaLogo className="block h-auto w-40 max-w-full" />
    </Link>
    <p className="mt-1 text-sm text-muted-foreground">Gabinete de Crise Integrado</p>
    <p className="mt-2 text-xs text-muted-foreground"><span className="whitespace-nowrap">Santo Antônio da Patrulha · RS</span></p>
  </div>;
  const phoneList = <section aria-label="Contatos de plantão" className="mt-auto border-t pt-5">
    <h2 className="mb-3 text-sm font-medium text-foreground">Plantão</h2>
    <div className="space-y-1">{contacts.map(contact => <a key={contact.href} href={contact.href} className="flex min-h-10 items-center justify-between gap-2 rounded-md py-2 text-sm text-muted-foreground hover:text-primary">
      <span>{contact.name}</span><span className="shrink-0 tabular-nums text-foreground">{contact.number}</span>
    </a>)}</div>
  </section>;

  return <div className="flex h-dvh overflow-hidden bg-background text-foreground">
    <a href="#panel-content" className="skip-link">Pular para o conteúdo</a>
    <aside className="hidden w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-surface p-5 lg:flex">
      {identity}{navigation}{phoneList}
    </aside>
    <dialog ref={dialog} aria-labelledby="mobile-nav-title" onCancel={() => setMobileMenuOpen(false)} onClose={() => setMobileMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMobileMenuOpen(false); }}
      className="mobile-navigation fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground">
      <div className="flex h-full w-[min(85vw,320px)] flex-col gap-6 overflow-y-auto bg-surface p-5">
        <div className="flex items-start justify-between gap-2"><div id="mobile-nav-title">{identity}</div><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu" className="btn btn-text shrink-0 px-3"><X size={20} aria-hidden="true" /></button></div>
        {navigation}<ThemeSelect />{phoneList}
      </div>
    </dialog>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="relative z-20 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b bg-surface px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Abrir Menu" aria-haspopup="dialog" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className="btn btn-secondary shrink-0 px-3 lg:hidden"><Menu size={20} aria-hidden="true" /></button>
          <div className="min-w-0"><p className="text-sm font-medium">Central de Operações</p><p className="hidden text-sm text-muted-foreground sm:block">Prefeitura de Santo Antônio da Patrulha</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-4"><div className="hidden md:block"><ThemeSelect /></div><CoreNotifications /></div>
      </header>
      <div id="panel-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</div>
      <nav aria-label="Navegação rápida" className="fixed inset-x-0 bottom-0 z-20 flex min-h-16 justify-around border-t bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {getEnabledModules().map(module => <Link key={module.slug} href={module.href} aria-current={isModuleActive(module.href, pathname) ? 'page' : undefined} className={`flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-medium ${isModuleActive(module.href, pathname) ? 'text-primary' : 'text-muted-foreground'}`}>{icons[module.slug]}<span>{module.label}</span></Link>)}
      </nav>
    </div>
  </div>;
}
