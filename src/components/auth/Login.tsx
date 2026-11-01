import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/alerts/ToastContext";
import { api } from "../../utils/axios";
import "./Auth.css";
import "./AuthV8.css";

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
    if (!nome.trim() || pin.length < 10) {
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
      setPin("");
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
          <img src="/brand/laju-store-logo.jpg" width="106" height="106" alt="Laju Store — logo oficial" />
        </div>
        <div className="auth-eyebrow">BEM-VINDA À SUA LOJA</div>
        <h1 className="auth-title">Acesse a LajuStore</h1>
        <p className="auth-subtitle">Seu estoque, suas vendas, tudo em um só lugar.</p>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label htmlFor="input-nome">Nome de usuário</label>
            <input
              id="input-nome"
              type="text"
              placeholder="Digite seu usuário"
              autoComplete="username"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={carregando}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="input-senha">Senha de acesso</label>
            <input id="input-senha" type="password" autoComplete="current-password" minLength={10}
              placeholder="Digite sua senha" value={pin} onChange={e => setPin(e.target.value)}
              disabled={carregando} required />
          </div>

          {erro && <div className="auth-erro">{erro}</div>}

          <button
            type="submit"
            className="auth-btn"
            disabled={carregando || !nome.trim() || pin.length < 10}
          >
            {carregando ? "Entrando..." : "Entrar na minha loja"}
          </button>
        </form>
        <p className="auth-footnote">Acesso exclusivo para a equipe LajuStore.</p>
      </div>
    </div>
  );
};

export default Login;