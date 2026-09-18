// ==============================================================================
// GeoAlerta - Utilitário de Exportação de Planilhas CSV (compatível com Excel PT-BR)
// ==============================================================================

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const csvRows = rows.map((row) =>
    row
      .map((val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(";")
  );

  const csvHeader = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(";");

  // \uFEFF é o BOM UTF-8 que garante acentuação correta no Excel e LibreOffice
  const csvContent = "\uFEFF" + csvHeader + "\n" + csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
