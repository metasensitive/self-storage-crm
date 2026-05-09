import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import '@/styles/landing.css';

/* ===== Helpers ===== */
type LandingStatus = 'free' | 'rented' | 'reserved' | 'blocked';

const STATUSES: LandingStatus[] = [
  'free',
  'rented',
  'rented',
  'reserved',
  'free',
  'rented',
  'blocked',
  'free',
  'rented',
];
const randomStatus = (): LandingStatus =>
  STATUSES[Math.floor(Math.random() * STATUSES.length)];

function useCountUp(target: number, duration = 1400, start = false): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) {
      setVal(0);
      return;
    }
    let raf = 0;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 == null) t0 = ts;
      const p = Math.min(1, (ts - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return val;
}

function useInView(threshold = 0.3): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

/* ===== Icons ===== */
interface SvgIconProps {
  children: ReactNode;
  size?: number;
}

const SvgIcon = ({ children, size = 16 }: SvgIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const I = {
  arrow: (
    <SvgIcon>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </SvgIcon>
  ),
  bolt: (
    <SvgIcon>
      <path d="m13 2-9 12h7l-2 8 9-12h-7l2-8Z" />
    </SvgIcon>
  ),
  pin: (
    <SvgIcon>
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z" />
      <circle cx="12" cy="9" r="2.5" />
    </SvgIcon>
  ),
  chart: (
    <SvgIcon>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-6" />
    </SvgIcon>
  ),
  users: (
    <SvgIcon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c1-3.5 4-5.5 7-5.5s6 2 7 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 19c-.6-2.4-2.4-4-4.6-4" />
    </SvgIcon>
  ),
  box: (
    <SvgIcon>
      <path d="m3 7 9-5 9 5v10l-9 5-9-5z" />
      <path d="M3 7l9 5 9-5" />
      <path d="M12 12v10" />
    </SvgIcon>
  ),
};

/* ===== NAV ===== */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={'lp-nav' + (scrolled ? ' scrolled' : '')}>
      <div className="lp-shell">
        <div className="lp-nav-row">
          <a className="lp-brand" href="#top">
            <div className="mark">S</div>
            <div>Storehaus</div>
          </a>
          <div className="lp-nav-links">
            <a className="lp-nav-link" href="#features">
              Возможности
            </a>
            <a className="lp-nav-link" href="#dash">
              Дашборд
            </a>
            <a className="lp-nav-link" href="#try">
              Демо
            </a>
            <a className="lp-nav-link" href="#stats">
              О сети
            </a>
          </div>
          <Link className="btn-hero" to="/login">
            Войти {I.arrow}
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ===== HERO VISUAL ===== */
function HeroVisual() {
  const COLS = 12;
  const ROWS = 8;
  const total = COLS * ROWS;
  const [grid, setGrid] = useState<LandingStatus[]>(() =>
    Array.from({ length: total }, () => randomStatus()),
  );
  const [flashIdx, setFlashIdx] = useState(-1);

  useEffect(() => {
    const id = setInterval(() => {
      const idx = Math.floor(Math.random() * total);
      setGrid((g) => {
        const ng = g.slice();
        ng[idx] = randomStatus();
        return ng;
      });
      setFlashIdx(idx);
      window.setTimeout(() => setFlashIdx(-1), 600);
    }, 700);
    return () => clearInterval(id);
  }, [total]);

  const counts = grid.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const occ = Math.round((((counts.rented || 0) + (counts.reserved || 0)) / total) * 100);

  return (
    <div className="lp-hero-visual">
      <div className="lp-visual-head">
        <div className="label">Москва · Контейнер K-204</div>
        <div className="live">live · {occ}% занято</div>
      </div>
      <div className="lp-units">
        {grid.map((s, i) => (
          <div
            key={i}
            className={'lp-unit s-' + s + (i === flashIdx ? ' flash' : '')}
            title={'#' + (i + 1) + ' · ' + s}
            onMouseEnter={() =>
              setGrid((g) => {
                const ng = g.slice();
                ng[i] = randomStatus();
                return ng;
              })
            }
          />
        ))}
      </div>
      <div className="lp-legend">
        <span className="item">
          <span className="sw free" />
          свободно · {counts.free || 0}
        </span>
        <span className="item">
          <span className="sw rented" />
          занято · {counts.rented || 0}
        </span>
        <span className="item">
          <span className="sw reserved" />
          бронь · {counts.reserved || 0}
        </span>
        <span className="item">
          <span className="sw blocked" />
          блок · {counts.blocked || 0}
        </span>
        <span className="grow">
          {COLS}×{ROWS} · {total}
        </span>
      </div>
    </div>
  );
}

/* ===== HERO ===== */
function Hero() {
  return (
    <section className="lp-shell" id="top">
      <div className="lp-hero">
        <div>
          <span className="lp-eyebrow">
            <span className="pulse-dot" />
            CRM для самостоятельных кладовок
          </span>
          <h1>
            Управляйте сетью складов <em>как одной системой</em>
          </h1>
          <p className="sub">
            Локации, контейнеры, кладовки и аренды — в одном живом дашборде. Видите занятость в
            реальном времени, оформляете аренду в один клик, контролируете доход по каждой точке.
          </p>
          <div className="lp-hero-cta">
            <Link className="btn-hero" to="/login">
              Войти в систему {I.arrow}
            </Link>
            <a className="btn-hero-ghost" href="#dash">
              Посмотреть дашборд
            </a>
          </div>
          <div className="lp-trust">
            <div className="stack">
              <span className="av" style={{ background: 'oklch(0.86 0.05 80)', color: '#5a3d10' }}>
                АМ
              </span>
              <span className="av" style={{ background: 'oklch(0.86 0.05 250)', color: '#1f3470' }}>
                ИК
              </span>
              <span className="av" style={{ background: 'oklch(0.86 0.05 150)', color: '#1f5236' }}>
                ДС
              </span>
              <span className="av" style={{ background: 'oklch(0.86 0.04 25)', color: '#6b1f1f' }}>
                +9
              </span>
            </div>
            <span>Используют управляющие 12&nbsp;сетей в&nbsp;РФ</span>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/* ===== MARQUEE ===== */
function Marquee() {
  const items = [
    '12 сетей кладовок',
    '1 248 контейнеров',
    '18 920 кладовок',
    '94% средняя загрузка',
    '₽ 38M оборот в месяц',
    '8 городов',
  ];
  const all = [...items, ...items];
  return (
    <div className="lp-marquee">
      <div className="lp-marquee-track">
        {all.map((it, i) => (
          <span key={i} className="lp-marquee-item">
            <em style={{ fontStyle: 'italic' }}>{it}</em>
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===== AREA CHART ===== */
interface AreaChartProps {
  data: number[];
  accent?: string;
}

function AreaChart({ data, accent = 'oklch(0.55 0.10 250)' }: AreaChartProps) {
  const w = 600;
  const h = 140;
  const pad = 8;
  const max = Math.max(...data) * 1.1;
  const min = 0;
  const step = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / (max - min || 1));
    return [x, y] as [number, number];
  });
  const gradId = useMemo(
    () => 'lp-area-' + Math.random().toString(36).slice(2, 9),
    [],
  );
  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ');
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L${last[0]},${h - pad} L${first[0]},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill={accent} />
    </svg>
  );
}

/* ===== LIVE DASHBOARD ===== */
type Period = 'day' | 'month' | 'year';

interface PeriodData {
  rev: number;
  occ: number;
  free: number;
  rented: number;
  reserved: number;
  blocked: number;
  deals: number;
  series: number[];
}

const DASH_DATA: Record<Period, PeriodData> = {
  day: {
    rev: 184_200, occ: 92, free: 56, rented: 624, reserved: 41, blocked: 12, deals: 14,
    series: [9, 11, 10, 13, 12, 14, 18, 16, 15, 19, 21, 18, 22, 25, 23, 26, 28, 27, 29, 32, 30, 33, 34, 38, 36, 40, 42, 44, 46, 48],
  },
  month: {
    rev: 4_180_000, occ: 88, free: 142, rented: 3128, reserved: 184, blocked: 38, deals: 412,
    series: [12, 14, 18, 16, 21, 24, 22, 28, 30, 34, 38, 36, 42, 46, 50, 55, 58, 62, 65, 68, 72, 76, 82, 88, 92, 96, 102, 108, 118, 124],
  },
  year: {
    rev: 38_600_000, occ: 86, free: 1240, rented: 22480, reserved: 1340, blocked: 320, deals: 4180,
    series: [80, 95, 110, 140, 160, 200, 240, 280, 320, 370, 420, 480, 560, 640, 720, 810, 920, 1040, 1180, 1320, 1460, 1610, 1780, 1960, 2100, 2280, 2470, 2650, 2830, 3120],
  },
};

interface FeedItem {
  id: number;
  c: string;
  t: string;
}

const FEED_TEMPLATES: Array<Omit<FeedItem, 'id'>> = [
  { c: 'oklch(0.55 0.10 250)', t: 'Новая аренда · кладовка 12-A в K-204 · ₽ 4 200 / мес' },
  { c: 'oklch(0.62 0.10 150)', t: 'Освободилась 08-C в Балашихе' },
  { c: 'oklch(0.62 0.10 80)', t: 'Бронь на 14-B · K-118 истекает через 2 ч' },
  { c: 'oklch(0.55 0.10 250)', t: 'Продлена аренда 03-A · клиент И.М. · +6 мес' },
  { c: 'oklch(0.58 0.10 25)', t: 'Контейнер K-302 переведён в обслуживание' },
  { c: 'oklch(0.55 0.10 250)', t: 'Аренда 21-D в Подольске · ₽ 5 800 / мес' },
];

function fmtMoneyCompact(n: number): string {
  if (n >= 1e6) return '₽ ' + (n / 1e6).toFixed(2) + 'M';
  return '₽ ' + (n / 1e3).toFixed(0) + 'K';
}

function LiveDash() {
  const [period, setPeriod] = useState<Period>('month');
  const [ref, seen] = useInView(0.25);

  const d = DASH_DATA[period];

  const revAnim = useCountUp(d.rev, 1500, seen);
  const occAnim = useCountUp(d.occ, 1100, seen);
  const dealsAnim = useCountUp(d.deals, 1100, seen);
  const rentAnim = useCountUp(d.rented, 1300, seen);

  const total = d.free + d.rented + d.reserved + d.blocked;
  const stats = [
    { k: 'rented', l: 'Занято', v: d.rented, c: 'oklch(0.55 0.10 250)' },
    { k: 'free', l: 'Свободно', v: d.free, c: 'oklch(0.62 0.10 150)' },
    { k: 'reserved', l: 'Бронь', v: d.reserved, c: 'oklch(0.62 0.10 80)' },
    { k: 'blocked', l: 'Блок', v: d.blocked, c: 'oklch(0.58 0.10 25)' },
  ];

  const [feed, setFeed] = useState<FeedItem[]>(() =>
    FEED_TEMPLATES.slice(0, 4).map((it, i) => ({ ...it, id: i })),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const tpl = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)];
      setFeed((f) => [{ ...tpl, id: Date.now() }, ...f.slice(0, 3)]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="lp-section"
      id="dash"
      ref={ref as unknown as React.RefObject<HTMLElement>}
    >
      <div className="lp-shell">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Дашборд · Превью</div>
          <h2>
            Один экран — <em>вся сеть в&nbsp;живом времени</em>
          </h2>
          <p className="lead">
            KPI обновляются по событиям с касс и пунктов оформления. Переключайте период — и
            видите, как меняется загрузка, доход и количество сделок.
          </p>
        </div>

        <div className="lp-dash">
          <div className="lp-dash-head">
            <div className="lp-dash-title">Сводка по сети</div>
            <div className="lp-period">
              {(
                [
                  { k: 'day', l: 'За день' },
                  { k: 'month', l: 'За месяц' },
                  { k: 'year', l: 'За год' },
                ] as const
              ).map((p) => (
                <button
                  key={p.k}
                  type="button"
                  className={period === p.k ? 'active' : ''}
                  onClick={() => setPeriod(p.k)}
                >
                  {p.l}
                </button>
              ))}
            </div>
          </div>

          <div className="lp-dash-grid">
            <div className="lp-dash-kpis">
              <div className="lp-dash-kpi">
                <div className="lbl">Доход</div>
                <div className="val">{fmtMoneyCompact(revAnim)}</div>
                <div className="delta">↑ +12.4% к прошлому периоду</div>
              </div>
              <div className="lp-dash-kpi">
                <div className="lbl">Загрузка</div>
                <div className="val">
                  {occAnim}
                  <span className="u">%</span>
                </div>
                <div className="delta">↑ +2.1 п.п.</div>
              </div>
              <div className="lp-dash-kpi">
                <div className="lbl">Активных аренд</div>
                <div className="val">{rentAnim.toLocaleString('ru')}</div>
                <div className="delta">+{Math.round(d.rented * 0.04)} новых</div>
              </div>
              <div className="lp-dash-kpi">
                <div className="lbl">Сделок</div>
                <div className="val">{dealsAnim.toLocaleString('ru')}</div>
                <div className="delta">↑ +18 vs план</div>
              </div>

              <div className="lp-dash-chart">
                <div className="lp-dash-chart-head">
                  <div className="t">Динамика дохода</div>
                  <div className="v">{fmtMoneyCompact(d.rev)}</div>
                </div>
                <AreaChart data={d.series} />
              </div>
            </div>

            <div className="lp-dash-side">
              <div className="lp-dash-card">
                <div className="ttl">Статусы кладовок</div>
                <div className="lp-stat-rows">
                  {stats.map((s) => (
                    <div className="lp-stat-row" key={s.k}>
                      <div className="meta">
                        <span>{s.l}</span>
                        <span className="v">
                          {s.v.toLocaleString('ru')} · {Math.round((s.v / total) * 100)}%
                        </span>
                      </div>
                      <div className="bar">
                        <span
                          style={{
                            width: seen ? (s.v / total) * 100 + '%' : '0%',
                            background: s.c,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lp-dash-card">
                <div className="ttl">Живая активность</div>
                <div className="lp-feed">
                  {feed.map((f, i) => (
                    <div className="lp-feed-item" key={f.id}>
                      <span className="dot" style={{ background: f.c }} />
                      <div>
                        <div className="txt">{f.t}</div>
                        <div className="time">
                          {i === 0 ? 'только что' : i * 4 + ' мин назад'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== TRY-IT ===== */
function TryIt() {
  const SIZE = 56;
  const [grid, setGrid] = useState<LandingStatus[]>(() => {
    const init: LandingStatus[] = Array.from({ length: SIZE }, () => 'free');
    [2, 5, 9, 13, 18, 22, 27, 30, 34, 40, 44, 48, 51].forEach((i) => (init[i] = 'rented'));
    [7, 15, 29, 42].forEach((i) => (init[i] = 'reserved'));
    [11, 38].forEach((i) => (init[i] = 'blocked'));
    return init;
  });
  const [tool, setTool] = useState<LandingStatus>('rented');

  const tools: Array<{ k: LandingStatus; l: string; c: string }> = [
    { k: 'rented', l: 'Заселить', c: 'oklch(0.55 0.10 250)' },
    { k: 'free', l: 'Освободить', c: 'oklch(0.62 0.10 150)' },
    { k: 'reserved', l: 'Бронь', c: 'oklch(0.62 0.10 80)' },
    { k: 'blocked', l: 'Блок', c: 'oklch(0.58 0.10 25)' },
  ];

  const counts = grid.reduce<Record<string, number>>((a, s) => {
    a[s] = (a[s] || 0) + 1;
    return a;
  }, {});
  const occ = Math.round((((counts.rented || 0) + (counts.reserved || 0)) / SIZE) * 100);

  return (
    <section className="lp-try-section" id="try">
      <div className="lp-shell">
        <div className="lp-try">
          <div>
            <div className="lp-section-eyebrow">Поиграйте</div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(34px, 4.4vw, 56px)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
                fontWeight: 400,
                margin: '14px 0 0',
                textWrap: 'balance' as CSSProperties['textWrap'],
              }}
            >
              Кликайте по&nbsp;ячейкам — это <em>точно так же работает</em> в&nbsp;CRM
            </h2>
            <p className="lead">
              Карта контейнера с цветовой индикацией статуса. Нажмите инструмент слева, затем
              выберите ячейки. Менеджер делает то же самое в один клик — оформление аренды, бронь
              или блокировка кладовки.
            </p>

            <div
              style={{
                marginTop: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                'Выберите инструмент в нижнем меню',
                'Кликайте по кладовкам — статус сменится сразу',
                'Загрузка контейнера пересчитается в реальном времени',
              ].map((step, i) => (
                <div className="lp-try-step" key={i}>
                  <span className="num">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-try-grid">
            <div className="lp-try-row">
              <span className="pill">K-204 / Москва</span>
              <span className="pill">7×8 = 56 кладовок</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'var(--mono)',
                  fontSize: 13,
                  color: 'var(--ink)',
                }}
              >
                загрузка <strong>{occ}%</strong>
              </span>
            </div>
            <div className="lp-try-units">
              {grid.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className={'lp-try-unit s-' + s}
                  onClick={() =>
                    setGrid((g) => {
                      const ng = g.slice();
                      ng[i] = tool;
                      return ng;
                    })
                  }
                >
                  {String(Math.floor(i / 8) + 1).padStart(2, '0')}
                  {String.fromCharCode(65 + (i % 8))}
                </button>
              ))}
            </div>
            <div className="lp-try-toolbar">
              {tools.map((t) => (
                <button
                  key={t.k}
                  type="button"
                  className={'lp-try-tool' + (tool === t.k ? ' active' : '')}
                  onClick={() => setTool(t.k)}
                >
                  <span className="sw" style={{ background: t.c }} />
                  {t.l}
                </button>
              ))}
              <span className="lp-try-counter">
                занято {counts.rented || 0} · своб. {counts.free || 0} · бронь{' '}
                {counts.reserved || 0} · блок {counts.blocked || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== FEATURES ===== */
function Features() {
  return (
    <section className="lp-section" id="features">
      <div className="lp-shell">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Возможности</div>
          <h2>
            Всё, что нужно <em>управляющему сетью</em>
          </h2>
          <p className="lead">
            Локации, контейнеры, кладовки, аренды и сотрудники — в одной системе. Никаких таблиц,
            никаких рассинхронов.
          </p>
        </div>

        <div className="lp-bento">
          <div className="lp-tile tile-w2">
            <div className="icon-wrap">{I.box}</div>
            <h3>Иерархия активов</h3>
            <p>
              Локации → контейнеры → кладовки. Любой элемент можно открыть и посмотреть детальную
              аналитику.
            </p>
          </div>

          <div className="lp-tile tile-w2 tile-spark">
            <div className="icon-wrap">{I.chart}</div>
            <h3>Аналитика в реальном времени</h3>
            <p>Доход, заполняемость, прогнозы — по точке, контейнеру и сети.</p>
            <AreaChart
              data={[
                8, 12, 10, 15, 18, 22, 20, 26, 30, 28, 34, 38, 36, 42, 46, 50, 55, 52, 58, 62, 66,
                72, 78, 82, 88, 92, 98, 104, 112, 118,
              ]}
              accent="oklch(0.40 0.10 250)"
            />
          </div>

          <div className="lp-tile tile-w2 tile-map">
            <div className="icon-wrap">{I.pin}</div>
            <h3>Карта локаций</h3>
            <p>Все точки по координатам. Смотрите загрузку городами в одном клике.</p>
            <div className="map-vis">
              <span className="map-pin" style={{ top: '24%', left: '22%' }} />
              <span className="map-pin" style={{ top: '52%', left: '36%', animationDelay: '0.6s' }} />
              <span className="map-pin" style={{ top: '38%', left: '58%', animationDelay: '1.2s' }} />
              <span className="map-pin" style={{ top: '66%', left: '72%', animationDelay: '1.8s' }} />
              <span className="map-pin" style={{ top: '22%', left: '78%', animationDelay: '0.3s' }} />
            </div>
          </div>

          <div className="lp-tile tile-w3 tile-dark">
            <div className="icon-wrap">{I.users}</div>
            <h3>Роли и доступы</h3>
            <p style={{ marginBottom: 14 }}>
              Администратор управляет сетью, менеджер — своей точкой. Без путаницы.
            </p>
            <div className="roles-row">
              <div className="role-card">
                <div className="label">Администратор</div>
                <div className="name">Полный доступ</div>
                <div className="perms">
                  <span>
                    <span className="check">✓</span> локации, контейнеры
                  </span>
                  <span>
                    <span className="check">✓</span> сотрудники, биллинг
                  </span>
                  <span>
                    <span className="check">✓</span> аналитика по сети
                  </span>
                </div>
              </div>
              <div className="role-card">
                <div className="label">Менеджер</div>
                <div className="name">Своя локация</div>
                <div className="perms">
                  <span>
                    <span className="check">✓</span> аренды, кладовки
                  </span>
                  <span>
                    <span className="check">✓</span> аналитика точки
                  </span>
                  <span>
                    <span className="x">—</span> сеть и сотрудники
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lp-tile tile-w3">
            <div className="icon-wrap">{I.bolt}</div>
            <h3>Оформление аренды за 14 секунд</h3>
            <p>
              Выбрали кладовку — указали сроки — система посчитала цену и проверила минимальный
              срок (10 дней).
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 18,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-muted)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>15-A · 4 м²</span>
                  <span>30 дн.</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 4,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  <span>Итого</span>
                  <span>₽ 4 200</span>
                </div>
              </div>
              <Link
                to="/login"
                className="btn"
                style={{
                  borderColor: 'var(--ink)',
                  background: 'var(--ink)',
                  color: 'var(--bg-elev)',
                  textDecoration: 'none',
                }}
              >
                Создать
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== STATS ===== */
function Stats() {
  const [ref, seen] = useInView(0.4);
  const a = useCountUp(15, 1500, seen);
  const b = useCountUp(320, 1700, seen);
  const c = useCountUp(4870, 1900, seen);
  const d = useCountUp(94, 1500, seen);
  return (
    <section
      className="lp-shell"
      id="stats"
      ref={ref as unknown as React.RefObject<HTMLElement>}
    >
      <div className="lp-stats">
        <div className="lp-stat">
          <div className="num">{a}</div>
          <div className="lbl">Локаций в&nbsp;продакшне</div>
        </div>
        <div className="lp-stat">
          <div className="num">{b}</div>
          <div className="lbl">Контейнеров под&nbsp;управлением</div>
        </div>
        <div className="lp-stat">
          <div className="num">{c.toLocaleString('ru')}</div>
          <div className="lbl">Кладовок в&nbsp;живом учёте</div>
        </div>
        <div className="lp-stat">
          <div className="num">
            {d}
            <em>%</em>
          </div>
          <div className="lbl">Средняя заполняемость&nbsp;сети</div>
        </div>
      </div>
    </section>
  );
}

/* ===== CTA ===== */
function CTA() {
  return (
    <section className="lp-shell">
      <div className="lp-cta">
        <h2>
          Готовы увидеть свою сеть
          <br />
          <em>в одном экране?</em>
        </h2>
        <p className="sub">
          Войдите как администратор или менеджер — система загрузится с тестовыми данными.
        </p>
        <Link className="btn-hero-light" to="/login">
          Войти в систему {I.arrow}
        </Link>
      </div>
    </section>
  );
}

/* ===== FOOTER ===== */
function Footer() {
  return (
    <footer className="lp-shell">
      <div className="lp-foot">
        <div className="row gap-3">
          <div className="lp-brand">
            <div className="mark">S</div>
            <div>Storehaus</div>
          </div>
          <span style={{ marginLeft: 14 }}>© 2026 · CRM для самостоятельных кладовок</span>
        </div>
        <div className="links">
          <a href="#features">Возможности</a>
          <a href="#dash">Дашборд</a>
          <a href="#try">Демо</a>
          <Link to="/login">Войти</Link>
        </div>
      </div>
    </footer>
  );
}

/* ===== Page ===== */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <LiveDash />
      <TryIt />
      <Features />
      <Stats />
      <CTA />
      <Footer />
    </>
  );
}
