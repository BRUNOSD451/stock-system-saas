// Mensagens de erro externas só são exibidas quando há uma mensagem legível.
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// A máscara trabalha em centavos; a conversão para número ocorre somente no envio.
export function formatPriceInput(value: string | number): string {
  const normalized = typeof value === "number" ? value.toFixed(2).replace(".", "") : value;
  const digits = normalized.replace(/\D/g, "");
  return digits ? (Number(digits) / 100).toFixed(2).replace(".", ",") : "";
}

export function parsePriceInput(value: string): number {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

export function dateLabel(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
