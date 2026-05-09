// Inline SVG icon set — minimal, line-based, single weight
const Ic = ({ name, className = "ic", size = 16 }) => {
  const stroke = "currentColor";
  const sw = 1.6;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", className };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    pin:       <><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></>,
    box:       <><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></>,
    grid:      <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    receipt:   <><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></>,
    chart:     <><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-7"/></>,
    user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus:      <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    close:     <><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>,
    chev_r:    <><path d="m9 6 6 6-6 6"/></>,
    chev_l:    <><path d="m15 6-6 6 6 6"/></>,
    chev_d:    <><path d="m6 9 6 6 6-6"/></>,
    bell:      <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.5.7.9 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
    arrow_up:  <><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></>,
    arrow_dn:  <><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></>,
    arrow_r:   <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
    edit:      <><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.4 2.6a2 2 0 1 1 2.8 2.8L12 14.6 8 16l1.4-4z"/></>,
    trash:     <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/></>,
    filter:    <><path d="M3 4h18l-7 9v6l-4 2v-8z"/></>,
    download:  <><path d="M12 3v12"/><path d="m6 9 6 6 6-6"/><path d="M5 21h14"/></>,
    sort:      <><path d="M3 6h18"/><path d="M6 12h12"/><path d="M9 18h6"/></>,
    calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/></>,
    money:     <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01"/><path d="M18 12h.01"/></>,
    clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check:     <><path d="m5 12 5 5 9-12"/></>,
    sparkle:   <><path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/></>,
    layers:    <><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/></>,
    eye:       <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    eye_off:   <><path d="M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4.3"/><path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7c1.7 0 3.3-.5 4.7-1.2"/><path d="M3 3l18 18"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    info:      <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v5h1"/></>,
    pen:       <><path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/></>,
    refresh:   <><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>,
    dot:       <><circle cx="12" cy="12" r="2.5" fill="currentColor"/></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
};

window.Ic = Ic;
