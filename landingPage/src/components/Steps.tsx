import { PRICING } from "../config";

// É uma sequência de verdade (conta → cadastro → uso), por isso os passos são numerados.
const STEPS = [
  { title: "Crie a conta da empresa", text: `Nome da empresa, seus dados e uma senha. O teste de ${PRICING.trialDays} dias começa na hora.` },
  { title: "Cadastre o que você vende", text: "Categorias, fornecedores e produtos, já com o saldo que existe hoje no estoque." },
  { title: "Registre o dia a dia", text: "Cada entrada e saída atualiza o estoque sozinha e alimenta o dashboard e a lista de reposição." },
];

export default function Steps() {
  return (
    <section className="section" id="como-funciona" aria-labelledby="steps-title">
      <div className="container">
        <header className="section-head">
          <h2 id="steps-title" className="section-title">Pronto para usar no mesmo dia.</h2>
        </header>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li className="step" key={step.title}>
              <span className="step-number" aria-hidden="true">{index + 1}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
