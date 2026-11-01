import { api } from "../utils/axios";
import type { Produto } from "../types";

export const ProdutoService = {
  // Busca um produto pelo código de barras — retorna null se não existir
  buscarPorCodigo: async (codigo: string): Promise<Produto | null> => {
    try {
      const response = await api.get(`/produtos/${encodeURIComponent(codigo)}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null; // código desconhecido — não é erro
      console.error("Erro ao buscar produto:", error);
      throw error;
    }
  },

  listarTodos: async (): Promise<Produto[]> => {
    const response = await api.get("/produtos");
    return response.data;
  },

  cadastrar: async (dados: Omit<Produto, "id_produto">): Promise<Produto> => {
    const response = await api.post("/produtos", dados);
    return response.data;
  },
};