import { api } from "../utils/axios";
import type { Movimento } from "../types";

export interface FiltrosMovimento {
  tipo?:        "ENTRADA" | "SAIDA" | "";
  operador?:    string;
  data_inicio?: string;
  data_fim?:    string;
}

export const MovimentoService = {
  cadastrar: async (dados: Movimento) => {
    const response = await api.post("/movimentos", dados);
    return response.data;
  },

  listarTodos: async (filtros: FiltrosMovimento = {}) => {
    const params = new URLSearchParams();
    if (filtros.tipo)        params.append("tipo",        filtros.tipo);
    if (filtros.operador)    params.append("operador",    filtros.operador);
    if (filtros.data_inicio) params.append("data_inicio", filtros.data_inicio);
    if (filtros.data_fim)    params.append("data_fim",    filtros.data_fim);
    const response = await api.get(`/movimentos?${params.toString()}`);
    return response.data;
  },

  editar: async (id: number, dados: Partial<Movimento>) => {
    const response = await api.put(`/movimentos/${id}`, dados);
    return response.data;
  },

  deletar: async (id: number) => {
    await api.delete(`/movimentos/${id}`);
  },
};