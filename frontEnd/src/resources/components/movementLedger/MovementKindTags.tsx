import type { MovementKind } from "../../types/types";

type MovementType = "input" | "output";

interface MovementKindTagsProps {
  type: MovementType;
  kind?: MovementKind;
  // Estorno: id da movimentação (do tipo oposto) que esta desfaz.
  reversesId?: number | null;
  // Regular estornada: id da movimentação que a estornou.
  reversedById?: number | null;
}

const oppositeLabel = (type: MovementType) => (type === "input" ? "saída" : "entrada");

// Tipo da movimentação no histórico: comum (sem etiqueta), estorno, ajuste ou já estornada.
export default function MovementKindTags({ type, kind = "regular", reversesId, reversedById }: MovementKindTagsProps) {
  if (kind === "reversal") {
    return <span className="tag tag-info">Estorno{reversesId ? ` da ${oppositeLabel(type)} #${reversesId}` : ""}</span>;
  }
  if (kind === "adjustment") {
    return <span className="tag tag-neutral">Ajuste de inventário</span>;
  }
  if (reversedById) {
    return <span className="tag tag-warning">Estornada pela {oppositeLabel(type)} #{reversedById}</span>;
  }
  return null;
}

// Nome do tipo para exportação e textos.
export function movementKindLabel(type: MovementType, kind: MovementKind = "regular") {
  if (kind === "reversal") return `Estorno (${type === "input" ? "entrada" : "saída"})`;
  if (kind === "adjustment") return `Ajuste de inventário (${type === "input" ? "+" : "−"})`;
  return type === "input" ? "Entrada" : "Saída";
}

// Só movimentações comuns, ainda não estornadas, podem ser estornadas.
export const canReverse = (kind: MovementKind | undefined, reversedById?: number | null) =>
  (kind ?? "regular") === "regular" && !reversedById;
