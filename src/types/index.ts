export interface Operador {
  id_operador?: number;
  nome: string;
  status: "0" | "1";
  cargo?: string;
  foto?: string;
  role: "gestor" | "funcionario";
}

export interface Categoria {
  id_categoria: number;
  nome: string;
}

export interface Ingrediente {
  id_ingrediente: number;
  nome: string;
  id_categoria?: number;
  categoria_nome?: string;
  unidade: string; // kg | L | un | g | ml | cx
  quantidade_atual: number;
  estoque_minimo: number;
  estoque_critico: number;
  qtd_compra_normal: number;
  status: "0" | "1";
  tipo_compra?: "mercado" | "bebidas" | "pessoal";
}

export type Urgencia = "ok" | "atencao" | "urgente" | "zerado";

export function calcularUrgencia(i: Ingrediente): Urgencia {
  if (i.quantidade_atual <= 0) return "zerado";
  if (i.quantidade_atual <= i.estoque_critico) return "urgente";
  if (i.quantidade_atual <= i.estoque_minimo) return "atencao";
  return "ok";
}

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  ok: "✅ OK",
  atencao: "⚠️ Atenção",
  urgente: "🔴 Urgente",
  zerado: "⚫ Zerado",
};

export const URGENCIA_COLOR: Record<Urgencia, string> = {
  ok: "#22c55e",
  atencao: "#f59e0b",
  urgente: "#ef4444",
  zerado: "#6b7280",
};

// ── Mantidos do ScanStock original ────────────────────────────────────────────

export interface Produto {
  id_produto?: number;
  codigo: string;
  nome: string;
  descricao?: string;
  unidade: string;
}

export interface Movimento {
  id_movimento?: number;
  ingrediente_id: number;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  operador: string;
  observacao?: string;
  data_movimento: string;
  status: "0" | "1";
}
