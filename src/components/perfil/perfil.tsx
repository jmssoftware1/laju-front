import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/alerts/ToastContext";
import { OperadorService } from "../../service/operador.service";
import { api } from "../../utils/axios";
import "./perfil.css";

interface MovimentacaoPerfil {
  id_movimento: number;
  ingrediente_nome: string;
  unidade: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  data_movimento: string;
  observacao?: string;
}

// function formatarData(raw: string): string {
//   if (!raw) return "—";

//   // Usamos o new Date() igual à sua página de adicionar para o JavaScript calcular o fuso horário do seu PC automaticamente
//   const d = new Date(raw);
  
//   // Formata a data (DD/MM/AAAA)
//   const data = d.toLocaleDateString("pt-PT", { 
//     day: "2-digit", 
//     month: "2-digit", 
//     year: "numeric" 
//   });
  
//   // Formata a hora (HH:MM) exatamente igual à sua função formatarHora
//   const hora = d.toLocaleTimeString("pt-PT", { 
//     hour: "2-digit", 
//     minute: "2-digit" 
//   });
  
//   return `${data}  ${hora}`;
// }

// Redimensiona e corta a imagem para 200×200 JPEG base64
function processarFoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, 200, 200);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const Perfil: React.FC = () => {
  const { operador, logout, updateOperador } = useAuth();
  const { toast, confirm } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const [nome, setNome] = useState(operador?.nome ?? "");
  const [cargo, setCargo] = useState(operador?.cargo ?? "");
  const [foto, setFoto] = useState(operador?.foto ?? "");
  const [salvando, setSalvando] = useState(false);
  const [movs, setMovs] = useState<MovimentacaoPerfil[]>([]);
  const [carregandoMovs, setCarregandoMovs] = useState(true);

  useEffect(() => {
    if (!operador?.nome) return;
    api.get(`/movimentos-ingredientes?operador=${encodeURIComponent(operador.nome)}&limite=20`)
      .then(({ data }) => setMovs(data))
      .catch(() => {})
      .finally(() => setCarregandoMovs(false));
  }, [operador?.nome]);

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await processarFoto(file);
      setFoto(base64);
    } catch {
      toast.error("Erro ao processar a imagem.");
    }
  };

  const handleRemoverFoto = async () => {
    const ok = await confirm("Remover a foto de perfil?");
    if (ok) setFoto("");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operador?.id_operador) return;
    setSalvando(true);
    try {
      const atualizado = await OperadorService.atualizarPerfil(
        operador.id_operador,
        {
          nome: nome.trim(),
          cargo: cargo.trim() || undefined,
          foto: foto || undefined,
        },
      );
      updateOperador(atualizado);
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao guardar perfil. Verifica o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const inicial = nome?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="perfil-container">
       <header>
        <Link to="/adicionar">
          <span className="material-symbols-outlined">add_box</span>
          <span>Adicionar</span>
        </Link>
        <Link to="/inventario">
          <span className="material-symbols-outlined">inventory_2</span>
          <span>Inventário</span>
        </Link>
        <Link to="/dashboard">
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </Link>
        <Link
          to="/admin"
          className={location.pathname === "/admin" ? "active" : ""}
        >
          <span className="material-symbols-outlined">admin_panel_settings</span>
          <span>Admin</span>
        </Link>
        <Link to="/perfil">
          <span className="material-symbols-outlined">account_circle</span>
          <span>Perfil</span>
        </Link>
        <button className="logout" onClick={logout}>
          <span className="material-symbols-outlined">logout</span>
          <span>Sair</span>
        </button>
      </header>

      <main className="perfil-main">
        <form onSubmit={handleSalvar}>
          {/* ── Avatar ────────────────────────────────────────────── */}
          <div className="perfil-avatar-section">
            <div
              className="perfil-avatar"
              onClick={() => fileRef.current?.click()}
            >
              {foto ? (
                <img
                  src={foto}
                  alt="Foto de perfil"
                  className="perfil-avatar__img"
                />
              ) : (
                <span className="perfil-avatar__inicial">{inicial}</span>
              )}
              <div className="perfil-avatar__overlay">
                <span className="material-symbols-outlined">photo_camera</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFoto}
            />

            <div className="perfil-foto-actions">
              <button
                type="button"
                className="perfil-foto-btn"
                onClick={() => fileRef.current?.click()}
              >
                <span className="material-symbols-outlined">upload</span>
                {foto ? "Trocar foto" : "Adicionar foto"}
              </button>
              {foto && (
                <button
                  type="button"
                  className="perfil-foto-btn perfil-foto-btn--remove"
                  onClick={handleRemoverFoto}
                >
                  <span className="material-symbols-outlined">delete</span>
                  Remover
                </button>
              )}
            </div>
          </div>

          {/* ── Informação do operador ────────────────────────────── */}
          <div className="perfil-card">
            <div className="perfil-card__title">
              <span className="material-symbols-outlined">person</span>
              Informações
            </div>

            <div className="perfil-field">
              <label htmlFor="p-nome">Nome</label>
              <input
                id="p-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="O teu nome ou matrícula"
                required
              />
            </div>

            <div className="perfil-field">
              <label htmlFor="p-cargo">Cargo na empresa</label>
              <input
                id="p-cargo"
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ex: Operador de Armazém"
              />
            </div>

            <div className="perfil-field">
              <label>ID do operador</label>
              <input
                type="text"
                value={`#${operador?.id_operador ?? "—"}`}
                readOnly
                className="perfil-input--readonly"
              />
            </div>
          </div>

          {/* ── Guardar ───────────────────────────────────────────── */}
          <button type="submit" className="perfil-save-btn" disabled={salvando}>
            <span className="material-symbols-outlined">save</span>
            {salvando ? "A guardar..." : "Guardar alterações"}
          </button>
        </form>

        {/* ── Minhas movimentações ────────────────────────────────── */}
        <div className="perfil-card" style={{ marginTop: 20 }}>
          <div className="perfil-card__title">
            <span className="material-symbols-outlined">history</span>
            Minhas movimentações
          </div>

          {carregandoMovs && (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>A carregar...</p>
          )}

          {!carregandoMovs && movs.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Nenhuma movimentação registada ainda.
            </p>
          )}

          {movs.map((m) => (
            <div key={m.id_movimento} className="perfil-mov-item">
              <div
                className="perfil-mov-bar"
                style={{ background: m.tipo === "ENTRADA" ? "var(--success)" : "var(--danger)" }}
              />
              <div className="perfil-mov-info">
                <span className="perfil-mov-nome">{m.ingrediente_nome}</span>
                <div className="perfil-mov-meta">
                  <span
                    style={{ color: m.tipo === "ENTRADA" ? "var(--success)" : "var(--danger)", fontWeight: "bold", fontSize: 11 }}
                  >
                    {m.tipo === "ENTRADA" ? "▲" : "▼"} {m.quantidade} {m.unidade}
                  </span>
                  {/* <span className="perfil-mov-hora">{formatarData(m.data_movimento)}</span> */}
                  {m.observacao && (
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>— {m.observacao}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Perfil;
