import { api } from "../utils/axios";
import type { Ingrediente, Categoria } from "../types";

// O PostgreSQL devolve colunas DECIMAL como string (ex: "15.00") — converte
// sempre para number aqui, num só sítio, para o resto da app nunca ter de
// se preocupar com isso.
function normalizar(i: any): Ingrediente {
  return {
    ...i,
    quantidade_atual: Number(i.quantidade_atual),
    estoque_minimo: Number(i.estoque_minimo),
    estoque_critico: Number(i.estoque_critico),
    qtd_compra_normal: Number(i.qtd_compra_normal),
  };
}

export const IngredienteService = {
  listarTodos: async (): Promise<Ingrediente[]> => {
    const r = await api.get("/ingredientes");
    return r.data.map(normalizar);
  },

  buscarPorId: async (id: number): Promise<Ingrediente> => {
    const r = await api.get(`/ingredientes/${id}`);
    return normalizar(r.data);
  },

  buscarPorCodigo: async (codigo: string): Promise<Ingrediente | null> => {
    try {
      const r = await api.get(
        `/ingredientes/codigo/${encodeURIComponent(codigo)}`,
      );
      return normalizar(r.data);
    } catch (e: any) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  },

  criar: async (
    dados: Omit<
      Ingrediente,
      "id_ingrediente" | "quantidade_atual" | "status" | "categoria_nome"
    >,
  ): Promise<Ingrediente> => {
    const r = await api.post("/ingredientes", dados);
    return normalizar(r.data);
  },

  atualizar: async (
    id: number,
    dados: Partial<Ingrediente>,
  ): Promise<Ingrediente> => {
    const r = await api.put(`/ingredientes/${id}`, dados);
    return normalizar(r.data);
  },

  deletar: async (id: number): Promise<void> => {
    await api.delete(`/ingredientes/${id}`);
  },

  adicionar: async (
    id: number,
    quantidade: number,
    operador: string,
    observacao?: string,
  ): Promise<Ingrediente> => {
    const r = await api.post(`/ingredientes/${id}/adicionar`, {
      quantidade,
      operador,
      observacao,
    });
    return normalizar(r.data);
  },

  retirar: async (
    id: number,
    quantidade: number,
    operador: string,
    observacao?: string,
  ): Promise<Ingrediente> => {
    const r = await api.post(`/ingredientes/${id}/retirar`, {
      quantidade,
      operador,
      observacao,
    });
    return normalizar(r.data);
  },

  listarCategorias: async (): Promise<Categoria[]> => {
    const r = await api.get("/categorias");
    return r.data;
  },
};
