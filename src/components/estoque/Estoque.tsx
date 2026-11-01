import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/alerts/ToastContext";
import { IngredienteService } from "../../service/ingrediente.service";
import { api } from "../../utils/axios";
import type { Ingrediente, Urgencia } from "../../types";
import { calcularUrgencia, URGENCIA_LABEL, URGENCIA_COLOR } from "../../types";
import "./Estoque.css";

interface UltimaMovimentacao {
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  operador: string;
  data_movimento: string;
}

// Passo de incremento por clique — ajusta conforme a unidade do ingrediente
function passoDe(unidade: string): number {
  if (unidade === "kg" || unidade === "L") return 1;
  if (unidade === "g" || unidade === "ml") return 100;
  return 1; // un, cx, pct, fardo...
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
const Estoque: React.FC = () => {
  const { operador, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const isGestor = operador?.role === "gestor";

  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroUrgencia, setFiltroUrgencia] = useState<Urgencia | "todos">(
    "todos",
  );

  // Lê ?filtro= da URL ao entrar na página (vindo do Dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const f = params.get("filtro") as Urgencia | "todos" | null;
    if (f && ["todos", "zerado", "urgente", "atencao", "ok"].includes(f)) {
      setFiltroUrgencia(f);
    }
  }, []);

  // ── Busca e filtro de categoria (novos, client-side, aditivos — não tocam
  //    em cálculo de urgência, debounce, API ou agrupamento existentes) ──
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todas");

  // Valor visual "pendente" enquanto o debounce não dispara
  const [pendentes, setPendentes] = useState<Record<number, number>>({});
  // Timers de debounce por ingrediente
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const [ultimasMovs, setUltimasMovs] = useState<Record<number, UltimaMovimentacao>>({});

  const carregarUltimasMovs = useCallback(async () => {
    try {
      const { data } = await api.get("/movimentos-ingredientes?limite=200");
      const mapa: Record<number, UltimaMovimentacao> = {};
      for (const m of data) {
        if (!mapa[m.ingrediente_id]) {
          mapa[m.ingrediente_id] = {
            tipo: m.tipo,
            quantidade: m.quantidade,
            operador: m.operador,
            data_movimento: m.data_movimento,
          };
        }
      }
      setUltimasMovs(mapa);
    } catch { /* silencioso */ }
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setIngredientes(await IngredienteService.listarTodos());
    } catch {
      toast.error("Erro ao carregar ingredientes.");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
    carregarUltimasMovs();
  }, [carregar, carregarUltimasMovs]);

  const ajustar = (item: Ingrediente, sinal: 1 | -1) => {
    const id = item.id_ingrediente;
    const valorBase = Number(item.quantidade_atual);
    const passo = passoDe(item.unidade) * sinal;

    // Guarda valor atual pendente (pode já existir de cliques anteriores)
    setPendentes((prev) => {
      const atual = prev[id] ?? valorBase;
      const proximo = Math.max(0, atual + passo);

      if (sinal === -1 && !isGestor && proximo < 0) {
        toast.warning("Stock insuficiente para retirar.");
        return prev;
      }

      // Cancela o timer anterior deste ingrediente
      if (timers.current[id]) clearTimeout(timers.current[id]);

      // Agenda chamada à API após 600ms sem novos cliques
      timers.current[id] = setTimeout(async () => {
        const novoValor = proximo;
        const diff = Math.abs(novoValor - valorBase);
        if (diff === 0) {
          setPendentes((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
          return;
        }
        try {
          if (novoValor > valorBase) {
            await IngredienteService.adicionar(
              id,
              diff,
              operador?.nome ?? "sistema",
            );
          } else {
            await IngredienteService.retirar(
              id,
              diff,
              operador?.nome ?? "sistema",
            );
          }
          // Atualiza a lista e limpa o pendente deste item
          const atualizados = await IngredienteService.listarTodos();
          setIngredientes(atualizados);
        } catch {
          toast.error("Erro ao sincronizar com o servidor. Recarregue.");
          // Reverte visualmente
          setIngredientes((prev) => [...prev]);
        } finally {
          setPendentes((p) => {
            const n = { ...p };
            delete n[id];
            return n;
          });
          delete timers.current[id];
        }
      }, 600);

      return { ...prev, [id]: proximo };
    });
  };

  // Lista de categorias existentes (derivada, para popular o select de categoria)
  const categorias = Array.from(
    new Set(ingredientes.map((i) => i.categoria_nome ?? "Sem categoria")),
  ).sort();

  const filtrados = ingredientes.filter((i) => {
    const passaUrgencia =
      filtroUrgencia === "todos" || calcularUrgencia(i) === filtroUrgencia;
    const passaCategoria =
      categoriaSelecionada === "todas" ||
      (i.categoria_nome ?? "Sem categoria") === categoriaSelecionada;
    const passaBusca =
      busca.trim() === "" ||
      i.nome.toLowerCase().includes(busca.trim().toLowerCase());
    return passaUrgencia && passaCategoria && passaBusca;
  });

  const porCategoria = filtrados.reduce<Record<string, Ingrediente[]>>(
    (acc, i) => {
      const cat = i.categoria_nome ?? "Sem categoria";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(i);
      return acc;
    },
    {},
  );

  const contagens = {
    zerado: ingredientes.filter((i) => calcularUrgencia(i) === "zerado").length,
    urgente: ingredientes.filter((i) => calcularUrgencia(i) === "urgente")
      .length,
    atencao: ingredientes.filter((i) => calcularUrgencia(i) === "atencao")
      .length,
    ok: ingredientes.filter((i) => calcularUrgencia(i) === "ok").length,
  };

  const totalItensFiltrados = filtrados.length;

  return (
    <div className="inventario-container">
      <header>
        <Link to="/adicionar">
          <span className="material-symbols-outlined">add_box</span>
          <span>Adicionar</span>
        </Link>
        <Link
          to="/inventario"
          className={location.pathname === "/inventario" ? "active" : ""}
        >
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
        {/* ── Cabeçalho da página ── */}
        <div className="inv-top">
          <div>
            <h2>Inventário</h2>
            <p className="inv-sub">Controle de ingredientes</p>
          </div>
          <div className="inv-top__acoes">
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
            </button>
            <Link to="/adicionar" className="btn btn-adicionar">
              <span className="material-symbols-outlined">add</span>
              Adicionar
            </Link>
          </div>
        </div>

        {/* ── Barra de busca e filtros ── */}
        <div className="inv-toolbar">
          <div className="inv-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar ingrediente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <select
            className="inv-select"
            value={categoriaSelecionada}
            onChange={(e) => setCategoriaSelecionada(e.target.value)}
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className="inv-select"
            value={filtroUrgencia}
            onChange={(e) =>
              setFiltroUrgencia(e.target.value as Urgencia | "todos")
            }
          >
            <option value="todos">Todos os status</option>
            <option value="ok">{URGENCIA_LABEL.ok}</option>
            <option value="atencao">{URGENCIA_LABEL.atencao}</option>
            <option value="urgente">{URGENCIA_LABEL.urgente}</option>
            <option value="zerado">{URGENCIA_LABEL.zerado}</option>
          </select>
        </div>

        {/* ── Faixa de resumo ── */}
        <div className="inv-resumo">
          <span>
            <strong>{ingredientes.length}</strong> ingredientes
          </span>
          <span className="inv-resumo__item" style={{ color: "var(--warning)" }}>
            <strong>{contagens.atencao}</strong> atenção
          </span>
          <span className="inv-resumo__item" style={{ color: "var(--danger)" }}>
            <strong>{contagens.urgente}</strong> urgentes
          </span>
          <span className="inv-resumo__item" style={{ color: "var(--text-muted)" }}>
            <strong>{contagens.zerado}</strong> zerados
          </span>
        </div>

        {carregando && (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>A carregar...</p>
        )}

        {!carregando && totalItensFiltrados === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Nenhum ingrediente encontrado.
          </p>
        )}

        {totalItensFiltrados > 0 && (
          <div className="inv-tabela">
            <div className="inv-tabela__cols" aria-hidden="true">
              <span>Ingrediente</span>
              <span>Categoria</span>
              <span>Estoque</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {Object.entries(porCategoria).map(([categoria, itens]) =>
              itens.map((item) => {
                const id = item.id_ingrediente;
                const valorExibido = pendentes[id] ?? item.quantidade_atual;
                const emTransito = pendentes[id] !== undefined;

                // Urgência calculada sobre o valor exibido (feedback visual imediato)
                const urg = calcularUrgencia({
                  ...item,
                  quantidade_atual: valorExibido,
                });
                const pct =
                  item.estoque_minimo > 0
                    ? Math.min(
                        100,
                        Math.round((valorExibido / item.estoque_minimo) * 100),
                      )
                    : 100;

                return (
                  <div
                    key={id}
                    className={`inv-item ${emTransito ? "inv-item--pendente" : ""}`}
                  >
                    <div className="inv-item__nome-col">
                      <div className="inv-item__nome">{item.nome}</div>
                      {ultimasMovs[id] && (
                        <div className="inv-ultima-mov">
                          <span
                            className="inv-ultima-mov__tipo"
                            style={{ color: ultimasMovs[id].tipo === "ENTRADA" ? "var(--success)" : "var(--danger)" }}
                          >
                            {ultimasMovs[id].tipo === "ENTRADA" ? "▲" : "▼"}
                            {" "}{ultimasMovs[id].quantidade} {item.unidade}
                          </span>
                          <span className="inv-ultima-mov__operador">
                            {ultimasMovs[id].operador}
                          </span>
                          <span className="inv-ultima-mov__hora">
                            {/* {formatarData(ultimasMovs[id].data_movimento)} */}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="inv-item__cat-col">{categoria}</div>

                    <div className="inv-item__estoque-col">
                      <span className="inv-qtd">
                        <strong>{valorExibido}</strong> {item.unidade}
                        {emTransito && <span className="inv-qtd__sync">●</span>}
                      </span>
                      <div className="inv-progress">
                        <div
                          className="inv-progress__bar"
                          style={{
                            width: `${pct}%`,
                            background: URGENCIA_COLOR[urg],
                          }}
                        />
                      </div>
                      <div className="inv-progress__labels">
                        <span>0</span>
                        <span>
                          Mín: {item.estoque_minimo} {item.unidade}
                        </span>
                      </div>
                    </div>

                    <div className="inv-item__status-col">
                      <span
                        className="inv-badge"
                        style={{
                          background: URGENCIA_COLOR[urg] + "22",
                          color: URGENCIA_COLOR[urg],
                          borderColor: URGENCIA_COLOR[urg] + "55",
                        }}
                      >
                        {URGENCIA_LABEL[urg]}
                      </span>
                    </div>

                    <div className="inv-item__acoes">
                      <button
                        className="inv-btn inv-btn--rem"
                        onClick={() => ajustar(item, -1)}
                        title={`-${passoDe(item.unidade)} ${item.unidade}`}
                      >
                        <span className="material-symbols-outlined">remove</span>
                      </button>
                      {isGestor && (
                        <button
                          className="inv-btn inv-btn--add"
                          onClick={() => ajustar(item, 1)}
                          title={`+${passoDe(item.unidade)} ${item.unidade}`}
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Estoque;