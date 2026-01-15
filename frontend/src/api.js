// Default to versioned API base
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

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
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/token", { method: "POST", body: data }),
  me: (token) => request("/me", { token }),
  listWorkspaces: (token) => request("/workspaces", { token }),
  createWorkspace: (token, data) =>
    request("/workspaces", { method: "POST", body: data, token }),
  listWatchers: (token, workspaceId) => request(`/workspaces/${workspaceId}/watchers`, { token }),
  createWatcher: (token, workspaceId, data) =>
    request(`/workspaces/${workspaceId}/watchers`, { method: "POST", body: data, token }),
  listWorkspaceEvents: (token, workspaceId) =>
    request(`/workspaces/${workspaceId}/events`, { token }),
  updateWatcher: (token, watcherId, data) =>
    request(`/watchers/${watcherId}`, { method: "PATCH", body: data, token }),
  updateProfile: (token, data) => request("/me", { method: "PATCH", body: data, token }),
  listMembers: (token, workspaceId) => request(`/workspaces/${workspaceId}/members`, { token }),
  inviteMember: (token, workspaceId, data) =>
    request(`/workspaces/${workspaceId}/members/invite`, { method: "POST", body: data, token }),
  updateMemberRole: (token, workspaceId, userId, data) =>
    request(`/workspaces/${workspaceId}/members/${userId}`, { method: "PATCH", body: data, token }),
  removeMember: (token, workspaceId, userId) =>
    request(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE", token }),
  listRecipients: (token, workspaceId) =>
    request(`/workspaces/${workspaceId}/recipients`, { token }),
  createRecipient: (token, workspaceId, data) =>
    request(`/workspaces/${workspaceId}/recipients`, { method: "POST", body: data, token }),
  updateRecipient: (token, workspaceId, recipientId, data) =>
    request(`/workspaces/${workspaceId}/recipients/${recipientId}`, {
      method: "PATCH",
      body: data,
      token,
    }),
  removeRecipient: (token, workspaceId, recipientId) =>
    request(`/workspaces/${workspaceId}/recipients/${recipientId}`, { method: "DELETE", token }),
  listWatcherEvents: (token, watcherId) => request(`/watchers/${watcherId}/events`, { token }),
  listPublicWatchers: (workspaceId) => request(`/public/workspaces/${workspaceId}/watchers`),
  listPublicEvents: (workspaceId) => request(`/public/workspaces/${workspaceId}/events`),
};
