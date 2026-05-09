// Admin/account screens: Users, Profile, Analytics
const { LOCATIONS: LX, CONTAINERS: CX, UNITS: UX, RENTS: RX, USERS: USX, networkStats: nstat, REVENUE_30D: REV } = window.DATA;

// ============= USERS (admin) =============
const UsersScreen = ({ user, role }) => {
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <Topbar crumbs={["Сотрудники"]} actions={
      <Button icon="plus" size="sm" variant="primary" onClick={() => setCreating(true)}>Добавить сотрудника</Button>
      } />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Доступ</span>
            <h1 className="h-display-sm">Сотрудники</h1>
            <span className="muted t-body">{USX.filter((u) => u.role === "admin").length} администратор · {USX.filter((u) => u.role === "manager").length} менеджеров</span>
          </div>
        </div>

        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Сотрудник</th><th>Email</th><th>Роль</th><th>Активность</th><th></th></tr>
            </thead>
            <tbody>
              {USX.map((u) =>
              <tr key={u.id} onClick={() => setOpenId(u.id)}>
                  <td>
                    <div className="row gap-3">
                      <Avatar name={u.name} size="lg" />
                      <div className="col">
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                        <span className="t-small">ID #{u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="mono t-small">{u.email}</td>
                  <td><StatusBadge status={u.role} kind="role" /></td>
                  <td className="t-small">{u.last_seen}</td>
                  <td><div className="row gap-1">
                    <button className="icon-btn" onClick={(e) => e.stopPropagation()}><Ic name="edit" size={14} /></button>
                    <button className="icon-btn" onClick={(e) => e.stopPropagation()} disabled={u.id === user.id}><Ic name="trash" size={14} /></button>
                  </div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} width={520}>
        <div className="card-head" style={{ padding: "18px 20px" }}>
          <div className="col">
            <span className="t-micro">Новый сотрудник</span>
            <span className="h-display-sm mt-1">Пригласить</span>
          </div>
          <button className="icon-btn" onClick={() => setCreating(false)}><Ic name="close" /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div className="col gap-3">
            <Field label="Имя"><input className="input" placeholder="Иван Петров" /></Field>
            <Field label="Email"><input className="input mono" placeholder="user@company.com" /></Field>
            <Field label="Роль">
              <select className="input">
                <option value="manager">Менеджер</option>
                <option value="admin">Администратор</option>
              </select>
            </Field>
            <Field label="Временный пароль" hint="Сотрудник сменит при первом входе">
              <input className="input mono" placeholder="••••••••" />
            </Field>
          </div>
        </div>
        <div className="card-foot row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <Button variant="ghost" onClick={() => setCreating(false)}>Отмена</Button>
          <Button variant="primary" onClick={() => setCreating(false)}>Создать аккаунт</Button>
        </div>
      </Modal>
    </>);

};

// ============= PROFILE =============
const ProfileScreen = ({ user, onLogout }) => {
  const [tab, setTab] = useState("info");
  return (
    <>
      <Topbar crumbs={["Профиль"]} />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Аккаунт</span>
            <h1 className="h-display-sm">Профиль</h1>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 32px" }}>
              <Avatar name={user.name} size="xl" />
              <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, textAlign: "center", marginTop: 20 }}>{user.name}</div>
              <div className="t-small mono" style={{ marginTop: 8, color: "var(--ink-3)" }}>{user.email}</div>
              <div style={{ marginTop: 18 }}><StatusBadge status={user.role} kind="role" /></div>
              <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)", width: "100%", display: "flex", justifyContent: "center" }}>
                <Button size="sm" variant="ghost" icon="download">Загрузить аватар</Button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head" style={{ paddingBottom: 0, border: "none" }}>
              <Tabs value={tab} onChange={setTab} tabs={[
              { id: "info", label: "Личные данные" },
              { id: "password", label: "Безопасность" },
              { id: "sessions", label: "Сессии" }]
              } />
            </div>
            <div className="card-body" style={{ padding: 24 }}>
              {tab === "info" &&
              <div className="col gap-3">
                  <div className="row gap-3">
                    <Field label="Имя"><input className="input" defaultValue={user.name} /></Field>
                    <Field label="Email"><input className="input mono" defaultValue={user.email} /></Field>
                  </div>
                  <Field label="Роль" hint="Изменяется только администратором">
                    <input className="input" defaultValue={user.role === "admin" ? "Администратор" : "Менеджер"} disabled />
                  </Field>
                  <div className="mt-4 row" style={{ justifyContent: "flex-end", gap: 10 }}>
                    <Button variant="ghost">Отменить</Button>
                    <Button variant="primary">Сохранить</Button>
                  </div>
                </div>
              }
              {tab === "password" &&
              <div className="col gap-3" style={{ maxWidth: 420 }}>
                  <Field label="Текущий пароль"><input className="input" type="password" placeholder="••••••••" /></Field>
                  <Field label="Новый пароль" hint="Минимум 8 символов, цифры и буквы"><input className="input" type="password" placeholder="••••••••" /></Field>
                  <Field label="Повторите пароль"><input className="input" type="password" placeholder="••••••••" /></Field>
                  <div className="t-small mt-2" style={{ color: "var(--ink-3)" }}>После смены пароля все активные сессии будут завершены автоматически.</div>
                  <div className="mt-4 row" style={{ justifyContent: "flex-end" }}><Button variant="primary">Обновить пароль</Button></div>
                </div>
              }
              {tab === "sessions" &&
              <div className="col gap-3">
                  {[
                { d: "Текущая сессия — Chrome 130 на macOS", ip: "94.241.176.12 · Москва", last: "только что", current: true },
                { d: "Safari 17 на iPhone", ip: "195.34.234.18 · СПб", last: "3 часа назад", current: false },
                { d: "Firefox 127 на Windows", ip: "172.20.10.8 · Казань", last: "вчера", current: false }].
                map((s, i) =>
                <div key={i} className="row" style={{ justifyContent: "space-between", padding: "14px 0", borderBottom: i < 2 ? "1px solid var(--line)" : "none" }}>
                      <div className="col">
                        <div className="row gap-2">
                          <span style={{ fontWeight: 500 }}>{s.d}</span>
                          {s.current && <span className="badge active"><span className="dot"></span>текущая</span>}
                        </div>
                        <span className="t-small mono mt-1">{s.ip} · {s.last}</span>
                      </div>
                      {!s.current && <Button size="sm" variant="ghost" icon="logout">Завершить</Button>}
                    </div>
                )}
                  <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
                    <Button variant="danger" icon="logout" onClick={onLogout}>Выйти со всех устройств</Button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </>);

};

// ============= ANALYTICS =============
const AnalyticsScreen = () => {
  const stats = nstat();
  const byCity = {};
  for (const l of LX) {
    const s = window.DATA.locationStats(l.id);
    byCity[l.city] = byCity[l.city] || { total: 0, occ: 0, income: 0 };
    byCity[l.city].total += s.total_units;
    byCity[l.city].occ += s.occupied_units;
    byCity[l.city].income += s.monthly_income;
  }

  return (
    <>
      <Topbar crumbs={["Аналитика"]} actions={
      <div className="row gap-2">
          <Button icon="calendar" size="sm" variant="ghost">Май 2026</Button>
          <Button icon="download" size="sm" variant="ghost">Экспорт</Button>
        </div>
      } />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Отчётность</span>
            <h1 className="h-display-sm">Аналитика сети</h1>
            <span className="muted t-body">Сводка по {LX.length} локациям, {CX.length} контейнерам и {UX.length} кладовкам</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <KPI label="Заполняемость" value={stats.occupancy_percent} unit="%" />
          <KPI label="Доход / месяц" value={fmtMoney(stats.monthly_income, { compact: true }).replace(" ₽", "")} unit="₽" />
          <KPI label="Средний чек" value={fmtMoney(Math.round(stats.monthly_income / Math.max(1, stats.rented_units)), { compact: true }).replace(" ₽", "")} unit="₽" />
          <KPI label="Срок аренды" value={62} unit="дн." sub="средний по сети" />
        </div>

        <div className="card mt-4">
          <div className="card-head">
            <div className="col">
              <span className="t-micro">Доход</span>
              <span className="h-2 mt-1">Динамика за 30 дней</span>
            </div>
          </div>
          <div className="card-body">
            <AreaChart data={REV} height={260} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div className="card">
            <div className="card-head"><div className="col"><span className="t-micro">География</span><span className="h-2 mt-1">По городам</span></div></div>
            <table className="table">
              <thead>
                <tr><th>Город</th><th>Кладовок</th><th>Заполняемость</th><th className="num">Доход</th></tr>
              </thead>
              <tbody>
                {Object.entries(byCity).map(([city, s]) =>
                <tr key={city}>
                    <td style={{ fontWeight: 500 }}>{city}</td>
                    <td className="tnum">{s.total}</td>
                    <td>
                      <div className="row gap-2">
                        <div className="bar" style={{ flex: 1, height: 6 }}>
                          <span style={{ width: `${s.occ / s.total * 100}%`, background: "var(--st-rented)" }}></span>
                        </div>
                        <span className="tnum t-small" style={{ minWidth: 46, textAlign: "right" }}>{Math.round(s.occ / s.total * 100)}%</span>
                      </div>
                    </td>
                    <td className="num tnum">{fmtMoney(s.income, { compact: true })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-head"><div className="col"><span className="t-micro">Размеры</span><span className="h-2 mt-1">Спрос по площади</span></div></div>
            <div className="card-body">
              <div className="col gap-3">
                {[1.5, 2, 2.5, 3, 4, 5, 6].map((sz) => {
                  const all = UX.filter((u) => u.size === sz);
                  const occ = all.filter((u) => u.status === "rented" || u.status === "reserved").length;
                  const pct = all.length ? Math.round(occ / all.length * 100) : 0;
                  return (
                    <div key={sz} className="row" style={{ justifyContent: "space-between" }}>
                      <span className="t-body" style={{ minWidth: 60 }}>{sz} м²</span>
                      <div className="bar" style={{ flex: 1, margin: "0 14px", height: 8 }}>
                        <span style={{ width: `${pct}%`, background: "var(--ink)" }}></span>
                      </div>
                      <span className="t-small mono" style={{ minWidth: 80, textAlign: "right" }}>{occ} / {all.length} ({pct}%)</span>
                    </div>);

                })}
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-head">
            <div className="col"><span className="t-micro">Производительность</span><span className="h-2 mt-1">Топ-локаций по доходу</span></div>
          </div>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Локация</th><th>Город</th><th>Кладовок</th><th>Заполн.</th><th className="num">Доход</th></tr>
            </thead>
            <tbody>
              {[...LX].map((l) => ({ l, s: window.DATA.locationStats(l.id) })).
              sort((a, b) => b.s.monthly_income - a.s.monthly_income).
              map((row, i) =>
              <tr key={row.l.id}>
                    <td className="t-small mono">{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{row.l.name}</td>
                    <td className="t-small">{row.l.city}</td>
                    <td className="tnum">{row.s.total_units}</td>
                    <td className="tnum">{row.s.occupancy_percent}%</td>
                    <td className="num tnum" style={{ fontWeight: 500 }}>{fmtMoney(row.s.monthly_income, { compact: true })}</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>);

};

Object.assign(window, { UsersScreen, ProfileScreen, AnalyticsScreen });