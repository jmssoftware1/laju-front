import axios, { AxiosError } from "axios";

export const api = axios.create({
 baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 5000,
  headers: { "Content-Type": "application/json" },
});

// Interceptor de RESPONSE — trata erros globais
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export type { AxiosError };
api.interceptors.request.use((config) => {
 const token=sessionStorage.getItem("@LajuStore:token");
 if(token) config.headers.Authorization=`Bearer ${token}`;
 return config;
});
