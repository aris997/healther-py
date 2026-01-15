import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { AuthProvider, useAuth } from "./auth";

const features = [
  { title: "Multi-workspace", detail: "Separate clients or teams with fine-grained roles." },
  { title: "Smart checks", detail: "Custom cadence, body validation, and latency capture." },
  { title: "Real-time alerts", detail: "Email fan-out powered by Redis + RQ workers." },
];

const statCards = [
  { label: "Uptime tracked", value: "90 days", tone: "muted" },
  { label: "Latency budget", value: "< 120 ms", tone: "bright" },
  { label: "Notifications", value: "Email / GitHub login", tone: "muted" },
];

const THEME_KEY = "healther.theme";
const DAY_MS = 24 * 60 * 60 * 1000;

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function getSavedTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "light" || theme === "dark" || theme === "system") return theme;
  return "system";
}

function toDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function dailyBars(events, days = 90) {
  const buckets = {};
  events.forEach((event) => {
    if (!event.created_at) return;
    const key = toDayKey(new Date(event.created_at));
    if (!buckets[key]) buckets[key] = { total: 0, healthy: 0 };
    buckets[key].total += 1;
    if (event.status === "healthy") buckets[key].healthy += 1;
  });

  const bars = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * DAY_MS);
    const key = toDayKey(date);
    const bucket = buckets[key];
    const ratio = bucket ? bucket.healthy / bucket.total : null;
    bars.push({ key, ratio, date });
  }
  return bars;
}

function barTone(ratio) {
  if (ratio === null) return "unknown";
  if (ratio >= 1) return "healthy";
  if (ratio >= 0.95) return "warn";
  if (ratio >= 0.5) return "degraded";
  return "down";
}

function latencySeries(events, limit = 60) {
  return events
    .filter((event) => event.response_time_ms != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-limit)
    .map((event) => event.response_time_ms);
}

function LatencyChart({ series }) {
  if (!series.length) {
    return <div className="muted">No latency samples yet.</div>;
  }
  const width = 420;
  const height = 140;
  const padding = 12;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series
    .map((value, index) => {
      const x = padding + (index / Math.max(series.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="latency-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Latency chart">
        <polyline className="latency-line" points={points} />
      </svg>
      <div className="latency-stats">
        Latest {series[series.length - 1].toFixed(1)} ms · Min {min.toFixed(1)} ms · Max {max.toFixed(1)} ms
      </div>
    </div>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);
  return (
    <div className="page">
      <nav className="topnav">
        <Link className="logo" to="/">
          Healther
        </Link>
        <div className="topnav__links">
          <Link to="/">Home</Link>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/settings">Settings</Link>
              <button className="btn btn--ghost small" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link className="btn btn--primary small" to="/register">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
      {children}
    </div>
  );
}

function Landing() {
  return (
    <>
      <header className="hero">
        <div className="hero__badge">Cloud Dancer / 2026</div>
        <h1>
          Stay ahead of outages.
          <span className="accent"> Healther</span> keeps watch.
        </h1>
        <p>
          Track endpoints, share public status pages, and alert the right people the moment something drifts out of spec.
        </p>
        <div className="hero__actions">
          <Link className="btn btn--primary" to="/dashboard">
            Launch dashboard
          </Link>
          <Link className="btn btn--ghost" to="/register">
            Create account
          </Link>
        </div>
      </header>

      <section className="grid stats">
        {statCards.map((card) => (
          <article key={card.label} className={`stat-card stat-card--${card.tone}`}>
            <div className="stat-card__label">{card.label}</div>
            <div className="stat-card__value">{card.value}</div>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Workspace overview</h2>
          <div className="pill">Live demo</div>
        </div>
        <div className="table">
          <div className="row head">
            <div>Service</div>
            <div>Target</div>
            <div>Cadence</div>
            <div>Status</div>
          </div>
          {[
            { name: "Marketing site", target: "200 OK", cadence: "15 min", status: "Healthy" },
            { name: "API v1", target: "201 + body match", cadence: "5 min", status: "Degraded" },
            { name: "Billing", target: "200", cadence: "30 min", status: "Down" },
          ].map((row) => (
            <div className="row" key={row.name}>
              <div>{row.name}</div>
              <div>{row.target}</div>
              <div>{row.cadence}</div>
              <div className={`badge badge--${row.status.toLowerCase()}`}>{row.status}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid features">
        {features.map((item) => (
          <article key={item.title} className="feature">
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
      </section>

      <footer className="footer">
        <div>Built for resilient teams — Healther</div>
        <div className="dots" aria-hidden="true">
          ● ● ●
        </div>
        <div>Light / Dark ready</div>
      </footer>
    </>
  );
}

function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { login, register, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-card">
      <h2>{isRegister ? "Create your account" : "Sign in"}</h2>
      <form onSubmit={submit} className="form">
        <label>
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {isRegister ? "Sign up" : "Login"}
        </button>
      </form>
      <div className="auth-alt">
        {isRegister ? (
          <>
            Already have an account? <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            New here? <Link to="/register">Create an account</Link>
          </>
        )}
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="panel">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Dashboard() {
  const { token, user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.listWorkspaces(token);
      setWorkspaces(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createWorkspace(token, { name, is_public: isPublic });
      setName("");
      setIsPublic(false);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="dashboard">
      <div className="panel">
        <div className="panel__header">
          <h2>Hello, {user?.email || "friend"}</h2>
          <span className="pill">Workspaces: {workspaces.length}</span>
        </div>
        <p>Create a new workspace or open an existing one to manage watchers.</p>
        <form onSubmit={create} className="form inline">
          <input required placeholder="Workspace name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="checkbox">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public status page
          </label>
          <button className="btn btn--primary" type="submit">
            Create
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="grid workspace-grid">
        {workspaces.map((ws) => (
          <Link key={ws.id} className="workspace-card" to={`/workspaces/${ws.id}`}>
            <div className="workspace-card__name">{ws.name}</div>
            <div className="workspace-card__meta">{ws.is_public ? "Public" : "Private"}</div>
          </Link>
        ))}
        {workspaces.length === 0 && <div className="muted">No workspaces yet. Create one above.</div>}
      </div>
    </div>
  );
}

function Watchers() {
  const { token, user } = useAuth();
  const { id } = useParams();
  const [watchers, setWatchers] = useState([]);
  const [selectedWatcher, setSelectedWatcher] = useState(null);
  const [events, setEvents] = useState([]);
  const [workspaceEvents, setWorkspaceEvents] = useState([]);
  const [healthExpanded, setHealthExpanded] = useState(null);
  const [healthError, setHealthError] = useState("");
  const [form, setForm] = useState({
    name: "",
    url: "",
    expected_status: 200,
    expected_body: "",
    every_value: 15,
    every_unit: "minutes",
  });
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [memberError, setMemberError] = useState("");
  const [memberBusy, setMemberBusy] = useState(false);
  const [invite, setInvite] = useState({ email: "", full_name: "", role: "observer" });
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientForm, setRecipientForm] = useState({ email: "", display_name: "" });
  const [recipientError, setRecipientError] = useState("");
  const [recipientBusy, setRecipientBusy] = useState(false);

  const loadWatchers = async () => {
    try {
      const data = await api.listWatchers(token, id);
      setWatchers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadWorkspaceEvents = async () => {
    try {
      const data = await api.listWorkspaceEvents(token, id);
      setWorkspaceEvents(data);
      setHealthError("");
    } catch (err) {
      setHealthError(err.message);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await api.listMembers(token, id);
      setMembers(data);
      setMemberError("");
    } catch (err) {
      setMemberError(err.message);
    }
  };

  const loadRecipients = async () => {
    try {
      const data = await api.listRecipients(token, id);
      setRecipients(data);
      setRecipientError("");
    } catch (err) {
      setRecipientError(err.message);
    }
  };

  useEffect(() => {
    loadWatchers();
    loadMembers();
    loadRecipients();
    loadWorkspaceEvents();
  }, [id]);

  const selectWatcher = async (watcher) => {
    setSelectedWatcher(watcher.id);
    setEditForm({
      name: watcher.name ?? "",
      url: watcher.url ?? "",
      expected_status: watcher.expected_status ?? 200,
      expected_body: watcher.expected_body ?? "",
      every_value: watcher.every_value ?? 15,
      every_unit: watcher.every_unit ?? "minutes",
    });
    try {
      const data = await api.listWatcherEvents(token, watcher.id);
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "expected_status" || name === "every_value" ? Number(value) : value }));
  };

  const onEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: name === "expected_status" || name === "every_value" ? Number(value) : value,
    }));
  };

  const createWatcher = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createWatcher(token, id, form);
      setForm({ ...form, name: "", url: "", expected_body: "" });
      await loadWatchers();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedWatcher || !editForm) return;
    setEditError("");
    setEditBusy(true);
    try {
      const payload = {
        ...editForm,
        expected_body: editForm.expected_body ? editForm.expected_body : null,
      };
      await api.updateWatcher(token, selectedWatcher, payload);
      await loadWatchers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const onInviteChange = (e) => {
    const { name, value } = e.target;
    setInvite((prev) => ({ ...prev, [name]: value }));
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setMemberError("");
    setMemberBusy(true);
    try {
      await api.inviteMember(token, id, invite);
      setInvite({ email: "", full_name: "", role: "observer" });
      await loadMembers();
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setMemberBusy(false);
    }
  };

  const updateRole = async (userId, role) => {
    setMemberError("");
    setMemberBusy(true);
    try {
      await api.updateMemberRole(token, id, userId, { role });
      await loadMembers();
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setMemberBusy(false);
    }
  };

  const removeMember = async (userId) => {
    setMemberError("");
    setMemberBusy(true);
    try {
      await api.removeMember(token, id, userId);
      await loadMembers();
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setMemberBusy(false);
    }
  };

  const onRecipientChange = (e) => {
    const { name, value } = e.target;
    setRecipientForm((prev) => ({ ...prev, [name]: value }));
  };

  const createRecipient = async (e) => {
    e.preventDefault();
    setRecipientError("");
    setRecipientBusy(true);
    try {
      const payload = {
        ...recipientForm,
        display_name: recipientForm.display_name || null,
      };
      await api.createRecipient(token, id, payload);
      setRecipientForm({ email: "", display_name: "" });
      await loadRecipients();
    } catch (err) {
      setRecipientError(err.message);
    } finally {
      setRecipientBusy(false);
    }
  };

  const toggleRecipient = async (recipientId, isActive) => {
    setRecipientError("");
    setRecipientBusy(true);
    try {
      await api.updateRecipient(token, id, recipientId, { is_active: isActive });
      await loadRecipients();
    } catch (err) {
      setRecipientError(err.message);
    } finally {
      setRecipientBusy(false);
    }
  };

  const removeRecipient = async (recipientId) => {
    setRecipientError("");
    setRecipientBusy(true);
    try {
      await api.removeRecipient(token, id, recipientId);
      await loadRecipients();
    } catch (err) {
      setRecipientError(err.message);
    } finally {
      setRecipientBusy(false);
    }
  };

  const publicLink = useMemo(() => `${window.location.origin}/public/${id}`, [id]);
  const eventsByWatcher = useMemo(() => {
    const grouped = {};
    workspaceEvents.forEach((event) => {
      if (!event.watcher_id) return;
      if (!grouped[event.watcher_id]) grouped[event.watcher_id] = [];
      grouped[event.watcher_id].push(event);
    });
    return grouped;
  }, [workspaceEvents]);

  return (
    <div className="workspace-detail">
      <div className="panel">
        <div className="panel__header">
          <h2>Watchers</h2>
          <span className="pill">Share: {publicLink}</span>
        </div>
        <form className="form" onSubmit={createWatcher}>
          <div className="form-grid">
            <label>
              Name
              <input required name="name" value={form.name} onChange={onChange} />
            </label>
            <label>
              URL
              <input required name="url" value={form.url} onChange={onChange} placeholder="https://example.com/health" />
            </label>
            <label>
              Expected status
              <input required type="number" name="expected_status" value={form.expected_status} onChange={onChange} />
            </label>
            <label>
              Expected body contains
              <input name="expected_body" value={form.expected_body} onChange={onChange} placeholder="optional" />
            </label>
            <label>
              Every value
              <input required type="number" min="1" name="every_value" value={form.every_value} onChange={onChange} />
            </label>
            <label>
              Every unit
              <select name="every_unit" value={form.every_unit} onChange={onChange}>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
                <option value="weeks">weeks</option>
              </select>
            </label>
          </div>
          <button className="btn btn--primary" type="submit">
            Add watcher
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <div className="panel">
        <div className="panel__header">
          <div>
            <h2>Workspace health</h2>
            <div className="muted">Last 90 days uptime</div>
          </div>
          <span className="pill">{watchers.length} services</span>
        </div>
        {healthError && <div className="error">{healthError}</div>}
        <div className="uptime-table">
          {watchers.map((watcher) => {
            const watcherEvents = eventsByWatcher[watcher.id] || [];
            const bars = dailyBars(watcherEvents);
            const series = latencySeries(watcherEvents);
            const expanded = healthExpanded === watcher.id;
            return (
              <div key={watcher.id} className="uptime-card">
                <div className="uptime-row">
                  <div className="uptime-meta">
                    <div className="watcher-card__name">{watcher.name}</div>
                    <div className="muted">{watcher.url}</div>
                  </div>
                  <div className="status-strip status-strip--compact">
                    {bars.map((bar) => {
                      const tone = barTone(bar.ratio);
                      const label =
                        bar.ratio == null ? "No data" : `${Math.round(bar.ratio * 100)}% healthy`;
                      return (
                        <span
                          key={bar.key}
                          className={`day-bar day-bar--${tone}`}
                          title={`${bar.key}: ${label}`}
                        />
                      );
                    })}
                  </div>
                  <button
                    className="btn btn--ghost small"
                    type="button"
                    onClick={() => setHealthExpanded(expanded ? null : watcher.id)}
                  >
                    {expanded ? "Hide latency" : "View latency"}
                  </button>
                </div>
                {expanded && (
                  <div className="latency-panel">
                    <LatencyChart series={series} />
                  </div>
                )}
              </div>
            );
          })}
          {watchers.length === 0 && !healthError && (
            <div className="muted">No services yet. Create a watcher to get started.</div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <h2>Workspace members</h2>
          <span className="pill">{members.length} members</span>
        </div>
        <form className="form inline" onSubmit={submitInvite}>
          <input
            required
            name="email"
            type="email"
            placeholder="invite@email.com"
            value={invite.email}
            onChange={onInviteChange}
          />
          <input
            name="full_name"
            placeholder="Full name (optional)"
            value={invite.full_name}
            onChange={onInviteChange}
          />
          <select name="role" value={invite.role} onChange={onInviteChange}>
            <option value="observer">observer</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
          <button className="btn btn--primary small" type="submit" disabled={memberBusy}>
            Invite
          </button>
        </form>
        {memberError && <div className="error">{memberError}</div>}
        <div className="table members-table">
          <div className="row head members-row">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Actions</div>
          </div>
          {members.map((m) => (
            <div key={m.user_id} className="row members-row">
              <div>{m.full_name || "—"}</div>
              <div>{m.email}</div>
              <div>
                <select
                  value={m.role}
                  onChange={(e) => updateRole(m.user_id, e.target.value)}
                  disabled={memberBusy}
                >
                  <option value="observer">observer</option>
                  <option value="admin">admin</option>
                  <option value="owner">owner</option>
                </select>
              </div>
              <div className="member-actions">
                <button
                  className="btn btn--ghost small"
                  type="button"
                  onClick={() => removeMember(m.user_id)}
                  disabled={memberBusy || m.user_id === user?.id}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {members.length === 0 && !memberError && <div className="muted">No members yet.</div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <h2>Alert recipients</h2>
          <span className="pill">{recipients.length} recipients</span>
        </div>
        <form className="form inline" onSubmit={createRecipient}>
          <input
            required
            name="email"
            type="email"
            placeholder="alerts@company.com"
            value={recipientForm.email}
            onChange={onRecipientChange}
          />
          <input
            name="display_name"
            placeholder="On-call (optional)"
            value={recipientForm.display_name}
            onChange={onRecipientChange}
          />
          <button className="btn btn--primary small" type="submit" disabled={recipientBusy}>
            Add
          </button>
        </form>
        {recipientError && <div className="error">{recipientError}</div>}
        <div className="table recipients-table">
          <div className="row head recipients-row">
            <div>Email</div>
            <div>Label</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {recipients.map((recipient) => (
            <div key={recipient.id} className="row recipients-row">
              <div>{recipient.email}</div>
              <div className="muted">{recipient.display_name || "—"}</div>
              <div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={recipient.is_active}
                    onChange={(e) => toggleRecipient(recipient.id, e.target.checked)}
                    disabled={recipientBusy}
                  />
                  {recipient.is_active ? "Active" : "Paused"}
                </label>
              </div>
              <div className="member-actions">
                <button
                  className="btn btn--ghost small"
                  type="button"
                  onClick={() => removeRecipient(recipient.id)}
                  disabled={recipientBusy}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {recipients.length === 0 && !recipientError && (
            <div className="muted">No recipients yet. Add one above.</div>
          )}
        </div>
      </div>

      <div className="grid watcher-grid">
        {watchers.map((w) => (
          <div
            key={w.id}
            className={`watcher-card ${selectedWatcher === w.id ? "active" : ""}`}
            onClick={() => selectWatcher(w)}
          >
            <div className="watcher-card__name">{w.name}</div>
            <div className="watcher-card__meta">
              {w.expected_status} · every {w.every_value} {w.every_unit}
            </div>
            <div className="watcher-card__url">{w.url}</div>
          </div>
        ))}
        {watchers.length === 0 && <div className="muted">No watchers yet. Add one above.</div>}
      </div>

      {selectedWatcher && (
        <div className="panel">
          <div className="panel__header">
            <h3>Latest events</h3>
          </div>
          <div className="table">
            <div className="row head">
              <div>Status</div>
              <div>Code</div>
              <div>Latency (ms)</div>
              <div>Message</div>
            </div>
            {events.map((e) => (
              <div key={e.id} className="row">
                <div className={`badge badge--${e.status}`}>{e.status}</div>
                <div>{e.response_status ?? "—"}</div>
                <div>{e.response_time_ms ?? "—"}</div>
                <div className="muted">{e.message ?? ""}</div>
              </div>
            ))}
            {events.length === 0 && <div className="muted">No events yet for this watcher.</div>}
          </div>
        </div>
      )}

      {selectedWatcher && editForm && (
        <div className="panel">
          <div className="panel__header">
            <h3>Edit watcher</h3>
            <span className="pill">ID {selectedWatcher}</span>
          </div>
          <form className="form" onSubmit={submitEdit}>
            <div className="form-grid">
              <label>
                Name
                <input required name="name" value={editForm.name} onChange={onEditChange} />
              </label>
              <label>
                URL
                <input required name="url" value={editForm.url} onChange={onEditChange} />
              </label>
              <label>
                Expected status
                <input
                  required
                  type="number"
                  name="expected_status"
                  value={editForm.expected_status}
                  onChange={onEditChange}
                />
              </label>
              <label>
                Expected body contains
                <input name="expected_body" value={editForm.expected_body} onChange={onEditChange} />
              </label>
              <label>
                Every value
                <input
                  required
                  type="number"
                  min="1"
                  name="every_value"
                  value={editForm.every_value}
                  onChange={onEditChange}
                />
              </label>
              <label>
                Every unit
                <select name="every_unit" value={editForm.every_unit} onChange={onEditChange}>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
              </label>
            </div>
            <button className="btn btn--primary" type="submit" disabled={editBusy}>
              Save changes
            </button>
          </form>
          {editError && <div className="error">{editError}</div>}
        </div>
      )}
    </div>
  );
}

function Settings() {
  const { token, user, refresh } = useAuth();
  const [theme, setTheme] = useState(getSavedTheme());
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    pronouns: "",
    city: "",
    bio: "",
    avatar_url: "",
    github_url: "",
    linkedin_url: "",
    website_url: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = getSavedTheme();
    setTheme(saved);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      pronouns: user.pronouns || "",
      city: user.city || "",
      bio: user.bio || "",
      avatar_url: user.avatar_url || "",
      github_url: user.github_url || "",
      linkedin_url: user.linkedin_url || "",
      website_url: user.website_url || "",
    });
  }, [user]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value === "" ? null : value])
      );
      await api.updateProfile(token, payload);
      await refresh();
      setStatus("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings">
      <div className="panel">
        <div className="panel__header">
          <h2>Settings</h2>
          <span className="pill">Account</span>
        </div>
        <div className="settings-meta">
          <div className="muted">Signed in as</div>
          <div>{user?.email}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__header">
          <h3>Appearance</h3>
        </div>
        <label>
          Theme
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="panel">
        <div className="panel__header">
          <h3>Profile</h3>
          <span className="pill">Public identity</span>
        </div>
        <form className="form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              First name
              <input name="first_name" value={form.first_name} onChange={onChange} />
            </label>
            <label>
              Last name
              <input name="last_name" value={form.last_name} onChange={onChange} />
            </label>
            <label>
              Pronouns
              <input name="pronouns" value={form.pronouns} onChange={onChange} placeholder="they/them" />
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={onChange} />
            </label>
            <label className="form-span">
              Bio
              <textarea name="bio" rows="3" value={form.bio} onChange={onChange} />
            </label>
            <label className="form-span">
              Avatar URL
              <input name="avatar_url" value={form.avatar_url} onChange={onChange} placeholder="https://..." />
            </label>
            <label>
              GitHub
              <input name="github_url" value={form.github_url} onChange={onChange} placeholder="https://github.com/you" />
            </label>
            <label>
              LinkedIn
              <input
                name="linkedin_url"
                value={form.linkedin_url}
                onChange={onChange}
                placeholder="https://linkedin.com/in/you"
              />
            </label>
            <label>
              Website
              <input name="website_url" value={form.website_url} onChange={onChange} placeholder="https://you.com" />
            </label>
          </div>
          {form.avatar_url && (
            <div className="avatar-preview">
              <img src={form.avatar_url} alt="Profile preview" />
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {status && <div className="success">{status}</div>}
          <button className="btn btn--primary" type="submit" disabled={saving}>
            Save profile
          </button>
        </form>
      </div>
    </div>
  );
}

function PublicWorkspace() {
  const { id } = useParams();
  const [watchers, setWatchers] = useState([]);
  const [events, setEvents] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([api.listPublicWatchers(id), api.listPublicEvents(id)])
      .then(([watcherData, eventData]) => {
        if (!active) return;
        setWatchers(watcherData);
        setEvents(eventData);
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [id]);

  const eventsByWatcher = useMemo(() => {
    const grouped = {};
    events.forEach((event) => {
      if (!event.watcher_id) return;
      if (!grouped[event.watcher_id]) grouped[event.watcher_id] = [];
      grouped[event.watcher_id].push(event);
    });
    return grouped;
  }, [events]);

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2>Public status</h2>
          <div className="muted">Workspace {id}</div>
        </div>
        <span className="pill">90-day uptime</span>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="grid public-grid">
        {watchers.map((watcher) => {
          const watcherEvents = eventsByWatcher[watcher.id] || [];
          const bars = dailyBars(watcherEvents);
          const series = latencySeries(watcherEvents);
          const expanded = expandedId === watcher.id;
          return (
            <div key={watcher.id} className="public-card">
              <div className="public-card__header">
                <div>
                  <div className="public-card__name">{watcher.name}</div>
                  <div className="public-card__meta">
                    Target {watcher.expected_status} · every {watcher.every_value} {watcher.every_unit}
                  </div>
                </div>
                <button
                  className="btn btn--ghost small"
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : watcher.id)}
                >
                  {expanded ? "Hide latency" : "View latency"}
                </button>
              </div>
              <div className="status-strip">
                {bars.map((bar) => {
                  const tone = barTone(bar.ratio);
                  const label =
                    bar.ratio == null ? "No data" : `${Math.round(bar.ratio * 100)}% healthy`;
                  return (
                    <span
                      key={bar.key}
                      className={`day-bar day-bar--${tone}`}
                      title={`${bar.key}: ${label}`}
                    />
                  );
                })}
              </div>
              {expanded && (
                <div className="latency-panel">
                  <LatencyChart series={series} />
                </div>
              )}
            </div>
          );
        })}
        {watchers.length === 0 && !error && <div className="muted">No public watchers found.</div>}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthForm mode="login" />} />
            <Route path="/register" element={<AuthForm mode="register" />} />
            <Route
              path="/dashboard"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/workspaces/:id"
              element={
                <Protected>
                  <Watchers />
                </Protected>
              }
            />
            <Route
              path="/settings"
              element={
                <Protected>
                  <Settings />
                </Protected>
              }
            />
            <Route path="/public/:id" element={<PublicWorkspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
