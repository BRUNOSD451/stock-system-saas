interface ScreenFrameProps {
  src: string;
  alt: string;
  // "browser": tela inteira numa janela; "phone": captura do celular;
  // "component": um trecho recortado da tela (modal, painel) sobre um fundo claro.
  kind?: "browser" | "phone" | "component";
  priority?: boolean;
  className?: string;
}

// Captura real do sistema dentro de uma moldura simples.
export default function ScreenFrame({ src, alt, kind = "browser", priority = false, className = "" }: ScreenFrameProps) {
  return (
    <figure className={`screen-frame is-${kind} ${className}`.trim()}>
      {kind === "browser" && (
        <span className="screen-frame-bar" aria-hidden="true"><i /><i /><i /></span>
      )}
      <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" />
    </figure>
  );
}
