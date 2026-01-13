const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };
}

async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export const api = {
  register: (data) => request("/api/auth/register", { method: "POST", body: data }),
  login: (data) => request("/api/auth/token", { method: "POST", body: data }),
  me: (token) => request("/api/me", { token }),
  listWorkspaces: (token) => request("/api/workspaces", { token }),
  createWorkspace: (token, data) => request("/api/workspaces", { method: "POST", body: data, token }),
  listWatchers: (token, workspaceId) => request(`/api/workspaces/${workspaceId}/watchers`, { token }),
  createWatcher: (token, workspaceId, data) =>
    request(`/api/workspaces/${workspaceId}/watchers`, { method: "POST", body: data, token }),
  listWatcherEvents: (token, watcherId) => request(`/api/watchers/${watcherId}/events`, { token }),
  listPublicEvents: (workspaceId) => request(`/api/public/workspaces/${workspaceId}/events`),
};
