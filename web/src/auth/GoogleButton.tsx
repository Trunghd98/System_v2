import { useEffect, useRef } from "react";
import { useAuth } from "./auth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string;

export default function GoogleButton({
  onError,
}: {
  onError?: (m: string) => void;
}) {
  const { dangNhap } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      const g = (window as any).google;
      if (!g) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (resp: any) => {
          try {
            await dangNhap(resp.credential);
          } catch (e: any) {
            onError?.(e.message);
          }
        },
      });
      if (ref.current)
        g.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 260,
        });
    };
    document.body.appendChild(s);
  }, []);
  return (
    <div ref={ref} style={{ display: "flex", justifyContent: "center" }} />
  );
}
