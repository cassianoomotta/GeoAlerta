'use client';

import { useId } from 'react';
import { isThemePreference } from './theme';
import { setThemePreference, useThemePreference } from './theme-provider';

export function ThemeSelect() {
  const id = useId();
  const preference = useThemePreference();
  return <div className="flex flex-wrap items-center gap-3">
    <label htmlFor={id} className="text-sm font-medium">Aparência</label>
    <select id={id} className="form-select w-auto min-w-32" value={preference} onChange={(event) => {
      if (isThemePreference(event.target.value)) setThemePreference(event.target.value);
    }}>
      <option value="light">Claro</option>
      <option value="dark">Escuro</option>
      <option value="system">Sistema</option>
    </select>
  </div>;
}
