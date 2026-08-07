import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authGoogle, getMe, getToken, setToken, clearToken } from "../lib/api";

export interface User {
  email: string;
  ho_ten: string;
  staff_id: string;
  vaiTro: string[];
  modules: string[];
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  dangNhap: (idToken: string) => Promise<void>;
  dangXuat: () => void;
}
const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => setUser(u))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function dangNhap(idToken: string) {
    const data = await authGoogle(idToken);
    setToken(data.token);
    setUser(data.user);
  }
  function dangXuat() {
    clearToken();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, dangNhap, dangXuat }}>
      {children}
    </Ctx.Provider>
  );
}
