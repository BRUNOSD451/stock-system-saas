import type { ReactNode } from "react";
import "./emptyState.css";

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
  isLoading?: boolean;
  framed?: boolean;
}

// Estado vazio ou de carregamento; o texto orienta o próximo passo do usuário.
export default function EmptyState({ title, children, isLoading = false, framed = false }: EmptyStateProps) {
  return (
    <div className={`empty-state${framed ? " is-framed" : ""}`} role={isLoading ? "status" : undefined}>
      {isLoading && <span className="empty-state-spinner" aria-hidden="true" />}
      <p className="empty-state-title">{title}</p>
      {children && <div className="empty-state-body">{children}</div>}
    </div>
  );
}
