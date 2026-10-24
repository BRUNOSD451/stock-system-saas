import "../../screenLogin/style/loginStyle.css";
import "../style/signupStyle.css";
import { Link } from "react-router-dom";
import { Box, Eye, EyeOff, Info } from "lucide-react";
import { useSignupScreen, type SignupForm } from "../services/useSignupScreen";

const iconProps = { size: 18, strokeWidth: 1.8, "aria-hidden": true } as const;

export default function SignupScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { form, errors, showPassword, setShowPassword, loading, updateField, handleSubmit } = useSignupScreen();

  const field = (name: keyof SignupForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`signup-${name}`}>{label}</label>
      <input
        id={`signup-${name}`}
        className="form-input"
        value={String(form[name])}
        onChange={(event) => updateField(name, event.target.value)}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `signup-${name}-error` : undefined}
        {...props}
      />
      {errors[name] && <span id={`signup-${name}-error`} className="field-error">{errors[name]}</span>}
    </div>
  );

  const passwordField = (name: "password" | "confirmPassword", label: string, hint?: string) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`signup-${name}`}>{label}</label>
      <div className="input-wrapper">
        <input
          id={`signup-${name}`}
          className="form-input has-toggle"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={form[name]}
          onChange={(event) => updateField(name, event.target.value)}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `signup-${name}-error` : hint ? `signup-${name}-hint` : undefined}
        />
        <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"}>
          {showPassword ? <EyeOff {...iconProps} /> : <Eye {...iconProps} />}
        </button>
      </div>
      {errors[name]
        ? <span id={`signup-${name}-error`} className="field-error">{errors[name]}</span>
        : hint && <span id={`signup-${name}-hint`} className="field-hint">{hint}</span>}
    </div>
  );

  return (
    <div className="login-page">
      <aside className="login-branding">
        <div className="login-brand">
          <span className="login-brand-mark"><Box size={20} strokeWidth={2.2} aria-hidden /></span>
          <span className="login-brand-name">StockControl</span>
        </div>

        <div className="login-branding-copy">
          <h1 className="brand-title">Estoque em ordem desde o dia um.</h1>
          <p className="brand-desc">
            Crie a conta da sua empresa e entre como administrador. Depois é só cadastrar produtos e convidar a equipe.
          </p>
        </div>
      </aside>

      <main className="login-form-panel signup-form-panel">
        <div className="login-card signup-card">
          <div className="login-card-header">
            <h2>Criar conta</h2>
            <p>Leva menos de um minuto.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div className="error-banner" role="alert">
                <Info size={16} strokeWidth={2} aria-hidden />
                {errors.general}
              </div>
            )}

            <fieldset className="signup-section">
              <legend>Empresa</legend>
              {field("companyName", "Nome da empresa", { autoComplete: "organization", autoFocus: true })}
            </fieldset>

            <fieldset className="signup-section">
              <legend>Seu acesso de administrador</legend>
              {field("userName", "Seu nome", { autoComplete: "name" })}
              <div className="signup-row">
                {field("email", "E-mail", { type: "email", autoComplete: "email", inputMode: "email" })}
                {field("cellNumber", "Celular", { inputMode: "numeric", autoComplete: "tel", placeholder: "(99) 99999-9999" })}
              </div>
              {passwordField("password", "Senha", "Mínimo de 8 caracteres.")}
              {passwordField("confirmPassword", "Confirmar senha")}
            </fieldset>

            <div className="form-group">
              <label className="remember-label signup-terms">
                <input
                  id="signup-acceptTerms"
                  type="checkbox"
                  className="remember-checkbox"
                  checked={form.acceptTerms}
                  onChange={(event) => updateField("acceptTerms", event.target.checked)}
                  aria-invalid={!!errors.acceptTerms}
                  aria-describedby={errors.acceptTerms ? "signup-acceptTerms-error" : undefined}
                />
                <span>Li e aceito os termos de uso e a política de privacidade.</span>
              </label>
              {errors.acceptTerms && <span id="signup-acceptTerms-error" className="field-error">{errors.acceptTerms}</span>}
            </div>

            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" aria-hidden="true" />Criando conta…</> : "Criar conta"}
            </button>
          </form>

          <p className="auth-switch">Já tem conta? <Link to="/">Entrar</Link></p>
        </div>
      </main>
    </div>
  );
}
