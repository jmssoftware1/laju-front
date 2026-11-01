import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/alerts/ToastContext";
import { IngredienteService } from "../../service/ingrediente.service";
import { api } from "../../utils/axios";
import type { Ingrediente, Categoria } from "../../types";
import "./Admin.css";

interface Movimentacao {
  id_movimento: number;
  ingrediente_id: number;
  ingrediente_nome: string;
  unidade: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  operador: string;
  observacao?: string;
  data_movimento: string;
  categoria_nome?: string;
}

interface Operador {
  id_operador: number;
  nome: string;
  cargo?: string | null;
  foto?: string | null;
  role: "funcionario" | "gestor";
  status: "0" | "1";
}

function formatarData(raw: string): string {
  const d = new Date(raw);
  const data = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${data}  ${hora}`;
}

function gerarPDF(movs: Movimentacao[], mes: string): void {
  const totalEntradas = movs.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + Number(m.quantidade), 0);
  const totalSaidas = movs.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + Number(m.quantidade), 0);

  // Agrupa por categoria para exibir separado
  const porCat = movs.reduce<Record<string, Movimentacao[]>>((acc, m) => {
    const cat = m.categoria_nome ?? "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  const [ano, mesNum] = mes.split("-");
  const nomesMes = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const tituloMes = `${nomesMes[Number(mesNum)]} ${ano}`;

  const linhasPorCat = Object.entries(porCat).map(([cat, itens]) => `
    <div class="cat-titulo">${cat}</div>
    <table>
      <thead>
        <tr>
          <th>Data / Hora</th>
          <th>Ingrediente</th>
          <th>Tipo</th>
          <th>Qtd</th>
          <th>Unidade</th>
          <th>Operador</th>
          <th>Observação</th>
        </tr>
      </thead>
      <tbody>
        ${itens.map((m) => `
          <tr>
            <td>${formatarData(m.data_movimento)}</td>
            <td>${m.ingrediente_nome}</td>
            <td class="${m.tipo === "ENTRADA" ? "entrada" : "saida"}">${m.tipo === "ENTRADA" ? "▲ Entrada" : "▼ Saída"}</td>
            <td>${m.quantidade}</td>
            <td>${m.unidade}</td>
            <td>${m.operador}</td>
            <td>${m.observacao ?? "—"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório ${tituloMes}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
    .cabecalho { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 14px; }
    .titulo { font-size: 20px; font-weight: bold; color: #111; }
    .subtitulo { font-size: 13px; color: #555; margin-top: 4px; }
    .resumo { display: flex; gap: 16px; margin-bottom: 24px; }
    .resumo-card { background: #f5f5f5; border-radius: 8px; padding: 10px 18px; text-align: center; }
    .resumo-card .val { font-size: 18px; font-weight: bold; }
    .resumo-card .leg { font-size: 11px; color: #666; margin-top: 2px; }
    .cat-titulo { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 20px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #111827; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; }
    td { padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    .entrada { color: #16a34a; font-weight: bold; }
    .saida   { color: #dc2626; font-weight: bold; }
    .rodape  { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="cabecalho">
    <div>
      <div class="titulo">🍕 StockApp</div>
      <div class="subtitulo">Relatório de Movimentações — ${tituloMes}</div>
    </div>
    <div class="subtitulo">Gerado em: ${new Date().toLocaleString("pt-PT")}</div>
  </div>

  <div class="resumo">
    <div class="resumo-card">
      <div class="val">${movs.length}</div>
      <div class="leg">Total de movimentações</div>
    </div>
    <div class="resumo-card" style="border-top: 3px solid #16a34a">
      <div class="val" style="color:#16a34a">▲ ${totalEntradas.toFixed(1)}</div>
      <div class="leg">Total entradas</div>
    </div>
    <div class="resumo-card" style="border-top: 3px solid #dc2626">
      <div class="val" style="color:#dc2626">▼ ${totalSaidas.toFixed(1)}</div>
      <div class="leg">Total saídas</div>
    </div>
  </div>

  ${linhasPorCat}

  <div class="rodape">StockApp · Relatório gerado automaticamente</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const VAZIO: Omit<
  Ingrediente,
  "id_ingrediente" | "quantidade_atual" | "status" | "categoria_nome"
> = {
  nome: "",
  id_categoria: undefined,
  unidade: "kg",
  estoque_minimo: 0,
  estoque_critico: 0,
  qtd_compra_normal: 0,
  tipo_compra: "mercado",
};

const Admin: React.FC = () => {
  const { operador: operadorLogado, logout } = useAuth();
  const { toast, confirm } = useToast();
  const location = useLocation();

  const [aba, setAba] = useState<"ingredientes" | "movimentacoes" | "usuarios">("ingredientes");
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregandoMov, setCarregandoMov] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [filtroMes, setFiltroMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState<any>({ ...VAZIO });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // ── Usuários ──
  const VAZIO_OP = { nome: "", cargo: "", foto: "", role: "funcionario" as const };
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [carregandoOps, setCarregandoOps] = useState(false);
  const [filtroStatusOp, setFiltroStatusOp] = useState<"ativos" | "inativos" | "todos">("ativos");
  const [formOp, setFormOp] = useState<any>({ ...VAZIO_OP });
  const [editandoOpId, setEditandoOpId] = useState<number | null>(null);
  const [salvandoOp, setSalvandoOp] = useState(false);
  const [modalOpAberto, setModalOpAberto] = useState(false);
  const [opPinAlvo, setOpPinAlvo] = useState<Operador | null>(null);
  const [novoPin, setNovoPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [ings, cats] = await Promise.all([
        IngredienteService.listarTodos(),
        IngredienteService.listarCategorias(),
      ]);
      setIngredientes(ings);
      setCategorias(cats);
    } catch {
      toast.error("Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  const carregarMovimentacoes = useCallback(async (mes: string) => {
    setCarregandoMov(true);
    try {
      const { data } = await api.get(`/movimentos-ingredientes?limite=500&mes=${mes}`);
      setMovimentacoes(data);
    } catch {
      toast.error("Erro ao carregar movimentações.");
    } finally {
      setCarregandoMov(false);
    }
  }, [toast]);

  const carregarOperadores = useCallback(async () => {
    setCarregandoOps(true);
    try {
      const { data } = await api.get("/operadores");
      setOperadores(data);
    } catch {
      toast.error("Erro ao carregar usuários.");
    } finally {
      setCarregandoOps(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (aba === "movimentacoes") carregarMovimentacoes(filtroMes);
  }, [aba, filtroMes]);

  useEffect(() => {
    if (aba === "usuarios") carregarOperadores();
  }, [aba, carregarOperadores]);

  const abrirNovo = () => {
    setForm({ ...VAZIO });
    setEditandoId(null);
    setModalAberto(true);
  };

  const abrirEditar = (i: Ingrediente) => {
    setForm({
      nome: i.nome,
      id_categoria: i.id_categoria,
      unidade: i.unidade,
      estoque_minimo: i.estoque_minimo,
      estoque_critico: i.estoque_critico,
      qtd_compra_normal: i.qtd_compra_normal,
      tipo_compra: i.tipo_compra || "mercado",
    });
    setEditandoId(i.id_ingrediente);
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (editandoId) {
        const upd = await IngredienteService.atualizar(editandoId, form);
        setIngredientes((prev) =>
          prev.map((i) =>
            i.id_ingrediente === upd.id_ingrediente ? { ...i, ...upd } : i,
          ),
        );
        toast.success("Ingrediente atualizado!");
      } else {
        const novo = await IngredienteService.criar(form);
        setIngredientes((prev) => [...prev, novo]);
        toast.success("Ingrediente criado!");
      }
      setModalAberto(false);
    } catch (err: any) {
      toast.error(err.response?.data?.mensagem ?? "Erro ao guardar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: number, nome: string) => {
    const ok = await confirm(`Remover "${nome}" do sistema?`);
    if (!ok) return;
    try {
      await IngredienteService.deletar(id);
      setIngredientes((prev) => prev.filter((i) => i.id_ingrediente !== id));
      toast.success("Ingrediente removido.");
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  const campo =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f: any) => ({
        ...f,
        [key]:
          e.target.type === "number" ? Number(e.target.value) : e.target.value,
      }));

  // ── Usuários ──
  const abrirEditarOp = (op: Operador) => {
    setFormOp({
      nome: op.nome,
      cargo: op.cargo ?? "",
      foto: op.foto ?? "",
      role: op.role,
    });
    setEditandoOpId(op.id_operador);
    setModalOpAberto(true);
  };

  const handleSalvarOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editandoOpId) return;
    setSalvandoOp(true);
    try {
      const { data: upd } = await api.put(`/operadores/${editandoOpId}`, formOp);
      setOperadores((prev) =>
        prev.map((o) => (o.id_operador === upd.id_operador ? { ...o, ...upd } : o)),
      );
      toast.success("Usuário atualizado!");
      setModalOpAberto(false);
    } catch (err: any) {
      toast.error(err.response?.data?.mensagem ?? "Erro ao guardar.");
    } finally {
      setSalvandoOp(false);
    }
  };

  const campoOp =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormOp((f: any) => ({ ...f, [key]: e.target.value }));

  const handleToggleStatusOp = async (op: Operador) => {
    const vaiAtivar = op.status === "0";
    const acao = vaiAtivar ? "reativar" : "desativar";
    const ok = await confirm(
      vaiAtivar
        ? `Reativar o acesso de "${op.nome}"?`
        : `Desativar "${op.nome}"? Ele não conseguirá mais fazer login, mas o histórico de movimentações dele será mantido.`,
    );
    if (!ok) return;
    try {
      const { data: upd } = await api.put(`/operadores/${op.id_operador}/status`, {
        status: vaiAtivar ? "1" : "0",
      });
      setOperadores((prev) =>
        prev.map((o) => (o.id_operador === upd.id_operador ? { ...o, ...upd } : o)),
      );
      toast.success(vaiAtivar ? "Usuário reativado." : "Usuário desativado.");
    } catch {
      toast.error(`Erro ao ${acao} usuário.`);
    }
  };

  const abrirResetarPin = (op: Operador) => {
    setOpPinAlvo(op);
    setNovoPin("");
  };

  const handleSalvarPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opPinAlvo) return;
    setSalvandoPin(true);
    try {
      await api.put(`/operadores/${opPinAlvo.id_operador}/pin`, { pin: novoPin });
      toast.success(`PIN de "${opPinAlvo.nome}" redefinido.`);
      setOpPinAlvo(null);
    } catch (err: any) {
      toast.error(err.response?.data?.mensagem ?? "Erro ao redefinir PIN.");
    } finally {
      setSalvandoPin(false);
    }
  };

  const operadoresFiltrados = operadores.filter((o) => {
    if (filtroStatusOp === "ativos") return o.status === "1";
    if (filtroStatusOp === "inativos") return o.status === "0";
    return true;
  });

  // Todas as categorias cadastradas no banco (não só as do mês)
  const categoriasSelect = [
    "todas",
    ...categorias.map((c) => c.nome),
  ];

  const movsFiltradas =
    filtroCategoria === "todas"
      ? movimentacoes
      : movimentacoes.filter((m) => (m.categoria_nome ?? "Sem categoria") === filtroCategoria);

  const movsPorCategoria = movsFiltradas.reduce<Record<string, Movimentacao[]>>((acc, m) => {
    const cat = m.categoria_nome ?? "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  return (
    <div className="admin-container">
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

      <main>
        <div className="admin-top">
          <div>
            <h2>Admin</h2>
            <p className="admin-sub">Apenas gestores têm acesso a esta página</p>
          </div>
          {aba === "ingredientes" && (
            <button className="btn" onClick={abrirNovo}>
              <span className="material-symbols-outlined">add</span> Novo
            </button>
          )}
          {aba === "movimentacoes" && (
            <button className="btn" onClick={() => carregarMovimentacoes(filtroMes)} disabled={carregandoMov}>
              <span className="material-symbols-outlined">refresh</span>
            </button>
          )}
          {aba === "usuarios" && (
            <button className="btn" onClick={carregarOperadores} disabled={carregandoOps}>
              <span className="material-symbols-outlined">refresh</span>
            </button>
          )}
        </div>

        {/* ── Abas ── */}
        <div className="admin-abas">
          <button
            className={`admin-aba ${aba === "ingredientes" ? "admin-aba--ativa" : ""}`}
            onClick={() => setAba("ingredientes")}
          >
            <span className="material-symbols-outlined">inventory_2</span>
            Ingredientes
            <span className="admin-aba__count">{ingredientes.length}</span>
          </button>
          <button
            className={`admin-aba ${aba === "movimentacoes" ? "admin-aba--ativa" : ""}`}
            onClick={() => setAba("movimentacoes")}
          >
            <span className="material-symbols-outlined">history</span>
            Movimentações
            <span className="admin-aba__count">{movimentacoes.length}</span>
          </button>
          <button
            className={`admin-aba ${aba === "usuarios" ? "admin-aba--ativa" : ""}`}
            onClick={() => setAba("usuarios")}
          >
            <span className="material-symbols-outlined">group</span>
            Usuários
            <span className="admin-aba__count">{operadores.length}</span>
          </button>
        </div>

        {/* ── Aba: Ingredientes ── */}
        {aba === "ingredientes" && (
          <>
            {carregando && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>A carregar...</p>
            )}
            {!carregando && (
              <>
              {ingredientes.length > 0 && (
                <div className="admin-lista-header admin-lista-header--ingrediente" aria-hidden="true">
                  <span>Ingrediente</span>
                  <span>Categoria</span>
                  <span>Tipo compra</span>
                  <span>Unidade</span>
                  <span>Mín / Crítico</span>
                  <span>Qtd. compra</span>
                  <span>Ações</span>
                </div>
              )}
              <div className="admin-tabela">
                {ingredientes.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    Nenhum ingrediente cadastrado.
                  </p>
                )}
                {ingredientes.map((i) => (
                  <div key={i.id_ingrediente} className="admin-item admin-item--ingrediente">
                    <span className="admin-item__nome">{i.nome}</span>
                    <span className="admin-item__cat">{i.categoria_nome ?? "—"}</span>
                    <span className="admin-item__tipo-compra">
                      {i.tipo_compra === "bebidas"
                        ? "Bebidas"
                        : i.tipo_compra === "pessoal"
                        ? "Pessoal"
                        : "Mercado"}
                    </span>
                    <span className="admin-item__unidade">{i.unidade}</span>
                    <span className="admin-item__minmax">
                      {i.estoque_minimo} / {i.estoque_critico}
                    </span>
                    <span className="admin-item__qtdcompra">{i.qtd_compra_normal}</span>
                    <div className="admin-item__acoes">
                      <button className="btn-acao btn-acao--editar" onClick={() => abrirEditar(i)}>
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button className="btn-acao btn-acao--deletar" onClick={() => handleDeletar(i.id_ingrediente, i.nome)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}
          </>
        )}

        {/* ── Aba: Movimentações ── */}
        {aba === "movimentacoes" && (
          <>
            {/* Filtro de mês + select de categoria + botão PDF */}
            <div className="admin-filtros">
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="admin-filtro-input"
              />
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="admin-filtro-input"
              >
                {categoriasSelect.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "todas" ? "Todas as categorias" : cat}
                  </option>
                ))}
              </select>
              <button
                className="btn admin-btn-pdf"
                onClick={() => gerarPDF(movsFiltradas, filtroMes)}
                disabled={movimentacoes.length === 0}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
                Baixar PDF
              </button>
            </div>

            {!carregandoMov && movsFiltradas.length > 0 && (
              <div className="admin-resumo">
                <span><strong>{movsFiltradas.length}</strong> movimentações</span>
                <span className="admin-resumo__item" style={{ color: "var(--success)" }}>
                  <strong>▲ {movsFiltradas.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + Number(m.quantidade), 0)}</strong> entradas
                </span>
                <span className="admin-resumo__item" style={{ color: "var(--danger)" }}>
                  <strong>▼ {movsFiltradas.filter((m) => m.tipo === "SAIDA").reduce((s, m) => s + Number(m.quantidade), 0)}</strong> saídas
                </span>
              </div>
            )}

            {carregandoMov && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>A carregar...</p>
            )}
            {!carregandoMov && movimentacoes.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Nenhuma movimentação neste mês.</p>
            )}

            {!carregandoMov && Object.keys(movsPorCategoria).length > 0 && (
              <>
              <div className="admin-lista-header admin-lista-header--mov" aria-hidden="true">
                <span></span>
                <span>Data/Hora</span>
                <span>Ingrediente</span>
                <span>Tipo</span>
                <span>Qtd</span>
                <span>Operador</span>
                <span>Observação</span>
              </div>
              <div className="admin-tabela">
              {Object.entries(movsPorCategoria).map(([cat, itens]) => (
                <div key={cat} className="admin-categoria-grupo">
                  <p className="admin-categoria__titulo">{cat}</p>
                  {itens.map((m) => (
                    <div key={m.id_movimento} className="admin-item admin-item--mov">
                      <div
                        className="mov-tipo-bar"
                        style={{ background: m.tipo === "ENTRADA" ? "var(--success)" : "var(--danger)" }}
                      />
                      <span className="admin-item__hora">{formatarData(m.data_movimento)}</span>
                      <span className="admin-item__nome">{m.ingrediente_nome}</span>
                      <span
                        className="mov-badge"
                        style={{
                          background: m.tipo === "ENTRADA" ? "var(--success-bg)" : "var(--danger-bg)",
                          color: m.tipo === "ENTRADA" ? "var(--success)" : "var(--danger)",
                          border: `1px solid ${m.tipo === "ENTRADA" ? "var(--success-border)" : "var(--danger-border)"}`,
                        }}
                      >
                        {m.tipo === "ENTRADA" ? "▲ Entrada" : "▼ Saída"}
                      </span>
                      <span className="admin-item__qtd">
                        <strong style={{ color: "var(--text-primary)" }}>{m.quantidade} {m.unidade}</strong>
                      </span>
                      <span className="admin-item__operador">
                        <span className="material-symbols-outlined admin-item__operador-icon">person</span>
                        <strong style={{ color: "var(--primary)" }}>{m.operador}</strong>
                      </span>
                      <span className="admin-item__obs">{m.observacao}</span>
                    </div>
                  ))}
                </div>
              ))}
              </div>
              </>
            )}
          </>
        )}

        {/* ── Aba: Usuários ── */}
        {aba === "usuarios" && (
          <>
            <div className="op-chips">
              {(["ativos", "inativos", "todos"] as const).map((f) => (
                <button
                  key={f}
                  className={`op-chip ${filtroStatusOp === f ? "op-chip--ativo" : ""}`}
                  onClick={() => setFiltroStatusOp(f)}
                >
                  {f === "ativos" ? "Ativos" : f === "inativos" ? "Inativos" : "Todos"}
                  {" "}({
                    f === "ativos"
                      ? operadores.filter((o) => o.status === "1").length
                      : f === "inativos"
                      ? operadores.filter((o) => o.status === "0").length
                      : operadores.length
                  })
                </button>
              ))}
            </div>

            {carregandoOps && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>A carregar...</p>
            )}
            {!carregandoOps && operadoresFiltrados.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
                Nenhum usuário encontrado.
              </p>
            )}

            {!carregandoOps && operadoresFiltrados.length > 0 && (
              <div className="admin-lista-header admin-lista-header--op" aria-hidden="true">
                <span></span>
                <span>Usuário</span>
                <span>Status</span>
                <span>Permissão</span>
                <span>Cargo</span>
                <span>Ações</span>
              </div>
            )}

            {!carregandoOps && (
              <div className="admin-tabela">
                {operadoresFiltrados.map((op) => {
                  const souEu = op.id_operador === operadorLogado?.id_operador;
                  return (
                    <div key={op.id_operador} className="admin-item admin-item--op">
                      {op.foto ? (
                        <img src={op.foto} alt={op.nome} className="op-avatar" />
                      ) : (
                        <div className="op-avatar op-avatar--initial">
                          {op.nome.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="admin-item__nome">
                        {op.nome} {souEu && <span style={{ color: "var(--text-muted)", fontWeight: "normal", fontSize: 11 }}>(você)</span>}
                      </span>
                      <span
                        className={`op-badge ${op.status === "1" ? "op-badge--ativo" : "op-badge--inativo"}`}
                      >
                        {op.status === "1" ? "● Ativo" : "● Inativo"}
                      </span>
                      <span
                        className={`op-badge ${op.role === "gestor" ? "op-badge--gestor" : "op-badge--funcionario"}`}
                      >
                        {op.role === "gestor" ? "Gestor" : "Funcionário"}
                      </span>
                      <span className="admin-item__cargo">{op.cargo}</span>
                      <div className="admin-item__acoes">
                        <button
                          className="btn-acao btn-acao--editar"
                          title="Editar dados"
                          onClick={() => abrirEditarOp(op)}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          className="btn-acao btn-acao--editar"
                          title="Redefinir PIN"
                          onClick={() => abrirResetarPin(op)}
                        >
                          <span className="material-symbols-outlined">key</span>
                        </button>
                        <button
                          className="btn-acao btn-acao--deletar"
                          title={souEu ? "Você não pode desativar sua própria conta" : op.status === "1" ? "Desativar" : "Reativar"}
                          disabled={souEu}
                          onClick={() => handleToggleStatusOp(op)}
                        >
                          <span className="material-symbols-outlined">
                            {op.status === "1" ? "person_off" : "person"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="admin-aviso">
              <span className="material-symbols-outlined">info</span>
              <p>
                Por segurança e para preservar o histórico de movimentações, usuários não são excluídos —
                apenas desativados. Um usuário desativado não consegue mais fazer login.
              </p>
            </div>
          </>
        )}
      </main>

      {modalAberto && (
        <div className="ingrediente-modal-overlay">
          <div className="ingrediente-modal" role="dialog" aria-modal="true">
            <form onSubmit={handleSalvar}>
              <h2>{editandoId ? "Editar Ingrediente" : "Novo Ingrediente"}</h2>

              <div className="modal-input-wrapper">
                <label>Nome *</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={campo("nome")}
                  placeholder="Ex: Farinha de trigo"
                  required
                />
              </div>

              <div className="ingrediente-modal-row" style={{ display: "flex", gap: 10 }}>
                <div className="modal-input-wrapper" style={{ flex: 1 }}>
                  <label>Categoria</label>
                  <select value={form.id_categoria ?? ""} onChange={campo("id_categoria")}>
                    <option value="">Sem categoria</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="modal-input-wrapper" style={{ flex: 1 }}>
                  <label>Tipo de Compra *</label>
                  <select value={form.tipo_compra || "mercado"} onChange={campo("tipo_compra")} required>
                    <option value="mercado">Mercado</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="pessoal">Pessoal</option>
                  </select>
                </div>
              </div>

              <div className="modal-input-wrapper">
                <label>Unidade *</label>
                <select value={form.unidade} onChange={campo("unidade")}>
                  {["kg", "g", "L", "ml", "un", "cx", "pct", "fardo"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="ingrediente-modal-row" style={{ display: "flex", gap: 10 }}>
                <div className="modal-input-wrapper" style={{ flex: 1 }}>
                  <label>Stock mínimo *</label>
                  <input type="number" min={0} step={0.1} value={form.estoque_minimo} onChange={campo("estoque_minimo")} required />
                </div>
                <div className="modal-input-wrapper" style={{ flex: 1 }}>
                  <label>Stock crítico *</label>
                  <input type="number" min={0} step={0.1} value={form.estoque_critico} onChange={campo("estoque_critico")} required />
                </div>
              </div>

              <div className="modal-input-wrapper">
                <label>Qtd. normal de compra *</label>
                <input type="number" min={0} step={0.1} value={form.qtd_compra_normal} onChange={campo("qtd_compra_normal")} required />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="submit" className="btn" disabled={salvando}>
                  {salvando ? "A guardar..." : "Guardar"}
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setModalAberto(false)} disabled={salvando}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalOpAberto && (
        <dialog open className="admin-dialog">
          <form onSubmit={handleSalvarOp}>
            <h2>Editar Usuário</h2>

            <div className="modal-input-wrapper">
              <label>Nome *</label>
              <input
                type="text"
                value={formOp.nome}
                onChange={campoOp("nome")}
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div className="modal-input-wrapper" style={{ flex: 1 }}>
                <label>Cargo</label>
                <input
                  type="text"
                  value={formOp.cargo}
                  onChange={campoOp("cargo")}
                  placeholder="Ex: Cozinheiro"
                />
              </div>
              <div className="modal-input-wrapper" style={{ flex: 1 }}>
                <label>Permissão *</label>
                <select
                  value={formOp.role}
                  onChange={campoOp("role")}
                  disabled={editandoOpId === operadorLogado?.id_operador}
                >
                  <option value="funcionario">Funcionário</option>
                  <option value="gestor">Gestor</option>
                </select>
              </div>
            </div>
            {editandoOpId === operadorLogado?.id_operador && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "-6px 0 8px" }}>
                Você não pode alterar sua própria permissão.
              </p>
            )}

            <div className="modal-input-wrapper">
              <label>URL da foto (opcional)</label>
              <input
                type="text"
                value={formOp.foto}
                onChange={campoOp("foto")}
                placeholder="https://..."
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" className="btn" disabled={salvandoOp}>
                {salvandoOp ? "A guardar..." : "Guardar"}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setModalOpAberto(false)} disabled={salvandoOp}>
                Cancelar
              </button>
            </div>
          </form>
        </dialog>
      )}

      {opPinAlvo && (
        <dialog open className="admin-dialog">
          <form onSubmit={handleSalvarPin}>
            <h2>Redefinir PIN — {opPinAlvo.nome}</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-8px 0 16px" }}>
              Defina um novo PIN de 4 dígitos para este usuário. Ele deverá usá-lo no próximo login.
            </p>

            <div className="modal-input-wrapper">
              <label>Novo PIN (4 dígitos) *</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                value={novoPin}
                onChange={(e) => setNovoPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                autoFocus
                required
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="submit" className="btn" disabled={salvandoPin || novoPin.length !== 4}>
                {salvandoPin ? "A guardar..." : "Redefinir"}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setOpPinAlvo(null)} disabled={salvandoPin}>
                Cancelar
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default Admin;
