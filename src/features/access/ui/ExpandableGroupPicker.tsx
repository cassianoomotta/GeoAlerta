'use client';

import { ChevronDown } from 'lucide-react';
import { groupPickerValue } from '../domain/group-picker';

type GroupChoice = { id: string; name: string };

export function ExpandableGroupPicker({
  groups,
  selectedIds,
  onChange,
  label = 'Grupos autorizados',
  disabled = false,
}: {
  groups: GroupChoice[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  disabled?: boolean;
}) {
  const selectedNames = groups.filter((group) => selectedIds.includes(group.id)).map((group) => group.name);
  const selectedValue = groupPickerValue(selectedNames);

  return <div className="min-w-0 space-y-1 text-sm text-foreground">
    <span>{label}</span>
    <details className="relative [&[open]>summary]:mb-0">
      <summary aria-label={`${label}: ${selectedValue}`} aria-disabled={disabled || undefined} onClick={(event) => { if (disabled) event.preventDefault(); }} className="flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded border border-control-border bg-background p-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="truncate">{selectedValue}</span>
        <ChevronDown aria-hidden="true" size={16} className="shrink-0 text-muted-foreground" />
      </summary>
      <fieldset disabled={disabled} className="absolute left-0 right-0 top-full z-30 min-w-0 max-h-56 overflow-y-auto rounded-none border border-control-border bg-surface p-0 text-base text-foreground">
        <legend className="sr-only">{label}</legend>
        {groups.length ? groups.map((group, index) => {
          const highlighted = selectedIds.includes(group.id) || (selectedIds.length === 0 && index === 0);
          return <label key={group.id} className="block cursor-pointer select-none">
          <input type="checkbox" className="peer sr-only" checked={selectedIds.includes(group.id)} onChange={(event) => onChange(event.target.checked ? [...new Set([...selectedIds, group.id])] : selectedIds.filter((id) => id !== group.id))} />
          <span className={`block min-h-8 break-normal px-2 py-1 ${highlighted ? 'bg-[#1769d2] text-white hover:bg-[#1769d2] hover:text-white' : 'bg-surface text-foreground hover:bg-surface-subtle'} peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring`}>{group.name}</span>
          </label>;
        }) : <p className="p-2 text-xs text-muted-foreground">Nenhum grupo municipal cadastrado.</p>}
      </fieldset>
    </details>
  </div>;
}
