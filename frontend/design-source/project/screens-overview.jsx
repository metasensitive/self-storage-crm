// Dashboard + Login
const { LOCATIONS, CONTAINERS, UNITS, RENTS, USERS, networkStats, REVENUE_30D, ACTIVITY } = window.DATA;

// =========== DASHBOARD ============
const Dashboard = ({ user, role, setRoute }) => {
  const stats = networkStats();
  const activeRents = RENTS.filter((r) => r.status === "active");
  const expiringSoon = activeRents.
  map((r) => {
    const d = (new Date(r.date_to) - new Date("2026-05-08")) / 86400000;
    return { ...r, days: Math.round(d) };
  }).
  filter((r) => r.days <= 7 && r.days >= 0).
  sort((a, b) => a.days - b.days).
  slice(0, 6);

  const totalRevenueToday = REVENUE_30D[REVENUE_30D.length - 1].value;
  const totalRevenueYday = REVENUE_30D[REVENUE_30D.length - 2].value;
  const dayDelta = (totalRevenueToday - totalRevenueYday) / totalRevenueYday * 100;

  const todayHello = (() => {
    const h = new Date().getHours();
    if (h < 6) return "Доброй ночи";
    if (h < 12) return "Доброе утро";
    if (h < 18) return "Добрый день";
    return "Добрый вечер";
  })();

  return (
    <>
      <Topbar crumbs={["Дашборд"]} actions={
      <div className="row gap-2">
          <Button icon="download" variant="ghost" size="sm">Экспорт</Button>
          <Button icon="plus" variant="primary" size="sm" onClick={() => setRoute({ page: "rents", action: "new" })}>Новая аренда</Button>
        </div>
      } />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</span>
            <h1 className="h-display">{todayHello}, {user.name.split(" ")[0]}.</h1>
            <span className="muted t-body">Сводка по сети — {LOCATIONS.length} локаций, {CONTAINERS.length} контейнеров, {stats.total_units} кладовок.</span>
          </div>
          <div className="row gap-2">
            <Button icon="calendar" size="sm">Май 2026</Button>
            <Button icon="filter" size="sm">Все локации</Button>
          </div>
        </div>

        {/* KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <KPI
            label="Заполняемость"
            value={stats.occupancy_percent}
            unit="%"
            sub={`${stats.occupied_units} из ${stats.total_units} занято`}
            delta="+2.4 п.п."
            deltaDir="up" />
          
          <KPI
            label="Доход (текущий месяц)"
            value={fmtMoney(stats.monthly_income, { compact: true }).replace(" ₽", "")}
            unit="₽"
            sub="к 8 мая"
            delta={`${dayDelta > 0 ? "+" : ""}${dayDelta.toFixed(1)}% за день`}
            deltaDir={dayDelta >= 0 ? "up" : "down"} />
          
          <KPI
            label="Активные аренды"
            value={stats.rented_units + stats.reserved_units}
            sub={`${stats.reserved_units} в резерве`}
            delta="+12 за неделю"
            deltaDir="up" />
          
          <KPI
            label="Свободно"
            value={stats.free_units}
            sub={`${stats.blocked_units} заблокировано`}
            delta="-8 за неделю"
            deltaDir="down" />
          
        </div>

        {/* MAIN GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginTop: 14 }}>
          {/* Revenue chart */}
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Доход</span>
                <span className="h-2 mt-1">Последние 30 дней</span>
              </div>
              <div className="row gap-2">
                <button className="tab active">30 дней</button>
                <button className="tab">90 дней</button>
                <button className="tab">12 месяцев</button>
              </div>
            </div>
            <div className="card-body">
              <AreaChart data={REVENUE_30D} height={240} />
            </div>
          </div>

          {/* Status donut */}
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Распределение</span>
                <span className="h-2 mt-1">Статусы кладовок</span>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="donut-wrap">
                <Donut size={170} thickness={18} segs={[
                { value: stats.rented_units, color: "var(--st-rented)" },
                { value: stats.reserved_units, color: "var(--st-reserved)" },
                { value: stats.free_units, color: "var(--st-free)" },
                { value: stats.blocked_units, color: "var(--st-blocked)" }]
                } />
                <div className="donut-center">
                  <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>{stats.occupancy_percent}<span style={{ fontSize: 14, color: "var(--ink-3)" }}>%</span></div>
                  <div className="t-small">занято</div>
                </div>
              </div>
              <div className="col gap-2 mt-4" style={{ width: "100%" }}>
                {[
                ["Арендовано", stats.rented_units, "var(--st-rented)"],
                ["Резерв", stats.reserved_units, "var(--st-reserved)"],
                ["Свободно", stats.free_units, "var(--st-free)"],
                ["Блокировка", stats.blocked_units, "var(--st-blocked)"]].
                map(([l, v, c]) =>
                <div key={l} className="row" style={{ justifyContent: "space-between" }}>
                    <div className="row gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: c }}></span>
                      <span className="t-body">{l}</span>
                    </div>
                    <span className="mono tnum">{v}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginTop: 14 }}>
          {/* Locations performance */}
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Производительность</span>
                <span className="h-2 mt-1">Локации</span>
              </div>
              <Button size="sm" variant="ghost" icon="arrow_r" onClick={() => setRoute({ page: "locations" })}>Все</Button>
            </div>
            <table className="table">
              <thead>
                <tr><th>Локация</th><th>Контейнеры</th><th>Заполнено</th><th>Заполняемость</th><th className="num">Доход</th></tr>
              </thead>
              <tbody>
                {LOCATIONS.slice(0, 5).map((l) => {
                  const s = window.DATA.locationStats(l.id);
                  return (
                    <tr key={l.id} onClick={() => setRoute({ page: "locations", locationId: l.id })}>
                      <td>
                        <div className="col">
                          <span style={{ fontWeight: 500 }}>{l.name}</span>
                          <span className="t-small">{l.city}</span>
                        </div>
                      </td>
                      <td className="tnum">{l.containers_count}</td>
                      <td className="tnum"><span className="muted">{s.occupied_units}/{s.total_units}</span></td>
                      <td>
                        <div className="row gap-2" style={{ minWidth: 160 }}>
                          <SegmentBar free={s.free_units} rented={s.rented_units} reserved={s.reserved_units} blocked={s.blocked_units} />
                          <span className="tnum t-small" style={{ minWidth: 46, textAlign: "right" }}>{s.occupancy_percent}%</span>
                        </div>
                      </td>
                      <td className="num tnum">{fmtMoney(s.monthly_income, { compact: true })}</td>
                    </tr>);

                })}
              </tbody>
            </table>
          </div>

          {/* Activity feed */}
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Недавняя активность</span>
                <span className="h-2 mt-1">Журнал событий</span>
              </div>
              <Button size="sm" variant="ghost" icon="refresh"></Button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {ACTIVITY.map((a) =>
              <div key={a.id} style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", gap: 12 }}>
                  <Avatar name={a.who} />
                  <div className="col" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5 }}>
                      <strong style={{ fontWeight: 600 }}>{a.who}</strong>{" "}
                      <span className="muted">{a.what}</span>
                    </div>
                    <div className="t-small mt-1" style={{ color: "var(--ink-2)" }}>{a.sub}</div>
                  </div>
                  <span className="t-small" style={{ flex: "none", whiteSpace: "nowrap" }}>{a.when}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EXPIRING RENTS */}
        <div className="card mt-4">
          <div className="card-head">
            <div className="col">
              <span className="t-micro">Внимание</span>
              <span className="h-2 mt-1">Аренды, истекающие в ближайшие 7 дней</span>
            </div>
            <Button size="sm" variant="ghost" icon="arrow_r" onClick={() => setRoute({ page: "rents" })}>К арендам</Button>
          </div>
          <table className="table">
            <thead>
              <tr><th>Клиент</th><th>Кладовка</th><th>Локация</th><th>Период</th><th>Осталось</th><th className="num">Сумма</th><th></th></tr>
            </thead>
            <tbody>
              {expiringSoon.map((r) => {
                const u = UNITS.find((u) => u.id === r.unit_id);
                const c = CONTAINERS.find((c) => c.id === u.container_id);
                const l = LOCATIONS.find((l) => l.id === c.location_id);
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="row gap-3">
                        <Avatar name={r.client.name} />
                        <div className="col">
                          <span style={{ fontWeight: 500 }}>{r.client.name}</span>
                          <span className="t-small mono">{r.client.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="mono">{c.code} / {u.number}</span></td>
                    <td>{l.name}</td>
                    <td className="t-small">{fmtDate(r.date_from)} → {fmtDate(r.date_to)}</td>
                    <td>
                      <span className={`badge ${r.days <= 2 ? "blocked" : r.days <= 5 ? "reserved" : "active"}`}>
                        <span className="dot"></span>
                        {r.days === 0 ? "сегодня" : `${r.days} ${r.days === 1 ? "день" : r.days < 5 ? "дня" : "дней"}`}
                      </span>
                    </td>
                    <td className="num tnum">{fmtMoney(r.price)}</td>
                    <td><button className="icon-btn"><Ic name="chev_r" /></button></td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </div>
    </>);

};

// =========== LOGIN ============
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("admin@example.com");
  const [pw, setPw] = useState("password");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (pw.length < 6) {setErr("Минимум 6 символов");return;}
    const u = USERS.find((x) => x.email === email);
    if (!u) {setErr("Пользователь не найден");return;}
    onLogin(u);
  }

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="col">
            <div className="brand-name">Storehaus</div>
            <div className="brand-sub">Operations</div>
          </div>
        </div>
        <div className="auth-form">
          <div className="t-micro">Вход в систему</div>
          <h1 className="h-display-sm mt-2">С возвращением.</h1>
          <p className="muted mt-2 t-body">Войдите в панель оператора, чтобы управлять локациями, контейнерами и арендами.</p>

          <form onSubmit={submit} className="col gap-3 mt-6">
            <Field label="Email">
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </Field>
            <Field label="Пароль" hint={err && <span style={{ color: "var(--st-blocked)" }}>{err}</span>}>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPw ? "text" : "password"} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" style={{ paddingRight: 38 }} />
                <button type="button" className="icon-btn" style={{ position: "absolute", right: 4, top: 4 }} onClick={() => setShowPw(!showPw)}>
                  <Ic name={showPw ? "eye_off" : "eye"} />
                </button>
              </div>
            </Field>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <label className="row gap-2 t-small">
                <input type="checkbox" defaultChecked /> Запомнить меня
              </label>
              <a href="#" className="t-small" style={{ color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>Забыли пароль?</a>
            </div>
            <Button type="submit" variant="primary" size="lg">Войти</Button>
          </form>

          <div className="mt-8 t-small" style={{ padding: "12px 14px", border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)" }}>
            <strong style={{ color: "var(--ink-2)" }}>Демо-доступы:</strong> admin@example.com / manager@example.com — пароль <span className="mono">password</span>
          </div>
        </div>
        <div className="t-small mt-6">© 2026 Storehaus. Все права защищены.</div>
      </div>
      <div className="auth-right">
        <div style={{ maxWidth: 520, color: "var(--ink-2)", display: "flex", flexDirection: "column", gap: 36 }}>
          <div className="row gap-3">
            <span style={{ width: 36, height: 1, background: "var(--ink-3)" }}></span>
            <span className="t-micro" style={{ color: "var(--ink-2)" }}>Сеть кладовок</span>
          </div>
          <h2 className="serif" style={{ fontSize: 54, lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--ink)", fontWeight: 400, margin: 0 }}>
            Один интерфейс<br />
            для всей сети — <em style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>от&nbsp;локации</em><br />
            до отдельной ячейки.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px 32px" }}>
            {[
            ["Локации", "Объекты на карте города"],
            ["Контейнеры", "Установка и обслуживание"],
            ["Кладовки", "Размер, цена, доступность"],
            ["Аренды", "Бронь → активная → завершение"]].
            map(([t, d]) =>
            <div key={t} className="col gap-2" style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <span className="serif" style={{ fontSize: 22, color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.015em" }}>{t}</span>
                <span style={{ fontSize: 13.5, color: "var(--ink-3)", lineHeight: 1.45 }}>{d}</span>
              </div>
            )}
          </div>
          <div className="t-small" style={{ paddingTop: 24, borderTop: "1px solid var(--line)", color: "var(--ink-3)" }}>

          </div>
        </div>
      </div>
    </div>);

};

window.Dashboard = Dashboard;
window.Login = Login;