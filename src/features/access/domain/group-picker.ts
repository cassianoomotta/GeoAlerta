export function groupPickerValue(selectedNames: string[]): string {
  if (selectedNames.length === 0) return 'Selecione grupos';
  if (selectedNames.length === 1) return selectedNames[0];
  return `${selectedNames.length} grupos selecionados`;
}
