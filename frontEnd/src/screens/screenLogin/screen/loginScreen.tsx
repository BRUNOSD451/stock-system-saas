
import "../style/loginStyle.css";
import { Link } from "react-router-dom";
import { Box, Eye, EyeOff, Info } from "lucide-react";
import { useLoginScreen } from "../services/useLoginScreen";

export default function LoginScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { iconProps, alertIconProps, form, errors, showPassword, setShowPassword, loading, cellRef, handleCellNumberChange, handleSenhaChange, handleSubmit, handleRememberChange } = useLoginScreen();

  return (
    <div className="login-page">
      {/* Apresentação do sistema, no mesmo grafite da barra lateral. */}
      <aside className="login-branding">
        <div className="login-brand">
          <span className="login-brand-mark"><Box size={20} strokeWidth={2.2} aria-hidden /></span>
          <span className="login-brand-name">StockControl</span>
        </div>

        <div className="login-branding-copy">
          <h1 className="brand-title">Tudo o que entra e sai, registrado.</h1>

          <p className="brand-desc">
            Registre recebimentos e retiradas, acompanhe os produtos que precisam de reposição e mantenha fornecedores e categorias em dia.
          </p>
        </div>
      </aside>

      <main className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Entrar</h2>
            <p>Use o celular e a senha do seu cadastro.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            {errors.general && (
              <div className="error-banner" role="alert">
                <Info {...alertIconProps} />
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="cellNumber">Celular</label>
              <div className="input-wrapper">

                <input
                  ref={cellRef}
                  id="cellNumber"
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="(99) 99999-9999"
                  value={form.cellNumber}
                  onChange={handleCellNumberChange}
                  autoComplete="username"
                  aria-describedby={errors.cellNumber ? "cell-number-error" : undefined}
                  aria-invalid={!!errors.cellNumber}
                />
              </div>
              {errors.cellNumber && (
                <span id="cell-number-error" className="field-error">
                  {errors.cellNumber}
                </span>
              )}
            </div>

            {/* A visibilidade da senha não altera seu valor. */}
            <div className="form-group">
              <label className="form-label" htmlFor="senha">Senha</label>
              <div className="input-wrapper">

                <input
                  id="senha"
                  className="form-input has-toggle"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={form.password}
                  onChange={handleSenhaChange}
                  autoComplete="current-password"
                  aria-describedby={errors.password ? "senha-error" : undefined}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff {...iconProps} /> : <Eye {...iconProps} />}
                </button>
              </div>
              {errors.password && (
                <span id="senha-error" className="field-error">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Lembrar acesso salva apenas o celular. */}
            <div className="form-options">
              <label className="remember-label">
                <input
                  type="checkbox"
                  className="remember-checkbox"
                  checked={form.remember}
                  onChange={(event) => handleRememberChange(event.target.checked)}
                />
                Lembrar meu celular
              </label>

            </div>

            {/* Impede novo envio enquanto a autenticação está em andamento. */}
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className="auth-switch">Ainda não tem conta? <Link to="/signup">Criar conta</Link></p>
        </div>
      </main>
    </div>
  );
}
