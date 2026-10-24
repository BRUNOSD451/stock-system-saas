import "../style/company.css";
import { Link, Navigate } from "react-router-dom";
import { Building2, Check, Info, Upload } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import getUserData from "../../../services/getUserData";
import { useCompanyScreen, type CompanyForm } from "../services/useCompanyScreen";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const formatDate = (value?: string | null) => (value ? dateFormat.format(new Date(value)) : "");

export default function CompanyScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const {
    company, form, errors, requestError, loadError, isLoading, isSaving, isDirty, justSaved,
    currentLogo, hasLogo, planLabel, statusLabel, trialDaysLeft,
    updateField, chooseLogo, clearLogo, discardChanges, handleSubmit, retry,
  } = useCompanyScreen();

  const user = getUserData();
  if (!user || !localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user.userPosition !== "administrador") return <Navigate to="/home" replace />;

  const field = (name: keyof CompanyForm, label: string, hint: string | null, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="company-field">
      <label htmlFor={`company-${name}`}>{label}</label>
      <input
        id={`company-${name}`}
        value={form[name]}
        onChange={(event) => updateField(name, event.target.value)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `company-${name}-error` : hint ? `company-${name}-hint` : undefined}
        {...props}
      />
      {errors[name]
        ? <span id={`company-${name}-error`} className="field-error">{errors[name]}</span>
        : hint && <span id={`company-${name}-hint`} className="company-hint">{hint}</span>}
    </div>
  );

  return (
    <div className="app-layout">
      <LateralBar />
      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Empresa</h1>
              <p className="page-subtitle">Dados da sua empresa e preferências do estoque.</p>
            </div>
          </header>

          {isLoading ? <EmptyState isLoading framed title="Carregando dados da empresa…" />
            : loadError || !company ? (
              <div role="alert">
                <EmptyState framed title="Não foi possível carregar os dados da empresa">
                  <p>{loadError || "Tente novamente em instantes."}</p>
                  <button type="button" className="btn btn-secondary" onClick={retry}>Tentar novamente</button>
                </EmptyState>
              </div>
            ) : (
              <div className="company-layout">
                <form className="company-form" onSubmit={handleSubmit} noValidate>
                  {requestError && <div className="company-alert" role="alert"><Info size={16} aria-hidden />{requestError}</div>}

                  <section className="company-section" aria-labelledby="company-identity-title">
                    <h2 id="company-identity-title">Identificação</h2>

                    <div className="company-logo-field">
                      <div className="company-logo-preview">
                        {currentLogo ? <img src={currentLogo} alt="Logo da empresa" /> : <Building2 size={28} strokeWidth={1.5} aria-hidden />}
                      </div>
                      <div className="company-logo-body">
                        <p className="company-field-label">Logo</p>
                        <p className="company-hint">Imagem de até 5 MB. Aparece ao lado do nome da empresa no menu.</p>
                        <div className="company-logo-actions">
                          <label className="btn btn-secondary btn-sm company-logo-upload">
                            <Upload size={14} aria-hidden /> {hasLogo ? "Trocar logo" : "Enviar logo"}
                            <input className="sr-only" type="file" accept="image/*" onChange={(event) => { chooseLogo(event.target.files?.[0] ?? null); event.target.value = ""; }} />
                          </label>
                          {hasLogo && <button type="button" className="btn btn-ghost btn-sm" onClick={clearLogo}>Remover</button>}
                        </div>
                        {errors.logo && <span className="field-error" role="alert">{errors.logo}</span>}
                      </div>
                    </div>

                    {field("name", "Nome da empresa", null, { autoComplete: "organization" })}
                    {field("email", "E-mail de contato", "Usado para avisos da conta e cobrança.", { type: "email", autoComplete: "email", inputMode: "email" })}
                  </section>

                  <section className="company-section" aria-labelledby="company-stock-title">
                    <h2 id="company-stock-title">Estoque</h2>
                    {field("lowStockThreshold", "Limite de estoque baixo",
                      "Produtos com menos unidades que este número aparecem como estoque baixo e geram aviso para administradores e supervisores.",
                      { type: "number", min: 0, max: 1000000, step: 1, inputMode: "numeric", className: "company-input-short" })}
                  </section>

                  <div className="company-actions">
                    {justSaved && !isDirty && <p className="company-saved" role="status"><Check size={16} strokeWidth={2.4} aria-hidden /> Alterações salvas.</p>}
                    {isDirty && <button type="button" className="btn btn-ghost" onClick={discardChanges} disabled={isSaving}>Descartar</button>}
                    <button type="submit" className="btn btn-primary" disabled={!isDirty || isSaving}>
                      {isSaving && <span className="btn-spinner" aria-hidden="true" />}
                      {isSaving ? "Salvando…" : "Salvar alterações"}
                    </button>
                  </div>
                </form>

                {/* Somente leitura: a assinatura é feita na tela Assinatura. */}
                <aside className="company-plan" aria-labelledby="company-plan-title">
                  <h2 id="company-plan-title">Plano</h2>
                  <div className="company-plan-head">
                    <p className="company-plan-name">{planLabel}</p>
                    <span className={`tag company-status is-${company.status}`}>{statusLabel}</span>
                  </div>
                  <dl className="company-plan-facts">
                    {trialDaysLeft !== null && (
                      <div>
                        <dt>Teste grátis</dt>
                        <dd>{trialDaysLeft === 0 ? "Termina hoje" : `${trialDaysLeft} ${trialDaysLeft === 1 ? "dia restante" : "dias restantes"}`}<small>até {formatDate(company.trialEndsAt)}</small></dd>
                      </div>
                    )}
                    {company.plan === "pro" && company.currentPeriodEnd && (
                      <div><dt>{company.periodEnded ? "Venceu em" : "Válido até"}</dt><dd>{formatDate(company.currentPeriodEnd)}</dd></div>
                    )}
                    {company.createdAt && <div><dt>Cliente desde</dt><dd>{formatDate(company.createdAt)}</dd></div>}
                  </dl>
                  {company.plan === "pro" && company.status === "active" && !company.periodEnded
                    ? <Link to="/assinatura" className="btn btn-secondary">Ver assinatura</Link>
                    : <Link to="/assinatura" className="btn btn-primary">Assinar o Pro</Link>}
                </aside>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
