import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/alerts/ToastContext";
import { api } from "../../utils/axios";
import "./Auth.css";

const PinInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="pin-wrapper" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
        disabled={disabled}
        className="pin-hidden"
        autoComplete="new-password"
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`pin-box ${i < value.length ? "pin-box--filled" : ""} ${i === value.length ? "pin-box--active" : ""}`}
        >
          {i < value.length && "•"}
        </div>
      ))}
    </div>
  );
};

const Cadastro: React.FC = () => {
  const [nome, setNome] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const pinMatch = pin.length === 4 && pinConfirm.length === 4;

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!/^\d{4}$/.test(pin)) {
      setErro("O PIN deve ter exatamente 4 dígitos.");
      return;
    }
    if (pin !== pinConfirm) {
      setErro("Os PINs não coincidem.");
      return;
    }
    setCarregando(true);
    try {
      await api.post("/operador", { nome: nome.trim(), pin });
      toast.success("Operador registado com sucesso!");
      navigate("/");
    } catch (error: any) {
      setErro(
        error.response?.data?.mensagem || "Erro ao comunicar com o servidor.",
      );
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="material-symbols-outlined">person_add</span>
        </div>
        <h1 className="auth-title">Novo Operador</h1>
        <p className="auth-subtitle">Cria a tua conta de acesso</p>

        <form onSubmit={handleCadastro} style={{ width: "100%" }}>
          <div className="auth-field">
            <label htmlFor="novo-nome">Nome ou Matrícula</label>
            <input
              id="novo-nome"
              type="text"
              placeholder="Ex: João Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={carregando}
              required
            />
          </div>

          <p className="pin-label">Escolhe um PIN de 4 dígitos</p>
          <PinInput value={pin} onChange={setPin} disabled={carregando} />

          <p className="pin-label" style={{ marginTop: 14 }}>
            Confirmar PIN
          </p>
          <PinInput
            value={pinConfirm}
            onChange={setPinConfirm}
            disabled={carregando}
          />

          {pinMatch && (
            <p
              className={`pin-match ${pin === pinConfirm ? "pin-match--ok" : "pin-match--err"}`}
            >
              {pin === pinConfirm ? "✓ PINs coincidem" : "✗ PINs não coincidem"}
            </p>
          )}

          {erro && <div className="auth-erro">{erro}</div>}

          <button
            type="submit"
            className="auth-btn"
            disabled={carregando || pin.length !== 4}
          >
            {carregando ? "A registar..." : "Criar Conta"}
          </button>
          <button
            type="button"
            className="auth-btn-sec"
            onClick={() => navigate("/")}
            disabled={carregando}
          >
            Já tenho conta
          </button>
        </form>
      </div>
    </div>
  );
};

export default Cadastro;
