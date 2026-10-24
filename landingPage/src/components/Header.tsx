import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Brand from "./Brand";
import { LINKS } from "../config";

const NAV = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#preco", label: "Preço" },
  { href: "#duvidas", label: "Dúvidas" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // A barra ganha contorno depois que a página sai do topo.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = () => setIsOpen(false);

  return (
    <header className={`site-header${isScrolled ? " is-scrolled" : ""}${isOpen ? " is-open" : ""}`}>
      <div className="container site-header-inner">
        <a href="#topo" className="site-header-brand" aria-label="StockControl, voltar ao início" onClick={close}><Brand /></a>

        <nav className="site-nav" id="site-nav" aria-label="Seções da página">
          {NAV.map((item) => <a key={item.href} href={item.href} onClick={close}>{item.label}</a>)}
          {/* No celular os botões entram na gaveta, abaixo das seções. */}
          <span className="site-nav-actions">
            <a className="btn btn-outline-dark" href={LINKS.login}>Entrar</a>
            <a className="btn btn-signal" href={LINKS.signup}>Começar grátis</a>
          </span>
        </nav>

        <div className="site-header-actions">
          <a className="btn btn-ghost-dark" href={LINKS.login}>Entrar</a>
          <a className="btn btn-signal" href={LINKS.signup}>Começar grátis</a>
        </div>

        <button type="button" className="site-menu-toggle" aria-expanded={isOpen} aria-controls="site-nav"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </div>
    </header>
  );
}
