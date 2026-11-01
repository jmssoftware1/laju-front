import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/alerts/ToastContext";
import { api } from "../../utils/axios";
import "./Auth.css";

// ── senha boxes ──────────────────────────────────────────────────────────────
// ── Componente principal ───────────────────────────────────────────────────
const Login: React.FC = () => {
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const { login, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/lajustore");
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (pin.length < 10) {
      setErro("Informe a senha (mínimo de 10 caracteres).");
      return;
    }
    setCarregando(true);
    try {
      const { data } = await api.post("/api/auth/login", { nome: nome.trim(), senha: pin });
      sessionStorage.setItem("@LajuStore:token", data.token);
      login(data.operador);
      toast.success(`Bem-vindo, ${data.operador.nome}!`);
      navigate("/lajustore");
    } catch (error: any) {
      setSenha("");
      setErro(
        error.response?.data?.mensagem || "Erro ao conectar com o servidor.",
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="material-symbols-outlined">inventory</span>
        </div>
        <h1 className="auth-title">LajuStore</h1>
        <p className="auth-subtitle">Identifica-te para começar</p>

        <form onSubmit={handleLogin} style={{ width: "100%" }}>
          <div className="auth-field">
            <label htmlFor="input-nome">Nome do Operador</label>
            <input
              id="input-nome"
              type="text"
              placeholder="Ex: João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={carregando}
              required
            />
          </div>

          <p className="pin-label">senha de acesso</p>
          <input type="password" autoComplete="current-password" minLength={10} value={pin} onChange={e => setPin(e.target.value)} disabled={carregando} required />

          {erro && <div className="auth-erro">{erro}</div>}

          <button
            type="submit"
            className="auth-btn"
            disabled={carregando || pin.length < 10}
          >
            {carregando ? "A verificar..." : "Entrar no Sistema"}
          </button>
          <button
            type="button"
            className="auth-btn-sec"
            onClick={() => navigate("/cadastro")}
            disabled={carregando}
          >
            Criar nova conta
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;