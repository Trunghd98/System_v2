// Client gọi API Worker: gắn JWT, xử lý envelope {ok,data}/{ok,error}, tự đăng xuất khi 401.
const API = import.meta.env.VITE_API_URL as string;

export function getToken() {
  return localStorage.getItem("tcnf_token");
}
export function setToken(t: string) {
  localStorage.setItem("tcnf_token", t);
}
export function clearToken() {
  localStorage.removeItem("tcnf_token");
}

async function xuLy(res: Response) {
  const j = await res
    .json()
    .catch(() => ({ ok: false, error: "Phản hồi không hợp lệ" }));
  if (!j.ok) {
    if (res.status === 401) clearToken();
    throw new Error(j.error || "Lỗi");
  }
  return j.data;
}

export async function authGoogle(idToken: string) {
  const res = await fetch(`${API}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return xuLy(res); // { token, user }
}

export async function getMe() {
  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return xuLy(res);
}

export async function goiAPI(action: string, payload: any = {}) {
  const res = await fetch(`${API}/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  return xuLy(res);
}
