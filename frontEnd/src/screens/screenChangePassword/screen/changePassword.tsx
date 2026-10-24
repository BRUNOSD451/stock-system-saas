import "../../screenLogin/style/loginStyle.css";
import "../style/changePassword.css";
import { Navigate } from "react-router-dom";
import { Box, Eye, EyeOff, Info } from "lucide-react";
import { useChangePasswordScreen } from "../services/useChangePasswordScreen";

const iconProps = { size: 18, strokeWidth: 1.8, "aria-hidden": true } as const;

export default function ChangePasswordScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { user, isFirstAccess, askCurrentPassword, form, errors, showPassword, setShowPassword, loading, updateField, handleSubmit, signOut, minLength } = useChangePasswordScreen();

  if (!user || !localStorage.getItem("token")) return <Navigate to="/" replace />;

  const firstName = user.userName.trim().split(/\s+/)[0];

  const passwordField = (name: "currentPassword" | "newPassword" | "confirmPassword", label: string, hint?: string) => (
    <div className="form-group">
      <label className="form-label" htmlFor={`password-${name}`}>{label}</label>
      <div className="input-wrapper">
        <input
          id={`password-${name}`}
          className="form-input has-toggle"
          type={showPassword ? "text" : "password"}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          value={form[name]}
          onChange={(event) => updateField(name, event.target.value)}
          aria-invalid={!!errors[name]}
          aria-describedby={errors[name] ? `password-${name}-error` : hint ? `password-${name}-hint` : undefined}
        />
        <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"}>
          {showPassword ? <EyeOff {...iconProps} /> : <Eye {...iconProps} />}
        </button>
      </div>
      {errors[name]
        ? <span id={`password-${name}-error`} className="field-error">{errors[name]}</span>
        : hint && <span id={`password-${name}-hint`} className="field-hint">{hint}</span>}
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
          <h1 className="brand-title">{isFirstAccess ? `Boas-vindas, ${firstName}.` : "Nova senha, mesmo estoque."}</h1>
          <p className="brand-desc">
            {isFirstAccess
              ? "Seu acesso foi criado com uma senha provisória. Crie uma senha só sua para começar a usar o sistema."
              : "Escolha uma senha nova. Ela passa a valer no próximo login em qualquer aparelho."}
          </p>
        </div>
      </aside>

      <main className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2>{isFirstAccess ? "Crie sua senha" : "Alterar senha"}</h2>
            <p>{isFirstAccess ? "Você só precisa fazer isso uma vez." : "Confirme a senha atual e escolha a nova."}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div className="error-banner" role="alert">
                <Info size={16} strokeWidth={2} aria-hidden />
                {errors.general}
              </div>
            )}

            {askCurrentPassword && passwordField("currentPassword", isFirstAccess ? "Senha provisória" : "Senha atual")}
            {passwordField("newPassword", "Nova senha", `Mínimo de ${minLength} caracteres.`)}
            {passwordField("confirmPassword", "Confirmar nova senha")}

            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" aria-hidden="true" />Salvando…</> : isFirstAccess ? "Criar senha e entrar" : "Salvar nova senha"}
            </button>
          </form>

          <p className="auth-switch">
            {isFirstAccess ? "Não é você? " : ""}<button type="button" className="auth-switch-button" onClick={signOut}>Sair</button>
          </p>
        </div>
      </main>
    </div>
  );
}
