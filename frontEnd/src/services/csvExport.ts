// Exportação CSV feita no navegador, a partir dos dados já carregados na tela (respeita os filtros).
// Formato para o Excel em português: separador ";", vírgula decimal e BOM UTF-8 para os acentos.

export type CsvValue = string | number | null | undefined;

// Texto que começa com = + - @ vira fórmula no Excel; o apóstrofo faz a planilha tratá-lo como texto.
function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value).replace(".", ",");
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(";"));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Nome do arquivo com a data de hoje, ex.: produtos-2026-10-22.csv
export const csvFilename = (base: string) => `${base}-${new Date().toLocaleDateString("sv-SE")}.csv`;

export const csvDate = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
