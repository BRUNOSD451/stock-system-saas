import { Check } from "lucide-react";
import ScreenFrame from "./ScreenFrame";
import saida from "../assets/screens/saida.png";
import reposicao from "../assets/screens/reposicao.png";
import produtos from "../assets/screens/produtos.png";

const FEATURES = [
  {
    title: "Entradas e saídas em poucos cliques",
    text: "Registre vários produtos numa mesma movimentação, com uma observação para a nota fiscal ou o pedido.",
    points: [
      "O saldo é conferido antes de gravar: se faltar estoque de um item, nada é registrado pela metade",
      "Duas pessoas registrando ao mesmo tempo não deixam o saldo negativo",
      "Histórico completo, com os produtos de cada movimentação",
    ],
    image: saida,
    kind: "component" as const,
    alt: "Formulário de nova saída de estoque com dois produtos incluídos, as quantidades retiradas e a observação do pedido.",
  },
  {
    title: "Saiba o que repor antes de faltar",
    text: "Você define o limite de estoque baixo da empresa. O que está abaixo dele aparece logo na tela inicial, do menor saldo para o maior.",
    points: [
      "Produtos zerados aparecem como sem estoque",
      "Administradores e supervisores recebem um aviso a cada movimentação",
      "A lista se atualiza assim que uma entrada ou saída é registrada",
    ],
    image: reposicao,
    kind: "component" as const,
    alt: "Painel Precisa de reposição listando uma enxada sem estoque e uma semente de milho com 3 unidades, abaixo do limite de 10.",
  },
  {
    title: "Catálogo organizado e fácil de consultar",
    text: "Produtos com foto, categoria, fornecedor, preço e quantidade, numa tabela que também funciona no celular.",
    points: [
      "Busca por nome ou descrição",
      "Filtros por categoria, fornecedor e situação do estoque",
      "Ordenação por nome, estoque ou preço",
    ],
    image: produtos,
    kind: "browser" as const,
    alt: "Tabela de produtos com filtros de categoria, fornecedor e estoque, preços e quantidades, com etiquetas de estoque baixo e sem estoque.",
  },
];

// Três recursos centrais, cada um com a tela real; o texto alterna de lado para dar ritmo à leitura.
export default function Features() {
  return (
    <section className="section" id="recursos" aria-labelledby="features-title">
      <div className="container">
        <header className="section-head">
          <h2 id="features-title" className="section-title">Do recebimento à reposição, sem planilha.</h2>
          <p className="section-lead">O StockControl acompanha o caminho de cada produto pelo seu estoque e mostra o que pede atenção.</p>
        </header>

        <div className="feature-list">
          {FEATURES.map((feature, index) => (
            <article className={`feature${index % 2 ? " is-reversed" : ""}`} key={feature.title}>
              <div className="feature-copy">
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-text">{feature.text}</p>
                <ul className="check-list">
                  {feature.points.map((point) => <li key={point}><Check size={16} strokeWidth={2.6} aria-hidden />{point}</li>)}
                </ul>
              </div>
              <ScreenFrame src={feature.image} alt={feature.alt} kind={feature.kind} className="feature-shot" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
