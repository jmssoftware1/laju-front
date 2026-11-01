import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { IngredienteService } from "../../service/ingrediente.service";
import type { Ingrediente } from "../../types";
import { calcularUrgencia, URGENCIA_COLOR, URGENCIA_LABEL } from "../../types";
import "./dashboard.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function gerarMensagemWhatsApp(lista: Ingrediente[], titulo: string): string {
  const zerados = lista.filter((i) => calcularUrgencia(i) === "zerado");
  const urgentes = lista.filter((i) => calcularUrgencia(i) === "urgente");

  let msg = `🛒 *${titulo}*\n`;
  msg += `📅 ${new Date().toLocaleString("pt-BR")}\n\n`;

  if (zerados.length > 0) {
    msg += `⚫ *ZERADO (comprar hoje!):*\n`;
    zerados.forEach((i) => {
 msg += `• ${i.nome} — Estoque atual: ${i.quantidade_atual} ${i.unidade} — Comprar: ${i.qtd_compra_normal} ${i.unidade}\n`;
    });
    msg += "\n";
  }

  if (urgentes.length > 0) {
    msg += `🔴 *URGENTE:*\n`;
    urgentes.forEach((i) => {
     msg += `• ${i.nome} — Estoque atual: ${i.quantidade_atual} ${i.unidade} — Comprar: ${i.qtd_compra_normal} ${i.unidade}\n`;
    });
    msg += "\n";
  }

  msg += `\n_Enviado por: sistema StockApp_`;
  return msg;
}

// ─── Sub-componente card de métrica ───────────────────────────────────────────

interface CardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}
const MetricCard: React.FC<CardProps> = ({
  icon,
  label,
  value,
  sub,
  color = "var(--primary)",
}) => (
  <div className="metric-card" style={{ borderTopColor: color }}>
    <div className="metric-card__icon" style={{ color }}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <div className="metric-card__body">
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value" style={{ color }}>
        {value}
      </span>
      {sub && <span className="metric-card__sub">{sub}</span>}
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { operador, logout } = useAuth();
  const location = useLocation();
  const isGestor = operador?.role === "gestor";

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtt, setUltimaAtt] = useState<Date | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const ings = await IngredienteService.listarTodos();
      setIngredientes(ings);
      setUltimaAtt(new Date());
    } catch {
      /* silencioso */
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  // ── Métricas globais ──
  const total = ingredientes.length;
  const zerados = ingredientes.filter((i) => calcularUrgencia(i) === "zerado");
  const urgentes = ingredientes.filter((i) => calcularUrgencia(i) === "urgente");
  const atencao = ingredientes.filter((i) => calcularUrgencia(i) === "atencao");
  const ok = ingredientes.filter((i) => calcularUrgencia(i) === "ok");

  // Ingredientes que precisam de compra (zerado + urgente)
  const paraComprar = [...zerados, ...urgentes];

  // Separação por tipo de compra
  const reporMercado = paraComprar.filter((i) => !i.tipo_compra || i.tipo_compra === "mercado");
  const reporBebidas = paraComprar.filter((i) => i.tipo_compra === "bebidas");
  const reporPessoal = paraComprar.filter((i) => i.tipo_compra === "pessoal");

  const enviarWhatsApp = (lista: Ingrediente[], titulo: string) => {
    const msg = gerarMensagemWhatsApp(lista, titulo);
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <Link to="/adicionar">
          <span className="material-symbols-outlined">add_box</span>Adicionar
        </Link>
        <Link to="/inventario">
          <span className="material-symbols-outlined">inventory_2</span>
          Inventário
        </Link>
        <Link
          to="/dashboard"
          className={location.pathname === "/dashboard" ? "active" : ""}
        >
          <span className="material-symbols-outlined">dashboard</span>Dashboard
        </Link>
        {isGestor && (
          <Link to="/admin">
            <span className="material-symbols-outlined">
              admin_panel_settings
            </span>
            Admin
          </Link>
        )}
        <Link to="/perfil">
          <span className="material-symbols-outlined">account_circle</span>
          Perfil
        </Link>
        <button className="logout" onClick={logout}>
          <span className="material-symbols-outlined">logout</span>Sair
        </button>
      </header>

      <main className="dashboard-main">
        {/* ── Cabeçalho ── */}
        <div className="dashboard-top">
          <div>
            <h2>Dashboard</h2>
            <p className="dashboard-sub">
              Olá, <strong>{operador?.nome}</strong> —{" "}
              {new Date().toLocaleDateString("pt-PT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button
            className="btn-refresh"
            onClick={carregar}
            disabled={carregando}
            title="Atualizar"
          >
            <span
              className="material-symbols-outlined"
              style={{
                animation: carregando ? "spin 1s linear infinite" : "none",
              }}
            >
              refresh
            </span>
            {ultimaAtt && !carregando && (
              <span className="refresh-time">
                {formatarHora(ultimaAtt.toISOString())}
              </span>
            )}
          </button>
        </div>

        {/* ── KPI strip ── */}
        <section>
          <h3 className="section-title">Visão geral do estoque</h3>
          <div className="kpi-strip">
            <Link
              to="/inventario?filtro=todos"
              className="kpi-total"
              style={{ textDecoration: "none" }}
            >
              <MetricCard
                icon="inventory_2"
                label="Total"
                value={total}
                color="var(--primary)"
                sub="ingredientes"
              />
            </Link>
            <div className="kpi-strip-rest">
              <Link to="/inventario?filtro=ok" style={{ textDecoration: "none" }}>
                <MetricCard
                  icon="check_circle"
                  label="OK"
                  value={ok.length}
                  color="var(--success)"
                  sub="em Estoque"
                />
              </Link>
              <Link
                to="/inventario?filtro=atencao"
                style={{ textDecoration: "none" }}
              >
                <MetricCard
                  icon="warning"
                  label="Atenção"
                  value={atencao.length}
                  color="var(--warning)"
                  sub="abaixo do mínimo"
                />
              </Link>
              <Link
                to="/inventario?filtro=urgente"
                style={{ textDecoration: "none" }}
              >
                <MetricCard
                  icon="error"
                  label="Urgente"
                  value={urgentes.length}
                  color="var(--danger)"
                  sub="nível crítico"
                />
              </Link>
              <Link
                to="/inventario?filtro=zerado"
                style={{ textDecoration: "none" }}
              >
                <MetricCard
                  icon="remove_circle"
                  label="Zerado"
                  value={zerados.length}
                  color="var(--text-muted)"
                  sub="sem estoque"
                />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Layout principal: coluna de reposição + coluna de monitoramento ── */}
        <div className="dashboard-layout">
          {/* ── Coluna principal: Para repor ── */}
          <div className="dashboard-col-main">
            <section>
              <h3 className="section-title">Para repor</h3>

              {paraComprar.length === 0 ? (
                <div className="urgencia-vazia">
                  <span className="material-symbols-outlined">check_circle</span>
                  <p>Tudo em ordem! Nenhum ingrediente urgente ou zerado.</p>
                </div>
              ) : (
                <div className="container-grupos">
                  {/* === GRUPO MERCADO === */}
                  {reporMercado.length > 0 && (
                    <div className="repor-grupo">
                      <div className="urgencia-header" style={{ marginBottom: 12 }}>
                        <h3 className="repor-grupo-titulo" style={{ margin: 0 }}>
                          <span className="material-symbols-outlined">shopping_cart</span>
                          Mercado
                          <span className="urgencia-count">{reporMercado.length}</span>
                        </h3>
                        <button
                          className="whatsapp-btn"
                          onClick={() => enviarWhatsApp(reporMercado, "Lista de Compras: Mercado")}
                        >
                          <span className="material-symbols-outlined">send</span>
                          Enviar WhatsApp
                        </button>
                      </div>
                      <div className="repor-grupo-cols" aria-hidden="true">
                        <span>Ingrediente</span>
                        <span>Categoria</span>
                        <span>Status</span>
                        <span>Comprar</span>
                        <span>Atual</span>
                      </div>
                      <ul className="urgencia-lista">
                        {reporMercado.map((i) => {
                          const urg = calcularUrgencia(i);
                          return (
                            <li key={i.id_ingrediente} className="urgencia-item" style={{ borderLeft: `4px solid ${URGENCIA_COLOR[urg]}` }}>
                              <span className="urgencia-item__nome">{i.nome}</span>
                              <span className="urgencia-item__cat">{i.categoria_nome ?? "—"}</span>
                              <span className="urgencia-badge" style={{ background: URGENCIA_COLOR[urg] + "22", color: URGENCIA_COLOR[urg], borderColor: URGENCIA_COLOR[urg] + "55" }}>
                                {URGENCIA_LABEL[urg]}
                              </span>
                              <span className="urgencia-item__compra">
                                Comprar: <strong>{i.qtd_compra_normal} {i.unidade}</strong>
                              </span>
                              <span className="urgencia-item__atual">Atual: {i.quantidade_atual} {i.unidade}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* === GRUPO BEBIDAS === */}
                  {reporBebidas.length > 0 && (
                    <div className="repor-grupo">
                      <div className="urgencia-header" style={{ marginBottom: 12 }}>
                        <h3 className="repor-grupo-titulo" style={{ margin: 0 }}>
                          <span className="material-symbols-outlined">local_bar</span>
                          Bebidas
                          <span className="urgencia-count">{reporBebidas.length}</span>
                        </h3>
                        <button
                          className="whatsapp-btn"
                          onClick={() => enviarWhatsApp(reporBebidas, "Lista de Compras: Bebidas")}
                        >
                          <span className="material-symbols-outlined">send</span>
                          Enviar WhatsApp
                        </button>
                      </div>
                      <div className="repor-grupo-cols" aria-hidden="true">
                        <span>Ingrediente</span>
                        <span>Categoria</span>
                        <span>Status</span>
                        <span>Comprar</span>
                        <span>Atual</span>
                      </div>
                      <ul className="urgencia-lista">
                        {reporBebidas.map((i) => {
                          const urg = calcularUrgencia(i);
                          return (
                            <li key={i.id_ingrediente} className="urgencia-item" style={{ borderLeft: `4px solid ${URGENCIA_COLOR[urg]}` }}>
                              <span className="urgencia-item__nome">{i.nome}</span>
                              <span className="urgencia-item__cat">{i.categoria_nome ?? "—"}</span>
                              <span className="urgencia-badge" style={{ background: URGENCIA_COLOR[urg] + "22", color: URGENCIA_COLOR[urg], borderColor: URGENCIA_COLOR[urg] + "55" }}>
                                {URGENCIA_LABEL[urg]}
                              </span>
                              <span className="urgencia-item__compra">
                                Comprar: <strong>{i.qtd_compra_normal} {i.unidade}</strong>
                              </span>
                              <span className="urgencia-item__atual">Atual: {i.quantidade_atual} {i.unidade}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* === GRUPO PESSOAL === */}
                  {reporPessoal.length > 0 && (
                    <div className="repor-grupo">
                      <div className="urgencia-header" style={{ marginBottom: 12 }}>
                        <h3 className="repor-grupo-titulo" style={{ margin: 0 }}>
                          <span className="material-symbols-outlined">home</span>
                          Particular
                          <span className="urgencia-count">{reporPessoal.length}</span>
                        </h3>
                      </div>
                      <div className="repor-grupo-cols" aria-hidden="true">
                        <span>Ingrediente</span>
                        <span>Categoria</span>
                        <span>Status</span>
                        <span>Comprar</span>
                        <span>Atual</span>
                      </div>
                      <ul className="urgencia-lista">
                        {reporPessoal.map((i) => {
                          const urg = calcularUrgencia(i);
                          return (
                            <li key={i.id_ingrediente} className="urgencia-item" style={{ borderLeft: `4px solid ${URGENCIA_COLOR[urg]}` }}>
                              <span className="urgencia-item__nome">{i.nome}</span>
                              <span className="urgencia-item__cat">{i.categoria_nome ?? "—"}</span>
                              <span className="urgencia-badge" style={{ background: URGENCIA_COLOR[urg] + "22", color: URGENCIA_COLOR[urg], borderColor: URGENCIA_COLOR[urg] + "55" }}>
                                {URGENCIA_LABEL[urg]}
                              </span>
                              <span className="urgencia-item__compra">
                                Comprar: <strong>{i.qtd_compra_normal} {i.unidade}</strong>
                              </span>
                              <span className="urgencia-item__atual">Atual: {i.quantidade_atual} {i.unidade}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ── Coluna lateral: Monitoramento ── */}
          <div className="dashboard-col-side">
            <section className="monitoramento-panel">
              <h3 className="section-title">Monitoramento</h3>

              {/* Painel sempre visível — mesma lista/condição de "atencao" do original,
                  apenas com um estado vazio elegante quando não há itens */}
              <details className="atencao-details" open>
                <summary>
                  <span className="material-symbols-outlined atencao-icon">warning</span>
                  Atenção
                  <span
                    className={
                      atencao.length > 0
                        ? "atencao-count-pill atencao-count-pill--active"
                        : "atencao-count-pill"
                    }
                  >
                    {atencao.length}
                  </span>
                  <span className="material-symbols-outlined atencao-chevron">
                    expand_less
                  </span>
                </summary>

                {atencao.length > 0 ? (
                  <ul className="urgencia-lista" style={{ marginTop: 10 }}>
                    {atencao.map((i) => (
                      <li
                        key={i.id_ingrediente}
                        className="urgencia-item urgencia-item--compact"
                        style={{
                          borderLeft: `4px solid ${URGENCIA_COLOR.atencao}`,
                        }}
                      >
                        <div className="urgencia-item__info">
                          <span className="urgencia-item__nome">{i.nome}</span>
                          <span className="urgencia-item__cat">
                            {i.categoria_nome ?? "—"}
                          </span>
                        </div>
                        <div className="urgencia-item__direita">
                          <span className="urgencia-item__atual">
                            Atual:{" "}
                            <strong>
                              {i.quantidade_atual} {i.unidade}
                            </strong>{" "}
                            / Mín: {i.estoque_minimo}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="monitoramento-vazio">
                    <span className="material-symbols-outlined">check_circle</span>
                    <div>
                      <strong>Nenhum ingrediente em atenção</strong>
                      <span>Todos os ingredientes estão acima do mínimo</span>
                    </div>
                  </div>
                )}
              </details>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
