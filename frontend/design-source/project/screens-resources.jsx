// Resource screens: Locations, Containers, Units, Rents
const { LOCATIONS: LOCS, CONTAINERS: CONS, UNITS: UNS, RENTS: RNS } = window.DATA;

// ============= LOCATIONS =============
const LocationsScreen = ({ role, setRoute, route }) => {
  const [openId, setOpenId] = useState(route.locationId || null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = LOCS.filter(l => filter === "all" || l.status === filter);

  return (
    <>
      <Topbar crumbs={["Локации"]} actions={
        role === "admin" && <Button icon="plus" variant="primary" size="sm" onClick={() => setCreating(true)}>Добавить локацию</Button>
      }/>
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Управление сетью</span>
            <h1 className="h-display-sm">Локации</h1>
            <span className="muted t-body">{LOCS.length} объектов · {CONS.length} контейнеров · {UNS.length} кладовок</span>
          </div>
          <div className="row gap-2">
            <Tabs value={filter} onChange={setFilter} tabs={[
              { id:"all", label:"Все", count: LOCS.length },
              { id:"active", label:"Активные", count: LOCS.filter(l=>l.status==="active").length },
              { id:"inactive", label:"Неактивные", count: LOCS.filter(l=>l.status==="inactive").length },
            ]}/>
          </div>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(340px, 1fr))", gap: 14}}>
          {filtered.map(l => {
            const s = window.DATA.locationStats(l.id);
            return (
              <div key={l.id} className="card" style={{cursor:"pointer", transition:"transform .12s, box-shadow .12s"}}
                   onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-2)"}
                   onMouseLeave={e => e.currentTarget.style.boxShadow = ""}
                   onClick={() => setOpenId(l.id)}>
                <div style={{padding: 18}}>
                  <div className="between">
                    <StatusBadge status={l.status} kind="location"/>
                    <button className="icon-btn" onClick={e=>e.stopPropagation()}><Ic name="chev_r"/></button>
                  </div>
                  <h3 className="h-1 mt-3" style={{fontFamily:"var(--serif)", fontWeight:400, fontSize: 24, letterSpacing:"-0.015em"}}>{l.name}</h3>
                  <div className="t-small mt-1">{l.city} · {l.address}</div>

                  <div className="row gap-3 mt-4">
                    <div className="col">
                      <span className="t-micro">Заполн.</span>
                      <span className="serif" style={{fontSize:22, lineHeight:1.1}}>{s.occupancy_percent}%</span>
                    </div>
                    <div style={{width:1, alignSelf:"stretch", background:"var(--line)"}}></div>
                    <div className="col">
                      <span className="t-micro">Контейнеров</span>
                      <span className="serif" style={{fontSize:22, lineHeight:1.1}}>{l.containers_count}</span>
                    </div>
                    <div style={{width:1, alignSelf:"stretch", background:"var(--line)"}}></div>
                    <div className="col">
                      <span className="t-micro">Кладовок</span>
                      <span className="serif" style={{fontSize:22, lineHeight:1.1}}>{s.total_units}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <SegmentBar free={s.free_units} rented={s.rented_units} reserved={s.reserved_units} blocked={s.blocked_units} height={8}/>
                    <div className="row gap-3 mt-2 t-small" style={{justifyContent:"space-between"}}>
                      <span>{s.rented_units} аренд.</span>
                      <span>{s.reserved_units} резерв.</span>
                      <span>{s.free_units} своб.</span>
                      <span>{s.blocked_units} блок.</span>
                    </div>
                  </div>
                </div>
                <div className="card-foot row" style={{justifyContent:"space-between"}}>
                  <span className="t-small">Доход за месяц</span>
                  <span className="mono tnum" style={{fontWeight:600}}>{fmtMoney(s.monthly_income, {compact:true})}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Drawer open={!!openId} onClose={() => setOpenId(null)}>
        {openId && <LocationDetail locationId={openId} role={role} onClose={() => setOpenId(null)} setRoute={setRoute}/>}
      </Drawer>
      <Modal open={creating} onClose={() => setCreating(false)}>
        <CreateLocationForm onClose={() => setCreating(false)}/>
      </Modal>
    </>
  );
};

const LocationDetail = ({ locationId, role, onClose, setRoute }) => {
  const l = LOCS.find(x => x.id === locationId);
  const s = window.DATA.locationStats(locationId);
  const containers = CONS.filter(c => c.location_id === locationId);
  return (
    <>
      <div className="drawer-head">
        <div className="col grow">
          <div className="row gap-2">
            <StatusBadge status={l.status} kind="location"/>
            <span className="t-small">ID #{l.id}</span>
          </div>
          <h2 className="h-display-sm mt-2">{l.name}</h2>
          <div className="t-body muted">{l.city}, {l.address}</div>
          <div className="t-small mono mt-2">{l.latitude.toFixed(4)}°, {l.longitude.toFixed(4)}°</div>
        </div>
        <button className="icon-btn" onClick={onClose}><Ic name="close"/></button>
      </div>
      <div className="drawer-body">
        <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap: 10}}>
          <KPI label="Заполняемость" value={s.occupancy_percent} unit="%" sub={`${s.occupied_units} из ${s.total_units}`}/>
          <KPI label="Доход в этом месяце" value={fmtMoney(s.monthly_income, {compact:true}).replace(" ₽","")} unit="₽"/>
        </div>

        <div className="mt-6">
          <SegmentBar free={s.free_units} rented={s.rented_units} reserved={s.reserved_units} blocked={s.blocked_units} height={10}/>
          <div className="row gap-4 mt-3">
            {[["Аренд.", s.rented_units, "var(--st-rented)"], ["Резерв", s.reserved_units, "var(--st-reserved)"], ["Своб.", s.free_units, "var(--st-free)"], ["Блок.", s.blocked_units, "var(--st-blocked)"]].map(([t,v,c])=>(
              <div key={t} className="row gap-2">
                <span style={{width:8,height:8,borderRadius:"50%",background:c}}></span>
                <span className="t-small">{t}</span>
                <span className="tnum mono" style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-2 mt-8">Контейнеры на локации</div>
        <div className="card mt-3">
          <table className="table">
            <thead>
              <tr><th>Код</th><th>Кладовок</th><th>Установлен</th><th>Статус</th><th></th></tr>
            </thead>
            <tbody>
              {containers.map(c => (
                <tr key={c.id} onClick={() => { setRoute({page:"units", containerId: c.id}); onClose(); }}>
                  <td className="mono" style={{fontWeight:600}}>{c.code}</td>
                  <td className="tnum">{c.units_count}</td>
                  <td className="t-small">{fmtDate(c.installed_at)}</td>
                  <td><StatusBadge status={c.status} kind="container"/></td>
                  <td><Ic name="chev_r" size={14}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="drawer-foot">
        <Button variant="ghost">Закрыть</Button>
        {role === "admin" && <><Button icon="edit">Редактировать</Button><Button variant="danger" icon="trash">Удалить</Button></>}
      </div>
    </>
  );
};

const CreateLocationForm = ({ onClose }) => (
  <>
    <div className="card-head" style={{padding:"18px 20px"}}>
      <div className="col">
        <span className="t-micro">Новая локация</span>
        <span className="h-display-sm mt-1">Добавить объект</span>
      </div>
      <button className="icon-btn" onClick={onClose}><Ic name="close"/></button>
    </div>
    <div style={{padding:20}}>
      <div className="col gap-3">
        <Field label="Название"><input className="input" placeholder="например, ЖК Прайм Парк"/></Field>
        <div className="row gap-3">
          <Field label="Город"><input className="input" placeholder="Москва"/></Field>
          <Field label="Статус">
            <select className="input">
              <option>active</option><option>inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Адрес"><input className="input" placeholder="Улица, дом, корпус"/></Field>
        <div className="row gap-3">
          <Field label="Широта"><input className="input mono" placeholder="55.7558"/></Field>
          <Field label="Долгота"><input className="input mono" placeholder="37.6173"/></Field>
        </div>
      </div>
    </div>
    <div className="card-foot row" style={{justifyContent:"flex-end", gap:10}}>
      <Button variant="ghost" onClick={onClose}>Отмена</Button>
      <Button variant="primary" onClick={onClose}>Создать локацию</Button>
    </div>
  </>
);

// ============= CONTAINERS =============
const ContainersScreen = ({ role, setRoute, route }) => {
  const [filter, setFilter] = useState("all");
  const [locFilter, setLocFilter] = useState(route.locationId || "all");
  const filtered = CONS.filter(c =>
    (filter === "all" || c.status === filter) &&
    (locFilter === "all" || c.location_id === locFilter)
  );

  return (
    <>
      <Topbar crumbs={["Контейнеры"]} actions={
        role === "admin" && <Button icon="plus" variant="primary" size="sm">Установить контейнер</Button>
      }/>
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Инфраструктура</span>
            <h1 className="h-display-sm">Контейнеры</h1>
            <span className="muted t-body">{CONS.length} единиц на {LOCS.length} локациях</span>
          </div>
          <div className="row gap-2">
            <select className="input" style={{width:240}} value={locFilter} onChange={e=>setLocFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">Все локации</option>
              {LOCS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <Tabs value={filter} onChange={setFilter} tabs={[
          { id:"all", label:"Все", count: CONS.length },
          { id:"active", label:"Активные", count: CONS.filter(c=>c.status==="active").length },
          { id:"maintenance", label:"Обслуживание", count: CONS.filter(c=>c.status==="maintenance").length },
          { id:"inactive", label:"Неактивные", count: CONS.filter(c=>c.status==="inactive").length },
        ]}/>

        <div className="card mt-4">
          <table className="table">
            <thead>
              <tr>
                <th>Код</th>
                <th>Локация</th>
                <th>Кладовок</th>
                <th>Заполняемость</th>
                <th>Установлен</th>
                <th>Статус</th>
                <th className="num">Доход</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const s = window.DATA.containerStats(c.id);
                const l = LOCS.find(x => x.id === c.location_id);
                return (
                  <tr key={c.id} onClick={() => setRoute({page:"units", containerId: c.id})}>
                    <td className="mono" style={{fontWeight:600}}>{c.code}</td>
                    <td>
                      <div className="col">
                        <span style={{fontWeight:500}}>{l.name}</span>
                        <span className="t-small">{l.city}</span>
                      </div>
                    </td>
                    <td className="tnum">{c.units_count}</td>
                    <td>
                      <div className="row gap-2" style={{minWidth:180}}>
                        <SegmentBar free={s.free_units} rented={s.rented_units} reserved={s.reserved_units} blocked={s.blocked_units}/>
                        <span className="tnum t-small" style={{minWidth:46, textAlign:"right"}}>{s.occupancy_percent}%</span>
                      </div>
                    </td>
                    <td className="t-small">{fmtDate(c.installed_at)}</td>
                    <td><StatusBadge status={c.status} kind="container"/></td>
                    <td className="num tnum">{fmtMoney(s.monthly_income, {compact:true})}</td>
                    <td><Ic name="chev_r" size={14}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ============= UNITS =============
const UnitsScreen = ({ role, setRoute, route, openCreateRent }) => {
  const [containerId, setContainerId] = useState(route.containerId || CONS[0].id);
  const [openUnit, setOpenUnit] = useState(null);
  const c = CONS.find(x => x.id === containerId);
  const l = LOCS.find(x => x.id === c.location_id);
  const units = UNS.filter(u => u.container_id === containerId);
  const s = window.DATA.containerStats(containerId);

  return (
    <>
      <Topbar crumbs={["Кладовки", l.name, c.code]} actions={
        <div className="row gap-2">
          <Button icon="filter" size="sm" variant="ghost">Фильтры</Button>
          {role === "admin" && <Button icon="plus" size="sm">Добавить кладовку</Button>}
        </div>
      }/>
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">{l.city} · {l.name}</span>
            <h1 className="h-display-sm">Контейнер <span className="mono" style={{fontFamily:"var(--mono)", fontSize:24}}>{c.code}</span></h1>
            <div className="row gap-3 mt-2">
              <StatusBadge status={c.status} kind="container"/>
              <span className="t-small">Установлен {fmtDate(c.installed_at)}</span>
              <span className="t-small">·</span>
              <span className="t-small">{c.units_count} кладовок</span>
            </div>
          </div>
          <select className="input" style={{width:280}} value={containerId} onChange={e => setContainerId(Number(e.target.value))}>
            {LOCS.map(loc => (
              <optgroup key={loc.id} label={loc.name}>
                {CONS.filter(x => x.location_id === loc.id).map(cc => (
                  <option key={cc.id} value={cc.id}>{cc.code} — {cc.units_count} кладовок</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"1fr 320px", gap:14}}>
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Карта контейнера</span>
                <span className="h-2 mt-1">{units.length} кладовок · {s.occupancy_percent}% занято</span>
              </div>
              <div className="row gap-3">
                {[["Своб.","var(--st-free)"],["Аренд.","var(--st-rented)"],["Резерв","var(--st-reserved)"],["Блок.","var(--st-blocked)"]].map(([t,col])=>(
                  <span key={t} className="row gap-2 t-small"><span style={{width:8,height:8,borderRadius:"50%",background:col}}></span>{t}</span>
                ))}
              </div>
            </div>
            <div className="card-body">
              <div className="units-grid">
                {units.map(u => (
                  <div key={u.id} className={`unit-tile ${u.status}`} onClick={() => setOpenUnit(u)}>
                    <span className="num">{u.number}</span>
                    <span className="sz">{u.size}м²</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col gap-3" style={{position:"sticky", top:78, alignSelf:"flex-start"}}>
            <KPI label="Заполняемость" value={s.occupancy_percent} unit="%" sub={`${s.occupied_units}/${s.total_units}`}/>
            <KPI label="Доход / месяц" value={fmtMoney(s.monthly_income,{compact:true}).replace(" ₽","")} unit="₽"/>
            <div className="card">
              <div className="card-body">
                <div className="t-micro">Распределение размеров</div>
                <div className="col gap-2 mt-3">
                  {[1.5, 2, 2.5, 3, 4, 5, 6].map(sz => {
                    const n = units.filter(u => u.size === sz).length;
                    if (!n) return null;
                    return (
                      <div key={sz} className="row" style={{justifyContent:"space-between"}}>
                        <span className="t-body">{sz} м²</span>
                        <div className="row gap-2" style={{flex:1, marginLeft:14}}>
                          <div className="bar" style={{flex:1, height:5}}>
                            <span style={{width: `${n / units.length * 100}%`, background:"var(--ink)"}}></span>
                          </div>
                          <span className="tnum mono" style={{minWidth:24, textAlign:"right"}}>{n}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer open={!!openUnit} onClose={() => setOpenUnit(null)}>
        {openUnit && <UnitDetail unit={openUnit} container={c} location={l} role={role} onClose={() => setOpenUnit(null)} openCreateRent={openCreateRent}/>}
      </Drawer>
    </>
  );
};

const UnitDetail = ({ unit, container, location, role, onClose, openCreateRent }) => {
  const activeRent = RNS.find(r => r.unit_id === unit.id && r.status === "active");
  const history = RNS.filter(r => r.unit_id === unit.id).slice(0, 5);

  return (
    <>
      <div className="drawer-head">
        <div className="col grow">
          <div className="row gap-2">
            <span className="t-small mono">{container.code}</span>
            <span className="t-small">·</span>
            <span className="t-small">{location.name}</span>
          </div>
          <div className="row gap-3 mt-2">
            <div className={`unit-tile ${unit.status}`} style={{width:64, height:64}}>
              <span className="num" style={{fontSize:18}}>{unit.number}</span>
              <span className="sz">{unit.size}м²</span>
            </div>
            <div className="col">
              <h2 className="h-display-sm">Кладовка №{unit.number}</h2>
              <div className="row gap-2 mt-2">
                <StatusBadge status={unit.status} kind="unit"/>
                <span className="t-small">{unit.size} м² · {fmtMoney(unit.price)}/день</span>
              </div>
            </div>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}><Ic name="close"/></button>
      </div>
      <div className="drawer-body">
        {activeRent && (
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Активная аренда</span>
                <span className="h-2 mt-1">{activeRent.client.name}</span>
              </div>
              <span className="badge active"><span className="dot"></span>в работе</span>
            </div>
            <div className="card-body">
              <div className="row gap-6">
                <div className="col"><span className="t-micro">Период</span><span>{fmtDate(activeRent.date_from)} → {fmtDate(activeRent.date_to)}</span></div>
                <div className="col"><span className="t-micro">Сумма</span><span className="mono">{fmtMoney(activeRent.price)}</span></div>
                <div className="col"><span className="t-micro">Телефон</span><span className="mono">{activeRent.client.phone}</span></div>
              </div>
            </div>
          </div>
        )}

        {!activeRent && (unit.status === "free" || unit.status === "reserved") && (
          <div className="card">
            <div className="card-body">
              <div className="row" style={{justifyContent:"space-between"}}>
                <div className="col">
                  <span className="h-2">Кладовка доступна</span>
                  <span className="t-small mt-1">Готова к оформлению аренды</span>
                </div>
                <Button variant="primary" icon="plus" onClick={() => { onClose(); openCreateRent(unit.id); }}>Оформить аренду</Button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 between">
          <span className="h-2">История аренд</span>
          <span className="t-small">{history.length} из {RNS.filter(r => r.unit_id === unit.id).length}</span>
        </div>
        <div className="card mt-3">
          <table className="table">
            <thead>
              <tr><th>Клиент</th><th>Период</th><th>Статус</th><th className="num">Сумма</th></tr>
            </thead>
            <tbody>
              {history.length === 0 && <tr><td colSpan={4} style={{padding:24, textAlign:"center"}} className="muted">Нет аренд</td></tr>}
              {history.map(r => (
                <tr key={r.id}>
                  <td>{r.client.name}</td>
                  <td className="t-small">{fmtDate(r.date_from)} → {fmtDate(r.date_to)}</td>
                  <td><StatusBadge status={r.status} kind="rent"/></td>
                  <td className="num tnum">{fmtMoney(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="drawer-foot">
        <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        {role === "admin" && <>
          <Button icon="edit">Изменить цену</Button>
          <Button icon="settings">Сменить статус</Button>
        </>}
      </div>
    </>
  );
};

// ============= RENTS =============
const RentsScreen = ({ role, setRoute, route, openCreateRent }) => {
  const [filter, setFilter] = useState("active");
  const [openId, setOpenId] = useState(null);
  const filtered = RNS.filter(r => filter === "all" || r.status === filter)
    .sort((a, b) => new Date(b.date_from) - new Date(a.date_from));

  return (
    <>
      <Topbar crumbs={["Аренды"]} actions={
        <div className="row gap-2">
          <Button icon="download" size="sm" variant="ghost">Выгрузить .csv</Button>
          <Button icon="plus" size="sm" variant="primary" onClick={() => openCreateRent()}>Новая аренда</Button>
        </div>
      }/>
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Операции</span>
            <h1 className="h-display-sm">Аренды</h1>
            <span className="muted t-body">{RNS.filter(r=>r.status==="active").length} активных · {RNS.filter(r=>r.status==="finished").length} завершённых · {RNS.filter(r=>r.status==="cancelled").length} отменённых</span>
          </div>
        </div>

        <Tabs value={filter} onChange={setFilter} tabs={[
          { id:"all",       label:"Все",        count: RNS.length },
          { id:"active",    label:"Активные",   count: RNS.filter(r=>r.status==="active").length },
          { id:"finished",  label:"Завершённые", count: RNS.filter(r=>r.status==="finished").length },
          { id:"cancelled", label:"Отменённые", count: RNS.filter(r=>r.status==="cancelled").length },
        ]}/>

        <div className="card mt-4">
          <table className="table">
            <thead>
              <tr>
                <th style={{width:24}}>#</th>
                <th>Клиент</th>
                <th>Кладовка</th>
                <th>Локация</th>
                <th>Период</th>
                <th>Дней</th>
                <th>Статус</th>
                <th className="num">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map(r => {
                const u = UNS.find(x => x.id === r.unit_id);
                const c = CONS.find(x => x.id === u.container_id);
                const l = LOCS.find(x => x.id === c.location_id);
                const days = Math.round((new Date(r.date_to) - new Date(r.date_from)) / 86400000);
                return (
                  <tr key={r.id} onClick={() => setOpenId(r.id)}>
                    <td className="t-small mono">{r.id}</td>
                    <td>
                      <div className="row gap-3">
                        <Avatar name={r.client.name}/>
                        <div className="col">
                          <span style={{fontWeight:500}}>{r.client.name}</span>
                          <span className="t-small mono">{r.client.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{c.code} / {u.number}</td>
                    <td className="t-small">{l.name}</td>
                    <td className="t-small">{fmtDate(r.date_from)} → {fmtDate(r.date_to)}</td>
                    <td className="tnum">{days}</td>
                    <td><StatusBadge status={r.status} kind="rent"/></td>
                    <td className="num tnum" style={{fontWeight:500}}>{fmtMoney(r.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={!!openId} onClose={() => setOpenId(null)}>
        {openId && <RentDetail rentId={openId} onClose={() => setOpenId(null)}/>}
      </Drawer>
    </>
  );
};

const RentDetail = ({ rentId, onClose }) => {
  const r = RNS.find(x => x.id === rentId);
  const u = UNS.find(x => x.id === r.unit_id);
  const c = CONS.find(x => x.id === u.container_id);
  const l = LOCS.find(x => x.id === c.location_id);
  const days = Math.round((new Date(r.date_to) - new Date(r.date_from)) / 86400000);
  const elapsedDays = Math.max(0, Math.min(days, Math.round((new Date("2026-05-08") - new Date(r.date_from)) / 86400000)));
  const progress = Math.min(100, Math.max(0, elapsedDays / days * 100));

  return (
    <>
      <div className="drawer-head">
        <div className="col grow">
          <div className="row gap-2">
            <span className="t-small">Аренда</span>
            <span className="mono t-small">#{r.id}</span>
            <StatusBadge status={r.status} kind="rent"/>
          </div>
          <h2 className="h-display-sm mt-2">{r.client.name}</h2>
          <div className="t-body muted mono">{r.client.phone}</div>
        </div>
        <button className="icon-btn" onClick={onClose}><Ic name="close"/></button>
      </div>
      <div className="drawer-body">
        <div className="card">
          <div className="card-body">
            <div className="row gap-6">
              <div className="col"><span className="t-micro">Кладовка</span><span className="mono mt-1">{c.code} / {u.number}</span></div>
              <div className="col"><span className="t-micro">Локация</span><span className="mt-1">{l.name}</span></div>
              <div className="col"><span className="t-micro">Размер</span><span className="mt-1">{u.size} м²</span></div>
              <div className="col"><span className="t-micro">Цена/день</span><span className="mono mt-1">{fmtMoney(u.price)}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="row" style={{justifyContent:"space-between"}}>
            <div className="col"><span className="t-micro">Начало</span><span className="mt-1">{fmtDate(r.date_from)}</span></div>
            <div className="col" style={{alignItems:"center"}}><span className="t-micro">Срок</span><span className="serif mt-1" style={{fontSize:22}}>{days} дней</span></div>
            <div className="col" style={{alignItems:"flex-end"}}><span className="t-micro">Окончание</span><span className="mt-1">{fmtDate(r.date_to)}</span></div>
          </div>
          <div className="bar mt-3" style={{height:8}}>
            <span style={{width:`${progress}%`, background:"var(--ink)"}}></span>
          </div>
          <div className="t-small mt-2">{elapsedDays} из {days} дней пройдено · {Math.round(progress)}%</div>
        </div>

        <div className="mt-6 card">
          <div className="card-body">
            <div className="row" style={{justifyContent:"space-between"}}>
              <div className="col"><span className="t-micro">Итого</span><span className="serif mt-1" style={{fontSize:32, lineHeight:1}}>{fmtMoney(r.price)}</span></div>
              <div className="col"><span className="t-micro">Расчёт</span><span className="mono mt-1">{fmtMoney(u.price)} × {days}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="drawer-foot">
        <Button variant="ghost" onClick={onClose}>Закрыть</Button>
        {r.status === "active" && <>
          <Button icon="check">Завершить</Button>
          <Button variant="danger" icon="close">Отменить</Button>
        </>}
      </div>
    </>
  );
};

const CreateRentModal = ({ open, onClose, presetUnitId }) => {
  const [unitId, setUnitId] = useState(presetUnitId || "");
  const [from, setFrom] = useState("2026-05-08");
  const [to, setTo] = useState("2026-06-07");
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => { if (presetUnitId) setUnitId(presetUnitId); }, [presetUnitId]);

  const u = UNS.find(x => x.id === Number(unitId));
  const days = u ? Math.max(0, Math.round((new Date(to) - new Date(from)) / 86400000)) : 0;
  const total = u ? days * u.price : 0;
  const isValid = u && days >= 10 && client.length > 1 && phone.length > 5;

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} width={620}>
      <div className="card-head" style={{padding:"18px 20px"}}>
        <div className="col">
          <span className="t-micro">Новая аренда</span>
          <span className="h-display-sm mt-1">Оформить договор</span>
        </div>
        <button className="icon-btn" onClick={onClose}><Ic name="close"/></button>
      </div>
      <div style={{padding:20}}>
        <div className="col gap-3">
          <Field label="Кладовка" hint="Минимальный срок аренды — 10 дней">
            <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
              <option value="">— выберите —</option>
              {UNS.filter(x => x.status === "free" || x.status === "reserved" || x.id === Number(unitId)).slice(0, 200).map(x => {
                const cc = CONS.find(c => c.id === x.container_id);
                const ll = LOCS.find(l => l.id === cc.location_id);
                return <option key={x.id} value={x.id}>{ll.name} · {cc.code} / {x.number} · {x.size}м² · {fmtMoney(x.price)}/день</option>;
              })}
            </select>
          </Field>
          <div className="row gap-3">
            <Field label="Имя клиента"><input className="input" value={client} onChange={e=>setClient(e.target.value)} placeholder="Иванов Иван"/></Field>
            <Field label="Телефон"><input className="input mono" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 (___) ___-__-__"/></Field>
          </div>
          <div className="row gap-3">
            <Field label="Дата начала"><input type="date" className="input mono" value={from} onChange={e=>setFrom(e.target.value)}/></Field>
            <Field label="Дата окончания" hint={days < 10 && days > 0 ? <span style={{color:"var(--st-blocked)"}}>Минимум 10 дней</span> : null}>
              <input type="date" className="input mono" value={to} onChange={e=>setTo(e.target.value)}/>
            </Field>
          </div>
        </div>

        {u && (
          <div className="card mt-4" style={{background:"var(--bg-muted)", borderColor:"transparent"}}>
            <div className="card-body row" style={{justifyContent:"space-between"}}>
              <div className="col"><span className="t-micro">Расчёт стоимости</span>
                <span className="mono mt-1">{fmtMoney(u.price)}/день × {days} {days === 1 ? "день" : "дней"}</span>
              </div>
              <div className="col" style={{alignItems:"flex-end"}}>
                <span className="t-micro">Итого</span>
                <span className="serif mt-1" style={{fontSize:30, lineHeight:1}}>{fmtMoney(total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="card-foot row" style={{justifyContent:"flex-end", gap:10}}>
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button variant="primary" disabled={!isValid} onClick={onClose}>Оформить аренду</Button>
      </div>
    </Modal>
  );
};

Object.assign(window, { LocationsScreen, ContainersScreen, UnitsScreen, RentsScreen, CreateRentModal });
