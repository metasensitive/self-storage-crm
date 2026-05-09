// Mock data shaped per Laravel models
// Locations: name, city, address, latitude, longitude, status
// Containers: location_id, code, units_count, status, installed_at
// Units: container_id, number, size, price, status
// Rents: unit_id, date_from, date_to, price, status
// Users: name, email, role, avatar

const LOCATIONS = [
  { id: 1, name: "ЖК Прайм Парк",       city: "Москва",          address: "Ленинградский пр-т, 39с2", latitude: 55.792, longitude: 37.530, status: "active",  containers_count: 4, units_count: 96 },
  { id: 2, name: "ЖК Символ",           city: "Москва",          address: "ул. Золоторожский Вал, 11", latitude: 55.751, longitude: 37.701, status: "active",  containers_count: 3, units_count: 72 },
  { id: 3, name: "ЖК Северный Порт",    city: "Санкт-Петербург", address: "Приморский пр-т, 52",      latitude: 59.987, longitude: 30.260, status: "active",  containers_count: 2, units_count: 48 },
  { id: 4, name: "ЖК Republic",         city: "Москва",          address: "Пресненский Вал, 27",      latitude: 55.764, longitude: 37.572, status: "active",  containers_count: 3, units_count: 70 },
  { id: 5, name: "ЖК Балтийская Жемчужина", city: "Санкт-Петербург", address: "Петергофское ш., 51",   latitude: 59.842, longitude: 30.171, status: "inactive", containers_count: 1, units_count: 24 },
  { id: 6, name: "ЖК Зиларт",            city: "Москва",          address: "ул. Архитектора Щусева, 4", latitude: 55.694, longitude: 37.642, status: "active",  containers_count: 5, units_count: 120 },
];

const CONTAINERS = [
  { id: 101, location_id: 1, code: "PP-A1", units_count: 24, status: "active",      installed_at: "2024-03-12" },
  { id: 102, location_id: 1, code: "PP-A2", units_count: 24, status: "active",      installed_at: "2024-03-14" },
  { id: 103, location_id: 1, code: "PP-B1", units_count: 24, status: "active",      installed_at: "2024-08-02" },
  { id: 104, location_id: 1, code: "PP-B2", units_count: 24, status: "maintenance", installed_at: "2024-09-01" },
  { id: 201, location_id: 2, code: "SY-01", units_count: 24, status: "active",      installed_at: "2023-11-06" },
  { id: 202, location_id: 2, code: "SY-02", units_count: 24, status: "active",      installed_at: "2024-02-19" },
  { id: 203, location_id: 2, code: "SY-03", units_count: 24, status: "active",      installed_at: "2025-01-15" },
  { id: 301, location_id: 3, code: "NP-N1", units_count: 24, status: "active",      installed_at: "2024-06-20" },
  { id: 302, location_id: 3, code: "NP-N2", units_count: 24, status: "active",      installed_at: "2024-07-10" },
  { id: 401, location_id: 4, code: "RP-01", units_count: 24, status: "active",      installed_at: "2024-04-01" },
  { id: 402, location_id: 4, code: "RP-02", units_count: 22, status: "active",      installed_at: "2024-04-05" },
  { id: 403, location_id: 4, code: "RP-03", units_count: 24, status: "inactive",    installed_at: "2024-05-11" },
  { id: 501, location_id: 5, code: "BJ-01", units_count: 24, status: "inactive",    installed_at: "2023-08-01" },
  { id: 601, location_id: 6, code: "ZL-A1", units_count: 24, status: "active",      installed_at: "2024-10-01" },
  { id: 602, location_id: 6, code: "ZL-A2", units_count: 24, status: "active",      installed_at: "2024-10-04" },
  { id: 603, location_id: 6, code: "ZL-B1", units_count: 24, status: "active",      installed_at: "2024-12-12" },
  { id: 604, location_id: 6, code: "ZL-B2", units_count: 24, status: "active",      installed_at: "2025-01-20" },
  { id: 605, location_id: 6, code: "ZL-C1", units_count: 24, status: "maintenance", installed_at: "2025-02-09" },
];

// Generate units deterministically from container counts
const SIZES = [1.5, 2, 2.5, 3, 4, 5, 6];
const STATUS_POOL = ["rented","rented","rented","rented","rented","rented","reserved","free","free","free","blocked"];
function priceFor(size) { return Math.round((1500 + size * 1300) / 50) * 50; }

const UNITS = (() => {
  const out = [];
  let id = 1000;
  let seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (const c of CONTAINERS) {
    for (let i = 1; i <= c.units_count; i++) {
      const size = SIZES[Math.floor(rnd() * SIZES.length)];
      let status = STATUS_POOL[Math.floor(rnd() * STATUS_POOL.length)];
      if (c.status === "maintenance") status = "blocked";
      if (c.status === "inactive") status = rnd() < 0.7 ? "free" : status;
      out.push({
        id: id++,
        container_id: c.id,
        number: String(i).padStart(2, "0"),
        size,
        price: priceFor(size),
        status,
      });
    }
  }
  return out;
})();

const CLIENT_NAMES = [
  "Анна Соколова","Иван Петров","Дарья Лебедева","Михаил Орлов","Екатерина Соловьёва",
  "Артём Кузнецов","Ольга Новикова","Дмитрий Волков","Полина Беляева","Сергей Гордеев",
  "Мария Тихонова","Никита Зайцев","Юлия Громова","Алексей Морозов","Ксения Лаврова",
  "Андрей Козлов","Татьяна Фёдорова","Виктор Семёнов","Алина Яковлева","Роман Карпов",
];
function pickClient(seed) {
  const n = CLIENT_NAMES[seed % CLIENT_NAMES.length];
  const phone = `+7 (${900 + (seed % 99)}) ${String(100 + seed % 900).padStart(3,"0")}-${String(10 + seed % 89)}-${String(10 + (seed*7) % 89)}`;
  return { name: n, phone };
}

const TODAY = new Date("2026-05-08");
function daysFrom(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
function fmtDate(s) { if (!s) return ""; const d = new Date(s); return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }); }

const RENTS = (() => {
  const out = [];
  let rid = 5000;
  for (const u of UNITS) {
    if (u.status === "rented") {
      const startOffset = -Math.floor(Math.random() * 80) - 5;
      const len = 30 + Math.floor(Math.random() * 90);
      out.push({
        id: rid++,
        unit_id: u.id,
        date_from: daysFrom(TODAY, startOffset),
        date_to: daysFrom(TODAY, startOffset + len),
        price: u.price * len,
        status: "active",
        client: pickClient(rid),
      });
    } else if (u.status === "reserved") {
      out.push({
        id: rid++,
        unit_id: u.id,
        date_from: daysFrom(TODAY, 2 + Math.floor(Math.random() * 5)),
        date_to: daysFrom(TODAY, 2 + 30 + Math.floor(Math.random() * 30)),
        price: u.price * 30,
        status: "active",
        client: pickClient(rid),
      });
    }
  }
  // a few finished/cancelled
  for (let i = 0; i < 14; i++) {
    const u = UNITS[Math.floor(Math.random() * UNITS.length)];
    out.push({
      id: rid++,
      unit_id: u.id,
      date_from: daysFrom(TODAY, -160 - i * 7),
      date_to: daysFrom(TODAY, -120 - i * 7),
      price: u.price * 40,
      status: i % 5 === 0 ? "cancelled" : "finished",
      client: pickClient(rid),
    });
  }
  return out;
})();

const USERS = [
  { id: 1, name: "Александр Метов",  email: "admin@example.com",     role: "admin",   avatar: null, last_seen: "5 минут назад" },
  { id: 2, name: "Елена Маркова",     email: "manager@example.com",   role: "manager", avatar: null, last_seen: "1 час назад" },
  { id: 3, name: "Кирилл Долгов",     email: "k.dolgov@example.com",  role: "manager", avatar: null, last_seen: "вчера" },
  { id: 4, name: "Наталья Свиридова", email: "n.sviridova@example.com", role: "manager", avatar: null, last_seen: "2 дня назад" },
  { id: 5, name: "Олег Журавлёв",     email: "o.zhuravlev@example.com", role: "manager", avatar: null, last_seen: "3 дня назад" },
];

// Aggregate analytics derived from UNITS + RENTS for the network
function networkStats() {
  const total = UNITS.length;
  const free = UNITS.filter(u => u.status === "free").length;
  const rented = UNITS.filter(u => u.status === "rented").length;
  const reserved = UNITS.filter(u => u.status === "reserved").length;
  const blocked = UNITS.filter(u => u.status === "blocked").length;
  const occupied = rented + reserved;
  const monthlyIncome = RENTS
    .filter(r => ["active","finished"].includes(r.status))
    .reduce((s, r) => s + r.price, 0) * 0.18; // ~current-month slice
  return {
    total_units: total,
    free_units: free, rented_units: rented, reserved_units: reserved, blocked_units: blocked,
    occupied_units: occupied,
    occupancy_percent: total ? Math.round(occupied / total * 1000) / 10 : 0,
    monthly_income: Math.round(monthlyIncome),
  };
}

function locationStats(locationId) {
  const cIds = CONTAINERS.filter(c => c.location_id === locationId).map(c => c.id);
  const us = UNITS.filter(u => cIds.includes(u.container_id));
  const total = us.length;
  const free = us.filter(u => u.status === "free").length;
  const rented = us.filter(u => u.status === "rented").length;
  const reserved = us.filter(u => u.status === "reserved").length;
  const blocked = us.filter(u => u.status === "blocked").length;
  const occupied = rented + reserved;
  const uIds = us.map(u => u.id);
  const monthlyIncome = RENTS.filter(r => uIds.includes(r.unit_id) && ["active","finished"].includes(r.status))
    .reduce((s,r) => s + r.price, 0) * 0.18;
  return {
    total_units: total,
    free_units: free, rented_units: rented, reserved_units: reserved, blocked_units: blocked,
    occupied_units: occupied,
    occupancy_percent: total ? Math.round(occupied / total * 1000) / 10 : 0,
    monthly_income: Math.round(monthlyIncome),
  };
}

function containerStats(containerId) {
  const us = UNITS.filter(u => u.container_id === containerId);
  const total = us.length;
  const free = us.filter(u => u.status === "free").length;
  const rented = us.filter(u => u.status === "rented").length;
  const reserved = us.filter(u => u.status === "reserved").length;
  const blocked = us.filter(u => u.status === "blocked").length;
  const occupied = rented + reserved;
  const uIds = us.map(u => u.id);
  const monthlyIncome = RENTS.filter(r => uIds.includes(r.unit_id) && ["active","finished"].includes(r.status))
    .reduce((s,r) => s + r.price, 0) * 0.18;
  return {
    total_units: total, free_units: free, rented_units: rented, reserved_units: reserved, blocked_units: blocked,
    occupied_units: occupied,
    occupancy_percent: total ? Math.round(occupied / total * 1000) / 10 : 0,
    monthly_income: Math.round(monthlyIncome),
  };
}

// Demo time-series for revenue chart (last 30 days)
const REVENUE_30D = (() => {
  const out = [];
  let s = 51;
  for (let i = 29; i >= 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    out.push({
      date: daysFrom(TODAY, -i),
      value: 70000 + Math.round(r * 90000) + (i < 8 ? 35000 : 0),
    });
  }
  return out;
})();

// Activity feed
const ACTIVITY = [
  { id: 1, who: "Елена Маркова",    what: "оформила аренду",   sub: "ZL-A1 / 12 — Анна Соколова, 90 дней",  when: "12 минут назад", kind: "rent" },
  { id: 2, who: "Кирилл Долгов",    what: "завершил аренду",  sub: "PP-A2 / 07 — Дмитрий Волков",           when: "47 минут назад", kind: "finish" },
  { id: 3, who: "Александр Метов",  what: "обновил статус",   sub: "Контейнер PP-B2 → maintenance",         when: "сегодня, 09:14", kind: "status" },
  { id: 4, who: "Наталья Свиридова", what: "оформила аренду", sub: "SY-02 / 18 — Артём Кузнецов, 45 дней",  when: "вчера, 17:32", kind: "rent" },
  { id: 5, who: "Александр Метов",  what: "добавил локацию",  sub: "ЖК Зиларт",                              when: "вчера, 14:08", kind: "create" },
  { id: 6, who: "Елена Маркова",    what: "изменила цену",    sub: "RP-01 / 09 — 4 200 → 4 500 ₽/день",     when: "вчера, 11:50", kind: "price" },
];

window.DATA = {
  LOCATIONS, CONTAINERS, UNITS, RENTS, USERS,
  networkStats, locationStats, containerStats,
  REVENUE_30D, ACTIVITY,
  fmtDate,
};
