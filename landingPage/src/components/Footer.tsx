import Brand from "./Brand";
import { LINKS } from "../config";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div>
          <Brand />
          <p className="site-footer-text">Controle de estoque para pequenas empresas.</p>
        </div>
        <nav className="site-footer-nav" aria-label="Rodapé">
          <a href="#recursos">Recursos</a>
          <a href="#preco">Preço</a>
          <a href="#duvidas">Dúvidas</a>
          <a href={LINKS.login}>Entrar</a>
          <a href={LINKS.signup}>Criar conta</a>
        </nav>
      </div>
      <div className="container site-footer-bottom">
        <p>© {new Date().getFullYear()} StockControl</p>
      </div>
    </footer>
  );
}
