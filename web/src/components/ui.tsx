import type { ReactNode, CSSProperties } from "react";

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 16,
};

export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div style={overlay} onClick={onClose}>
      <div
        className="tcnf-card"
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "88vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 12 }}
        >
          <h3 style={{ margin: 0, color: "var(--navy)" }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--ink-soft)",
            }}
          >
            ✕
          </button>
        </div>
        {children}
        {footer && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span
        style={{
          fontSize: 13,
          color: "var(--ink-soft)",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 10,
  border: "1px solid var(--line)",
  boxSizing: "border-box",
  fontSize: 14,
  background: "#fff",
};

export function Btn({
  children,
  onClick,
  kind = "primary",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = kind === "ghost" ? "tcnf-btn tcnf-btn--ghost" : "tcnf-btn";
  return (
    <button
      type={type}
      className={cls}
      onClick={onClick}
      disabled={disabled}
      style={disabled ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
    >
      {children}
    </button>
  );
}

export const thStyle: CSSProperties = {
  padding: "10px 12px",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
export const tdStyle: CSSProperties = { padding: "10px 12px" };
export const tdRight: CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
};
