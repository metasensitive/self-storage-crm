import { useState } from 'react';
import { useTweaks } from './hooks/useTweaks';
import { Avatar, Button, Drawer, DrawerBody, DrawerFoot, DrawerHead, Empty, Field, IconButton, Input, Modal, Tabs } from './components/ui';
import { AreaChart, Donut, KPI, SegmentBar } from './components/charts';
import { StatusBadge } from './components/StatusBadge';
import { Ic } from './components/Ic';
import { fmtMoney } from './lib/format';

const REVENUE_DEMO = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2026, 3, i + 1).toISOString(),
  value: 80_000 + Math.round(Math.sin(i / 3) * 30_000) + i * 1500,
}));

export default function App() {
  const { tweaks, setTweak } = useTweaks();
  const [tab, setTab] = useState<'all' | 'active' | 'finished'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px 80px' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="brand">
            <div className="brand-mark">S</div>
            <div className="col">
              <div className="brand-name">Storehaus</div>
              <div className="brand-sub">Component preview</div>
            </div>
          </div>
          <div className="row gap-2">
            <Button
              size="sm"
              icon={tweaks.theme === 'light' ? 'sparkle' : 'eye'}
              onClick={() => setTweak('theme', tweaks.theme === 'light' ? 'dark' : 'light')}
            >
              {tweaks.theme === 'light' ? 'Тёмная' : 'Светлая'}
            </Button>
          </div>
        </div>

        <h1 className="h-display mt-6">
          UI-примитивы <em style={{ fontStyle: 'italic' }}>готовы.</em>
        </h1>
        <p className="muted mt-2 t-body">
          Иконки, кнопки, поля, бейджи статусов, KPI-карточки, чарты, drawer и modal — портированы из
          прототипа Claude Design.
        </p>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 32 }}>
          <KPI label="Заполняемость" value="78" unit="%" sub="125 из 160 занято" delta="+2.4 п.п." deltaDir="up" />
          <KPI label="Доход (месяц)" value="1.2 млн" unit="₽" sub="к 8 мая" delta="+5.2%" deltaDir="up" />
          <KPI label="Активные аренды" value={94} sub="12 в резерве" delta="+12 за неделю" deltaDir="up" />
          <KPI label="Свободно" value={35} sub="3 заблокировано" delta="−8 за неделю" deltaDir="down" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Доход</span>
                <span className="h-2 mt-1">Последние 30 дней</span>
              </div>
              <Tabs
                tabs={[
                  { id: 'all', label: 'Все' },
                  { id: 'active', label: 'Активные', count: 12 },
                  { id: 'finished', label: 'Завершённые' },
                ]}
                value={tab}
                onChange={setTab}
              />
            </div>
            <div className="card-body">
              <AreaChart data={REVENUE_DEMO} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">Распределение</span>
                <span className="h-2 mt-1">Статусы</span>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="donut-wrap">
                <Donut
                  size={170}
                  thickness={18}
                  segs={[
                    { value: 78, color: 'var(--st-rented)' },
                    { value: 12, color: 'var(--st-reserved)' },
                    { value: 35, color: 'var(--st-free)' },
                    { value: 3, color: 'var(--st-blocked)' },
                  ]}
                />
                <div className="donut-center">
                  <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>78<span style={{ fontSize: 14, color: 'var(--ink-3)' }}>%</span></div>
                  <div className="t-small">занято</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges + segment bar */}
        <div className="card mt-4">
          <div className="card-head">
            <div className="col">
              <span className="t-micro">Бейджи</span>
              <span className="h-2 mt-1">Статусы и роли</span>
            </div>
          </div>
          <div className="card-body col gap-3">
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <StatusBadge kind="unit" status="free" />
              <StatusBadge kind="unit" status="reserved" />
              <StatusBadge kind="unit" status="rented" />
              <StatusBadge kind="unit" status="blocked" />
              <StatusBadge kind="container" status="active" />
              <StatusBadge kind="container" status="maintenance" />
              <StatusBadge kind="rent" status="active" />
              <StatusBadge kind="rent" status="finished" />
              <StatusBadge kind="rent" status="cancelled" />
              <StatusBadge kind="role" status="admin" />
              <StatusBadge kind="role" status="manager" />
            </div>
            <div className="row gap-3">
              <SegmentBar free={35} rented={78} reserved={12} blocked={3} />
              <span className="t-small mono">78%</span>
            </div>
          </div>
        </div>

        {/* Buttons + form fields */}
        <div className="card mt-4">
          <div className="card-head">
            <div className="col">
              <span className="t-micro">Формы</span>
              <span className="h-2 mt-1">Кнопки и поля</span>
            </div>
          </div>
          <div className="card-body col gap-4">
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <Button>Default</Button>
              <Button variant="primary" icon="plus">Создать</Button>
              <Button variant="ghost" icon="filter">Фильтр</Button>
              <Button variant="danger" icon="trash">Удалить</Button>
              <Button size="sm">Маленькая</Button>
              <Button size="lg" variant="primary">Большая</Button>
              <IconButton icon="bell" label="Уведомления" />
              <IconButton icon="settings" label="Настройки" />
            </div>
            <div className="row gap-3" style={{ alignItems: 'flex-end' }}>
              <Field label="Email">
                <Input type="email" placeholder="you@company.com" />
              </Field>
              <Field label="Пароль" hint="Минимум 8 символов">
                <Input type="password" placeholder="••••••••" />
              </Field>
              <Field label="С ошибкой" error="Неверный формат">
                <Input defaultValue="bad value" />
              </Field>
            </div>
          </div>
        </div>

        {/* Avatars + counters */}
        <div className="card mt-4">
          <div className="card-head">
            <div className="col">
              <span className="t-micro">Аватары и числа</span>
              <span className="h-2 mt-1">Display</span>
            </div>
          </div>
          <div className="card-body row gap-4" style={{ alignItems: 'center' }}>
            <Avatar name="Иван Петров" />
            <Avatar name="Мария Соколова" size="lg" />
            <Avatar name="Андрей Волков" size="xl" />
            <span className="serif" style={{ fontSize: 38 }}>{fmtMoney(1_240_000, { compact: true })}</span>
            <span className="mono tnum t-body">1 240 000.00</span>
          </div>
        </div>

        {/* Drawer + Modal triggers */}
        <div className="row gap-2 mt-6">
          <Button icon="layers" onClick={() => setDrawerOpen(true)}>Drawer</Button>
          <Button icon="info" onClick={() => setModalOpen(true)}>Modal</Button>
        </div>

        {/* Empty state */}
        <div className="mt-6">
          <Empty
            title="Здесь пока ничего нет"
            hint="Создайте первую запись, чтобы увидеть данные."
            action={<Button variant="primary" icon="plus">Создать</Button>}
          />
        </div>

        <div className="t-small mt-8 mono">
          © 2026 Storehaus · UI <span className="tnum">0.4.0</span>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Подтверждение" width={480}>
        <p className="t-body">Удалить выбранную запись? Это действие нельзя отменить.</p>
        <div className="row gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>
          <Button variant="danger" icon="trash" onClick={() => setModalOpen(false)}>Удалить</Button>
        </div>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <DrawerHead>
          <div className="col gap-2 grow">
            <span className="t-micro">Демо</span>
            <span className="h-display-sm">Drawer</span>
            <span className="muted t-small">Выезжает справа, закрывается по Escape или клику вне.</span>
          </div>
          <IconButton icon="close" label="Закрыть" onClick={() => setDrawerOpen(false)} />
        </DrawerHead>
        <DrawerBody>
          <div className="row gap-2 mb-4">
            <Ic name="info" />
            <span className="t-body">Содержимое можно прокручивать вертикально.</span>
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="card mt-2">
              <div className="card-body">
                <div className="h-2">Карточка {i + 1}</div>
                <div className="t-small mt-1">Любое содержимое в drawer-body.</div>
              </div>
            </div>
          ))}
        </DrawerBody>
        <DrawerFoot>
          <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Закрыть</Button>
          <Button variant="primary">Подтвердить</Button>
        </DrawerFoot>
      </Drawer>
    </div>
  );
}
