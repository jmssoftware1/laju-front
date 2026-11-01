import React, { createContext, useContext, useState, useEffect } from "react";
import type { Operador } from "../types";

interface AuthContextType {
  operador: Operador | null;
  login: (operadorData: Operador) => void;
  logout: () => void;
  updateOperador: (dados: Partial<Operador>) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operador, setOperador] = useState<Operador | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("@LajuStore:operador");
      if (raw && sessionStorage.getItem("@LajuStore:token")) setOperador(JSON.parse(raw));
    } catch {
      localStorage.removeItem("@LajuStore:operador");
    }
    setLoading(false);
  }, []);

  const login = (operadorData: Operador) => {
    setOperador(operadorData);
    localStorage.setItem("@LajuStore:operador", JSON.stringify(operadorData));
  };

  const logout = () => {
    setOperador(null);
    localStorage.removeItem("@LajuStore:operador");
    sessionStorage.removeItem("@LajuStore:token");
  };

  // Atualiza campos do operador sem fazer novo login
  const updateOperador = (dados: Partial<Operador>) => {
    setOperador((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...dados };
      localStorage.setItem("@LajuStore:operador", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ operador, login, logout, updateOperador, isAuthenticated: !!operador, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};