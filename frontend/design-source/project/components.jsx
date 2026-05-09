// Shared UI primitives + app shell (sidebar + topbar)
const { useState, useEffect, useMemo, useRef } = React;

// --- Format helpers
function fmtMoney(n, opts = {}) {
  const { compact = false, currency = "₽" } = opts;
  if (n == null) return "—";
  if (compact && Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " млн " + currency;
  if (compact && Math.abs(n) >= 1_000) return Math.round(n / 100) / 10 + "k " + currency;
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " " + currency;
}
function fmtDate(s) {return window.DATA.fmtDate(s);}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

// --- Avatar
const Avatar = ({ name, size = "md", src }) => {
  const cls = size === "lg" ? "av lg" : size === "xl" ? "av xl" : "av";
  return <span className={cls}>{src ? <img src={src} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} /> : initials(name || "?")}</span>;
};

// --- Status badge
const StatusBadge = ({ status, kind = "unit" }) => {
  const labels = {
    unit: { free: "Свободна", reserved: "Резерв", rented: "Арендована", blocked: "Блок." },
    container: { active: "Активен", inactive: "Неактивен", maintenance: "Обслуж." },
    rent: { active: "Активна", finished: "Завершена", cancelled: "Отменена" },
    location: { active: "Активна", inactive: "Неактивна" },
    role: { admin: "Администратор", manager: "Менеджер" }
  };
  const cls = kind === "role" ? `badge role-${status}` : `badge ${status}`;
  const label = (labels[kind] || {})[status] || status;
  return <span className={cls}><span className="dot"></span>{label}</span>;
};

// --- Button
const Button = ({ children, variant = "default", size = "md", icon, onClick, type = "button", disabled }) => {
  const cls = ["btn"];
  if (variant === "primary") cls.push("btn-primary");
  if (variant === "ghost") cls.push("btn-ghost");
  if (variant === "danger") cls.push("btn-danger");
  if (size === "sm") cls.push("sm");
  if (size === "lg") cls.push("lg");
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls.join(" ")} style={{ justifyContent: "center" }}>
      {icon && <Ic name={icon} className="ic" />}
      {children}
    </button>);

};

// --- Input field
const Field = ({ label, hint, children }) =>
<label className="field">
    {label && <span>{label}</span>}
    {children}
    {hint && <span className="t-small">{hint}</span>}
  </label>;


// --- Bar split chart for unit statuses
const SegmentBar = ({ free = 0, rented = 0, reserved = 0, blocked = 0, height = 6 }) => {
  const total = Math.max(free + rented + reserved + blocked, 1);
  const seg = (n, color) => n > 0 && <span style={{ width: `${n / total * 100}%`, background: color }} title={n}></span>;
  return (
    <div className="bar" style={{ height }}>
      {seg(rented, "var(--st-rented)")}
      {seg(reserved, "var(--st-reserved)")}
      {seg(free, "var(--st-free)")}
      {seg(blocked, "var(--st-blocked)")}
    </div>);

};

// --- KPI card
const KPI = ({ label, value, unit, sub, delta, deltaDir }) =>
<div className="kpi">
    <div className="label">{label}</div>
    <div className="value">{value}{unit && <span className="unit">{unit}</span>}</div>
    {(sub || delta) &&
  <div className="row gap-3" style={{ justifyContent: "space-between" }}>
        <span className="t-small">{sub}</span>
        {delta && <span className={`delta ${deltaDir || ""}`}>
          {deltaDir === "up" && <Ic name="arrow_up" size={12} />}
          {deltaDir === "down" && <Ic name="arrow_dn" size={12} />}
          {delta}
        </span>}
      </div>
  }
  </div>;


// --- Donut (status breakdown) — pure SVG
const Donut = ({ size = 140, thickness = 14, segs = [] }) => {
  // segs: [{value, color}]
  const total = Math.max(segs.reduce((s, x) => s + x.value, 0), 1);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-sunken)" strokeWidth={thickness} fill="none" />
      {segs.map((s, i) => {
        const len = s.value / total * c;
        const el =
        <circle key={i}
        cx={size / 2} cy={size / 2} r={r}
        stroke={s.color} strokeWidth={thickness} fill="none"
        strokeDasharray={`${len} ${c - len}`}
        strokeDashoffset={-off}
        strokeLinecap="butt" />;


        off += len;
        return el;
      })}
    </svg>);

};

// --- Area chart for revenue
const AreaChart = ({ data, height = 220, color = "var(--ink)" }) => {
  const w = 800,h = height;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const innerW = w - pad.l - pad.r,innerH = h - pad.t - pad.b;
  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const min = 0;
  const xs = (i) => pad.l + i / (data.length - 1) * innerW;
  const ys = (v) => pad.t + innerH - (v - min) / (max - min) * innerH;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(d.value)}`).join(" ");
  const area = `${path} L ${xs(data.length - 1)} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => max / ticks * i);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="area-chart" style={{ width: "1170px" }}>
      {tickVals.map((v, i) =>
      <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={ys(v)} y2={ys(v)} stroke="var(--line)" strokeDasharray={i === 0 ? "0" : "2 4"} />
          <text x={pad.l - 8} y={ys(v) + 4} fontSize="10" fill="var(--ink-3)" textAnchor="end" fontFamily="var(--mono)">
            {Math.round(v / 1000)}k
          </text>
        </g>
      )}
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-fill)" />
      <path d={path} stroke={color} strokeWidth="1.6" fill="none" />
      {data.map((d, i) => (i % 5 === 0 || i === data.length - 1) &&
      <text key={i} x={xs(i)} y={h - 8} fontSize="10" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--mono)">
          {new Date(d.date).getDate()}.{String(new Date(d.date).getMonth() + 1).padStart(2, "0")}
        </text>
      )}
    </svg>);

};

// --- Drawer
const Drawer = ({ open, onClose, children, width }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="drawer-back" onClick={onClose}></div>
      <aside className="drawer" style={width ? { width } : null}>{children}</aside>
    </>);

};

// --- Modal
const Modal = ({ open, onClose, children, width }) => {
  if (!open) return null;
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={width ? { maxWidth: width } : null} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>);

};

// --- Tabs
const Tabs = ({ tabs, value, onChange }) =>
<div className="tabs">
    {tabs.map((t) =>
  <button key={t.id} className={`tab ${value === t.id ? "active" : ""}`} onClick={() => onChange(t.id)}>
        {t.label}{t.count != null && <span className="muted" style={{ marginLeft: 6 }}>{t.count}</span>}
      </button>
  )}
  </div>;


// --- Empty state
const Empty = ({ title, hint, action }) =>
<div className="empty">
    <div className="h-2" style={{ color: "var(--ink-2)" }}>{title}</div>
    {hint && <div className="t-small mt-2">{hint}</div>}
    {action && <div className="mt-3">{action}</div>}
  </div>;


// --- Sidebar
const NAV = [
{ id: "dashboard", label: "Дашборд", icon: "dashboard", roles: ["admin", "manager"] },
{ id: "locations", label: "Локации", icon: "pin", roles: ["admin", "manager"] },
{ id: "containers", label: "Контейнеры", icon: "box", roles: ["admin", "manager"] },
{ id: "units", label: "Кладовки", icon: "grid", roles: ["admin", "manager"] },
{ id: "rents", label: "Аренды", icon: "receipt", roles: ["admin", "manager"] },
{ id: "analytics", label: "Аналитика", icon: "chart", roles: ["admin", "manager"] },
{ id: "users", label: "Сотрудники", icon: "user", roles: ["admin"] }];


const Sidebar = ({ route, setRoute, role, user, onLogout }) => {
  const counts = {
    locations: window.DATA.LOCATIONS.length,
    containers: window.DATA.CONTAINERS.length,
    units: window.DATA.UNITS.length,
    rents: window.DATA.RENTS.filter((r) => r.status === "active").length,
    users: window.DATA.USERS.length
  };
  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="col">
          <div className="brand-name">Storehaus</div>
          <div className="brand-sub">Operations</div>
        </div>
      </div>
      <div className="nav-section">
        <span className="label">Управление</span>
      </div>
      {NAV.filter((n) => n.roles.includes(role)).map((n) =>
      <button key={n.id} className={`nav-item ${route.page === n.id ? "active" : ""}`} onClick={() => setRoute({ page: n.id })}>
          <Ic name={n.icon} className="ic" />
          <span>{n.label}</span>
          {counts[n.id] != null && <span className="count tnum">{counts[n.id]}</span>}
        </button>
      )}
      <div className="nav-section">
        <span className="label">Аккаунт</span>
      </div>
      <button className={`nav-item ${route.page === "profile" ? "active" : ""}`} onClick={() => setRoute({ page: "profile" })}>
        <Ic name="settings" className="ic" />
        <span>Профиль</span>
      </button>
      <div className="sidebar-foot">
        <div className="user-pill">
          <Avatar name={user.name} />
          <div className="col" style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div className="t-small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
          <button className="icon-btn" title="Выйти" onClick={onLogout}><Ic name="logout" /></button>
        </div>
      </div>
    </nav>);

};

// --- Topbar
const Topbar = ({ crumbs, actions }) =>
<header className="topbar">
    <div className="crumbs">
      {crumbs.map((c, i) =>
    <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          <span className={i === crumbs.length - 1 ? "now" : ""}>{c}</span>
        </React.Fragment>
    )}
    </div>
    <label className="search">
      <Ic name="search" size={14} />
      <input placeholder="Поиск аренд, кладовок, клиентов…" />
      <span className="kbd">⌘K</span>
    </label>
    {actions}
  </header>;


// Export
Object.assign(window, {
  Avatar, StatusBadge, Button, Field, SegmentBar, KPI, Donut, AreaChart,
  Drawer, Modal, Tabs, Empty, Sidebar, Topbar,
  fmtMoney, fmtDate, initials
});