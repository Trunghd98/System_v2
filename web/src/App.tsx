import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/auth";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ModulePage from "./pages/ModulePage";
import { MODULES } from "./lib/modules";

function CanModule({ mod, children }: { mod: string; children: ReactNode }) {
  const { user } = useAuth();
  if (!user?.modules.includes(mod)) {
    return (
      <div className="tcnf-card">
        <p style={{ color: "var(--danger)", margin: 0 }}>
          Bạn không có quyền truy cập phần này.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function Shell() {
  const { user, loading } = useAuth();
  if (loading)
    return <div style={{ padding: 40, textAlign: "center" }}>Đang tải…</div>;
  if (!user) return <Login />;
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {MODULES.map((m) => (
            <Route
              key={m.id}
              path={m.path}
              element={
                <CanModule mod={m.id}>
                  <ModulePage ten={m.label} />
                </CanModule>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
