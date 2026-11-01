import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/alerts/ToastContext";
import { IngredienteService } from "../../service/ingrediente.service";
import type { Ingrediente } from "../../types";
import "./Adicionar.css";

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Modo = "adicionar" | "retirar";

interface EntradaSessao {
  nome: string;
  quantidade: number;
  unidade: string;
  hora: string;
  tipo: Modo;
}

const Adicionar: React.FC = () => {
  const { operador, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const isGestor = operador?.role === "gestor";

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const STORAGE_KEY = `@StockApp:entradas:${operador?.id_operador}`;

  const [entradasSessao, setEntradasSessao] = useState<EntradaSessao[]>(() => {
    try {
      const salvo = localStorage.getItem(`@StockApp:entradas:${operador?.id_operador}`);
      return salvo ? JSON.parse(salvo) : [];
    } catch { return []; }
  });

  const [modo, setModo] = useState<Modo>("adicionar");

  const [selecionado, setSelecionado] = useState<Ingrediente | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    IngredienteService.listarTodos()
      .then(setIngredientes)
      .catch(() => toast.error("Erro ao carregar ingredientes."))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ingredientes;
    return ingredientes.filter(
      (i) =>
        i.nome.toLowerCase().includes(termo) ||
        (i.categoria_nome ?? "").toLowerCase().includes(termo),
    );
  }, [busca, ingredientes]);

  const porCategoria = filtrados.reduce<Record<string, Ingrediente[]>>(
    (acc, i) => {
      const cat = i.categoria_nome ?? "Sem categoria";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(i);
      return acc;
    },
    {},
  );

  const abrirModal = (item: Ingrediente) => {
    setSelecionado(item);
    setQuantidade(1);
    setObservacao("");
  };

  const fecharModal = () => setSelecionado(null);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selecionado || !operador || quantidade <= 0) return;

    if (
      modo === "retirar" &&
      quantidade > Number(selecionado.quantidade_atual)
    ) {
      toast.warning("Estoque insuficiente para retirar.");
      return;
    }

    setSalvando(true);
    try {
      const atualizado =
        modo === "adicionar"
          ? await IngredienteService.adicionar(
              selecionado.id_ingrediente,
              quantidade,
              operador.nome,
              observacao || undefined,
            )
          : await IngredienteService.retirar(
              selecionado.id_ingrediente,
              quantidade,
              operador.nome,
              observacao || undefined,
            );
      setIngredientes((prev) =>
        prev.map((i) =>
          i.id_ingrediente === atualizado.id_ingrediente
            ? { ...i, ...atualizado }
            : i,
        ),
      );
      const novaEntrada: EntradaSessao = {
        nome: selecionado.nome,
        quantidade,
        unidade: selecionado.unidade,
        hora: formatarHora(new Date().toISOString()),
        tipo: modo,
      };
      setEntradasSessao((prev) => {
        const novo = [novaEntrada, ...prev].slice(0, 10);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(novo)); } catch {}
        return novo;
      });
      toast.success(
        modo === "adicionar"
          ? `${quantidade} ${selecionado.unidade} de ${selecionado.nome} adicionado!`
          : `${quantidade} ${selecionado.unidade} de ${selecionado.nome} retirado!`,
      );
      fecharModal();
    } catch (err: any) {
      toast.error(
        err.response?.data?.mensagem ??
          (modo === "adicionar" ? "Erro ao adicionar." : "Erro ao retirar."),
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="adicionar-container">
      <header>
        <Link
          to="/adicionar"
          className={location.pathname === "/adicionar" ? "active" : ""}
        >
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
        {isGestor && (
          <Link to="/admin">
            <span className="material-symbols-outlined">
              admin_panel_settings
            </span>
            <span>Admin</span>
          </Link>
        )}
        <Link to="/perfil">
          <span className="material-symbols-outlined">account_circle</span>
          <span>Perfil</span>
        </Link>
        <button className="logout" onClick={logout}>
          <span className="material-symbols-outlined">logout</span>
          <span>Sair</span>
        </button>
      </header>

      <main>
        {/* ── Topo da página ── */}
        <div className="add-top">
          <div>
            <h2>Adicionar / Retirar</h2>
            <p className="add-sub">Movimentação de estoque</p>
          </div>
          <div className="add-top__acoes">
            {operador?.foto ? (
              <img
                src={operador.foto}
                alt={operador.nome}
                className="add-avatar"
              />
            ) : (
              <div className="add-avatar add-avatar--initial">
                {operador?.nome?.charAt(0).toUpperCase()}
              </div>
            )}
            <a href="#historico" className="btn-historico">
              <span className="material-symbols-outlined">history</span>
              Histórico
            </a>
          </div>
        </div>

        <div className="add-painel">
          {/* ── Ingrediente ── */}
          <section className="add-secao">
            <p className="add-secao__titulo">Ingrediente</p>

            <div className="add-search">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Procurar ingrediente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {busca && (
                <button className="add-search__clear" onClick={() => setBusca("")}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {carregando && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>A carregar...</p>
            )}

            {!carregando && filtrados.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
                Nenhum ingrediente encontrado.
              </p>
            )}

            {!carregando &&
              filtrados.length > 0 &&
              Object.entries(porCategoria).map(([categoria, itens]) => (
                <div className="add-categoria" key={categoria}>
                  <p className="add-categoria__titulo">{categoria}</p>
                  {itens.map((item) => (
                    <button
                      key={item.id_ingrediente}
                      type="button"
                      className="add-item"
                      onClick={() => abrirModal(item)}
                    >
                      <span className="add-item__info">
                        <span className="add-item__nome">{item.nome}</span>
                        <span className="add-item__atual">
                          Estoque atual: <strong>{item.quantidade_atual} {item.unidade}</strong>
                        </span>
                      </span>
                      <span className="material-symbols-outlined add-item__chevron">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </div>
              ))}
          </section>

          {/* ── Formulário de movimentação (aparece após escolher o ingrediente) ── */}
          {selecionado && (
            <dialog
              open
              className={`add-dialog ${modo === "retirar" ? "add-dialog--retirar" : ""}`}
            >
              <form onSubmit={handleConfirmar}>
                <div className="add-dialog__ingrediente">
                  <span className="add-dialog__nome">{selecionado.nome}</span>
                  <button
                    type="button"
                    className="add-dialog__trocar"
                    onClick={fecharModal}
                    disabled={salvando}
                  >
                    <span className="material-symbols-outlined">sync_alt</span>
                    Trocar
                  </button>
                </div>

                {/* ── Tipo de movimentação ── */}
                <section className="add-secao">
                  <p className="add-secao__titulo">Tipo de movimentação</p>
                  <div className="add-modo-toggle">
                    <button
                      type="button"
                      className={`add-modo-btn ${modo === "adicionar" ? "add-modo-btn--ativo" : ""}`}
                      onClick={() => setModo("adicionar")}
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      <span className="add-modo-btn__texto">
                        <strong>Adicionar</strong>
                        <small>Entrada de estoque</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`add-modo-btn add-modo-btn--retirar ${modo === "retirar" ? "add-modo-btn--ativo" : ""}`}
                      onClick={() => setModo("retirar")}
                    >
                      <span className="material-symbols-outlined">remove_circle</span>
                      <span className="add-modo-btn__texto">
                        <strong>Retirar</strong>
                        <small>Saída de estoque</small>
                      </span>
                    </button>
                  </div>
                </section>

                {/* ── Quantidade ── */}
                <section className="add-secao">
                  <p className="add-secao__titulo">
                    {modo === "adicionar"
                      ? "Quantidade recebida"
                      : "Quantidade a retirar"}
                  </p>
                  <div className="add-qtd-input">
                    <input
                      type="number"
                      min={0.01}
                      max={
                        modo === "retirar"
                          ? selecionado.quantidade_atual
                          : undefined
                      }
                      step="any"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Number(e.target.value))}
                      autoFocus
                      required
                    />
                    <span className="add-qtd-unidade">{selecionado.unidade}</span>
                  </div>
                </section>

                {/* ── Estoque atual → após movimentação ── */}
                <section className="add-preview">
                  <div className="add-preview__col">
                    <span className="add-preview__label">Estoque atual</span>
                    <strong className="add-preview__valor">
                      {selecionado.quantidade_atual} {selecionado.unidade}
                    </strong>
                  </div>
                  <span className="material-symbols-outlined add-preview__seta">
                    arrow_forward
                  </span>
                  <div className="add-preview__col">
                    <span className="add-preview__label">Após movimentação</span>
                    <strong
                      className="add-preview__valor"
                      style={{
                        color:
                          modo === "adicionar" ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {modo === "adicionar"
                        ? Number(selecionado.quantidade_atual) + (quantidade || 0)
                        : Number(selecionado.quantidade_atual) - (quantidade || 0)}{" "}
                      {selecionado.unidade}
                    </strong>
                  </div>
                </section>

                {/* ── Observação ── */}
                <div className="modal-input-wrapper">
                  <label>
                    {modo === "adicionar"
                      ? "Observação (opcional):"
                      : "Motivo da retirada (opcional):"}
                  </label>
                  <input
                    type="text"
                    value={observacao}
                    placeholder={
                      modo === "adicionar"
                        ? "Ex: Fornecedor X, lote 23"
                        : "Ex: Perda, uso interno, produção"
                    }
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>

                <div className="add-acoes-principais add-acoes-principais--compacta">
                  <button
                    type="submit"
                    className={`btn-compacto ${modo === "retirar" ? "btn-compacto--retirar" : ""}`}
                    disabled={salvando || quantidade <= 0}
                  >
                    {salvando
                      ? "A guardar..."
                      : modo === "adicionar"
                        ? "Confirmar movimento"
                        : "Confirmar retirada"}
                  </button>
                </div>
              </form>
            </dialog>
          )}
        </div>

        {/* ── Últimas entradas desta sessão ── */}
        {entradasSessao.length > 0 && (
          <div className="add-recentes" id="historico">
            <div className="add-recentes__header">
              <p className="add-recentes__label">Movimentado agora</p>
              <button
                className="add-recentes__limpar"
                onClick={() => {
                  setEntradasSessao([]);
                  try { localStorage.removeItem(STORAGE_KEY); } catch {}
                }}
              >
                <span className="material-symbols-outlined">delete_sweep</span>
                Limpar
              </button>
            </div>
            {entradasSessao.map((e, i) => (
              <div key={i} className="add-recente-item">
                <span
                  className={`material-symbols-outlined add-recente-icon ${
                    e.tipo === "retirar" ? "add-recente-icon--saida" : ""
                  }`}
                >
                  {e.tipo === "adicionar" ? "check_circle" : "remove_circle"}
                </span>
                <div className="add-recente-info">
                  <span className="add-recente-nome">{e.nome}</span>
                  <span
                    className={`add-recente-qtd ${
                      e.tipo === "retirar" ? "add-recente-qtd--saida" : ""
                    }`}
                  >
                    {e.tipo === "adicionar" ? "+" : "-"}
                    {e.quantidade} {e.unidade}
                  </span>
                </div>
                <span className="add-recente-hora">{e.hora}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Adicionar;
