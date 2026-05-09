// Main app: state, routing, role+theme tweaks
const { useState: uS, useEffect: uE } = React;

function App() {
  const [user, setUser] = uS(null);
  const [route, setRoute] = uS({ page: "dashboard" });
  const [createRent, setCreateRent] = uS({ open: false, unitId: null });

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "role": "admin",
    "theme": "light",
    "density": "comfortable"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Apply theme to <html>
  uE(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
  }, [tweaks.theme]);

  // If role tweak changes, switch user
  uE(() => {
    if (!user) return;
    if (tweaks.role === "admin" && user.role !== "admin") setUser(window.DATA.USERS.find(u => u.role === "admin"));
    if (tweaks.role === "manager" && user.role !== "manager") setUser(window.DATA.USERS.find(u => u.role === "manager"));
  }, [tweaks.role, user]);

  // Auto-login as admin (skip the login screen by default for demo). Set user to null to require login.
  uE(() => {
    if (!user) setUser(window.DATA.USERS.find(u => u.role === tweaks.role) || window.DATA.USERS[0]);
  }, []);

  function handleLogin(u) {
    setUser(u);
    setTweak("role", u.role);
  }
  function handleLogout() {
    setUser(null);
  }

  function openCreateRent(unitId = null) {
    setCreateRent({ open: true, unitId });
  }

  if (!user) return (
    <>
      <window.Login onLogin={handleLogin}/>
      <Tweaks tweaks={tweaks} setTweak={setTweak} canSwitchRole={false}/>
    </>
  );

  const role = user.role;
  const page = route.page;

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} role={role} user={user} onLogout={handleLogout}/>
      <main className="main">
        {page === "dashboard"   && <Dashboard user={user} role={role} setRoute={setRoute}/>}
        {page === "locations"   && <LocationsScreen role={role} setRoute={setRoute} route={route}/>}
        {page === "containers"  && <ContainersScreen role={role} setRoute={setRoute} route={route}/>}
        {page === "units"       && <UnitsScreen role={role} setRoute={setRoute} route={route} openCreateRent={openCreateRent}/>}
        {page === "rents"       && <RentsScreen role={role} setRoute={setRoute} route={route} openCreateRent={openCreateRent}/>}
        {page === "analytics"   && <AnalyticsScreen/>}
        {page === "users"       && role === "admin" && <UsersScreen user={user} role={role}/>}
        {page === "profile"     && <ProfileScreen user={user} onLogout={handleLogout}/>}
      </main>

      <CreateRentModal open={createRent.open} onClose={() => setCreateRent({open:false, unitId:null})} presetUnitId={createRent.unitId}/>

      <Tweaks tweaks={tweaks} setTweak={setTweak} canSwitchRole={true}/>
    </div>
  );
}

const { TweaksPanel, TweakSection, TweakRadio, TweakSelect } = window;

function Tweaks({ tweaks, setTweak, canSwitchRole }) {
  return (
    <TweaksPanel title="Tweaks">
      {canSwitchRole && (
        <TweakSection label="Роль">
          <TweakRadio
            label="Доступ"
            value={tweaks.role}
            onChange={v => setTweak("role", v)}
            options={[
              { value: "admin", label: "Админ" },
              { value: "manager", label: "Менеджер" },
            ]}
          />
        </TweakSection>
      )}
      <TweakSection label="Внешний вид">
        <TweakRadio
          label="Тема"
          value={tweaks.theme}
          onChange={v => setTweak("theme", v)}
          options={[
            { value: "light", label: "Светлая" },
            { value: "dark", label: "Тёмная" },
          ]}
        />
        <TweakSelect
          label="Плотность"
          value={tweaks.density}
          onChange={v => setTweak("density", v)}
          options={[
            { value: "compact", label: "Компактная" },
            { value: "comfortable", label: "Комфортная" },
            { value: "spacious", label: "Просторная" },
          ]}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
