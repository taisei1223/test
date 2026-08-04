const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem("posture_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("posture_token", token);
  else localStorage.removeItem("posture_token");
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `リクエストに失敗しました (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse failure, use default message
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
  });
  return handle<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  return handle<T>(res);
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handle<T>(res);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Image bytes are served behind auth (Authorization header), so a plain
 * <img src> can't fetch them directly. Fetches the file and returns a
 * blob: URL the caller is responsible for revoking.
 */
export async function fetchImageObjectUrl(imageId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/images/${imageId}/file`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError(res.status, "画像の取得に失敗しました");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export { API_BASE };
