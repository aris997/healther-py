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

function Layout({ children }) {
  const { user, logout } = useAuth();
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
  const { token } = useAuth();
  const { id } = useParams();
  const [watchers, setWatchers] = useState([]);
  const [selectedWatcher, setSelectedWatcher] = useState(null);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    name: "",
    url: "",
    expected_status: 200,
    expected_body: "",
    every_value: 15,
    every_unit: "minutes",
  });
  const [error, setError] = useState("");

  const loadWatchers = async () => {
    try {
      const data = await api.listWatchers(token, id);
      setWatchers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadWatchers();
  }, [id]);

  const loadEvents = async (watcherId) => {
    setSelectedWatcher(watcherId);
    try {
      const data = await api.listWatcherEvents(token, watcherId);
      setEvents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === "expected_status" || name === "every_value" ? Number(value) : value }));
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

  const publicLink = useMemo(() => `${window.location.origin}/public/${id}`, [id]);

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

      <div className="grid watcher-grid">
        {watchers.map((w) => (
          <div key={w.id} className={`watcher-card ${selectedWatcher === w.id ? "active" : ""}`} onClick={() => loadEvents(w.id)}>
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
    </div>
  );
}

function PublicWorkspace() {
  const { id } = useParams();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listPublicEvents(id)
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div className="panel">
      <div className="panel__header">
        <h2>Public status</h2>
        <span className="pill">Workspace {id}</span>
      </div>
      {error && <div className="error">{error}</div>}
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
        {events.length === 0 && <div className="muted">No public events.</div>}
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
            <Route path="/public/:id" element={<PublicWorkspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
