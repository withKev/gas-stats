(function(){
  const STORE_KEY = 'fuelTrackerData_v1';
  const SETTINGS_KEY = 'fuelTrackerSettings_v1';

  // ---------- Icon system (monoline, currentColor) ----------
  function icon(name, size=20, sw=2){
    const a = `xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" class="icon"`;
    const paths = {
      fuel: `<path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M3 21h12"/><path d="M14 10h1.5a2 2 0 0 1 2 2v3.2a1.3 1.3 0 0 0 2.6 0V9.8a1.3 1.3 0 0 0-.38-.92L17.5 6.7"/><path d="M6 8h6"/>`,
      grid: `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
      list: `<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>`,
      chart: `<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>`,
      sliders: `<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><circle cx="4" cy="13" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/>`,
      plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
      pin: `<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>`,
      calendar: `<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>`,
      card: `<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>`,
      drop: `<path d="M12 3s6.5 6.6 6.5 11.2A6.5 6.5 0 0 1 5.5 14.2C5.5 9.6 12 3 12 3z"/>`,
      gauge: `<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 12.5 15 9"/><circle cx="12" cy="12.5" r="1.1" fill="currentColor" stroke="none"/>`,
      chevron: `<path d="M9 6l6 6-6 6"/>`,
      up: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 11l3-3 3 3"/><path d="M12 8v7"/>`,
      down: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 12l3 3 3-3"/><path d="M12 15V8"/>`,
      trash: `<path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>`,
      leaf: `<path d="M5 20c9 0 14-5 14-14 0 0-9-1-13 3S4 20 5 20z"/><path d="M5 20c0-4 2-8 6-10"/>`,
    };
    return `<svg ${a}>${paths[name] || ''}</svg>`;
  }

  const GRADE_META = {
    'Regular':   {color:'var(--orange)', icon:'fuel'},
    'Mid-Grade': {color:'var(--blue)',   icon:'fuel'},
    'Premium':   {color:'var(--purple)', icon:'fuel'},
    'Diesel':    {color:'var(--brown)',  icon:'fuel'},
    'E85':       {color:'var(--green)',  icon:'leaf'},
  };

  let data = load(STORE_KEY, []);
  let settings = load(SETTINGS_KEY, { currency:'USD', distanceUnit:'km', theme:'auto' });

  // ---------- One-time migrations ----------
  // Requested by the user: their older entries used "Costco Gas"; the station
  // they actually want listed is "Costco Gasoline". Guarded by a flag so it
  // runs exactly once and never fights a later manual rename. Exact match only
  // -- we don't want to touch a station that merely contains the string.
  (function migrateStationNames(){
    const FLAG = 'fuelTrackerMigration_costcoRename';
    if(localStorage.getItem(FLAG)) return;
    let changed = 0;
    for(const r of data){
      if((r.station || '').trim() === 'Costco Gas'){ r.station = 'Costco Gasoline'; changed++; }
    }
    if(changed) localStorage.setItem(STORE_KEY, JSON.stringify(data));
    localStorage.setItem(FLAG, '1');
  })();

  function load(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function uid(){ return 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

  function fmtMoney(n){
    try{ return new Intl.NumberFormat(navigator.language, {style:'currency', currency:settings.currency || 'USD'}).format(n||0); }
    catch(e){ return (settings.currency||'USD') + ' ' + (n||0).toFixed(2); }
  }
  function fmtMonthHeader(d){ return d.toLocaleDateString(undefined, {month:'long', year:'numeric'}); }
  function monthKey(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function sortedDesc(){ return [...data].sort((a,b)=> new Date(b.date) - new Date(a.date)); }

  function computeEconomy(){
    // Walk fill-ups in odometer order. Consumption between two full tanks =
    // all fuel added since the last full tank (including partials and the
    // current full tank) divided by the distance between them.
    const all = [...data]
      .filter(d=> d.odometer != null && d.odometer !== '' && !isNaN(parseFloat(d.odometer)))
      .sort((a,b)=> parseFloat(a.odometer) - parseFloat(b.odometer));
    let totalDist = 0, totalLiters = 0, segLiters = 0, lastFullOdo = null;
    for(const rec of all){
      const odo = parseFloat(rec.odometer);
      if(lastFullOdo !== null) segLiters += rec.liters || 0;
      if(rec.fullTank){
        if(lastFullOdo !== null && odo > lastFullOdo){
          totalDist += (odo - lastFullOdo);
          totalLiters += segLiters;
        }
        lastFullOdo = odo;
        segLiters = 0;
      }
    }
    return totalDist > 0 ? (totalLiters / totalDist) * 100 : null;
  }

  // ---------- Icon injection for static chrome ----------
  document.getElementById('fab').innerHTML = icon('plus', 28, 2.4);
  document.getElementById('locate-btn').innerHTML = icon('pin', 19);

  const TAB_DEFS = [
    { id:'dashboard', label:'Dashboard', icon:'grid' },
    { id:'stats',     label:'Stats',     icon:'chart' },
    { id:'settings',  label:'Settings',  icon:'sliders' },
  ];
  document.querySelectorAll('.tab-btn').forEach((btn, i)=>{
    const def = TAB_DEFS[i];
    btn.innerHTML = icon(def.icon, 23, 2) + `<span>${def.label}</span>`;
  });

  // ---------- Tabs ----------
  let activeTab = 'dashboard';
  const navbarTitle = document.getElementById('navbar-title');
  const main = document.getElementById('main');
  const navbar = document.getElementById('navbar');

  document.querySelectorAll('.tab-btn').forEach((btn, i)=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = TAB_DEFS[i].id;
      navbarTitle.textContent = TAB_DEFS[i].label;
      main.scrollTop = 0;
      navbar.classList.remove('scrolled');
      if(activeTab !== 'stats') destroyCharts();
      render();
    });
  });
  main.addEventListener('scroll', ()=>{
    navbar.classList.toggle('scrolled', main.scrollTop > 8);
  });

  // ---------- Render ----------
  function render(){
    if(activeTab === 'stats') renderStats();
    else if(activeTab === 'settings') renderSettings();
    else renderDashboard();
    updateFabVisibility();
  }

  function updateFabVisibility(){
    const fab = document.getElementById('fab');
    if(!fab) return;
    // Hide the add button on the Settings tab; show it on content tabs.
    fab.classList.toggle('hidden', activeTab === 'settings');
    // Tab switches reset main.scrollTop to 0, so clear any scroll-away state.
    resetFabScroll();
  }

  function badge(color, iconName, size=32, iconSize=17){
    return `<div class="badge" style="width:${size}px;height:${size}px;background:${color};">${icon(iconName, iconSize, 2)}</div>`;
  }

  function renderDashboard(){
    const all = sortedDesc();
    let html = `<div class="large-title">Dashboard</div>`;

    if(all.length === 0){
      html += `
        <div class="hero">
          <div class="hero-eyebrow">Get started</div>
          <div class="hero-sub" style="font-size:17px; font-weight:600; margin-top:4px;">Log your first fill-up</div>
          <div class="hero-sub" style="margin-top:4px;">Track cost, location, and fuel economy over time.</div>
          <button class="hero-empty-btn" id="hero-add-btn">${icon('plus',16,2.4)}<span>Add Fill-Up</span></button>
        </div>`;
      main.innerHTML = html;
      document.getElementById('hero-add-btn').addEventListener('click', openAdd);
      return;
    }

    const last = all[0];
    const now = new Date();
    const monthTotal = data.filter(d=>{
      const dt = new Date(d.date);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).reduce((s,d)=> s + (d.totalCost||0), 0);
    const ytdTotal = data.filter(d=> new Date(d.date).getFullYear() === now.getFullYear())
      .reduce((s,d)=> s + (d.totalCost||0), 0);
    const avgPrice = data.reduce((s,d)=> s + (d.pricePerLiter||0), 0) / data.length;
    const economy = computeEconomy();
    const distUnit = settings.distanceUnit === 'mi' ? 'mi' : 'km';

    html += `
      <div class="hero">
        <div class="hero-eyebrow">Last Fill-Up</div>
        <div class="hero-amount">${fmtMoney(last.totalCost)}</div>
        <div class="hero-sub">${escapeHtml(last.station || 'Fill-Up')}${last.location ? ' · ' + escapeHtml(last.location) : ''}</div>
        <div class="hero-meta">
          <div>Date<strong>${new Date(last.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</strong></div>
          <div>Liters<strong>${(last.liters||0).toFixed(1)} L</strong></div>
          <div>Price/L<strong>${fmtMoney(last.pricePerLiter)}</strong></div>
        </div>
      </div>

      <div class="section-header">This Month vs Year</div>
      <div class="stat-grid">
        <div class="stat-card">${badge('color-mix(in srgb, var(--orange) 16%, transparent)','calendar',32,16)}<div class="stat-value" style="color:var(--orange);">${fmtMoney(monthTotal)}</div><div class="stat-label">This Month</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--blue) 16%, transparent)','calendar',32,16)}<div class="stat-value" style="color:var(--blue);">${fmtMoney(ytdTotal)}</div><div class="stat-label">Year to Date</div></div>
      </div>
      <div class="stat-grid" style="margin-top:10px;">
        <div class="stat-card">${badge('color-mix(in srgb, var(--purple) 16%, transparent)','drop',32,16)}<div class="stat-value" style="color:var(--purple);">${fmtMoney(avgPrice)}</div><div class="stat-label">Avg Price / L</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--green) 16%, transparent)','gauge',32,16)}<div class="stat-value" style="color:var(--green);">${economy != null ? economy.toFixed(1)+' L/100'+distUnit : '—'}</div><div class="stat-label">Avg Consumption</div></div>
      </div>
    `;

    // Full history, grouped by month, flowing down the dashboard.
    const groups = {};
    all.forEach(item=>{
      const d = new Date(item.date);
      const key = monthKey(d);
      if(!groups[key]) groups[key] = { label: fmtMonthHeader(d), items: [] };
      groups[key].items.push(item);
    });
    Object.keys(groups).sort().reverse().forEach(key=>{
      const g = groups[key];
      html += `<div class="section-header">${g.label}</div><div class="list-card">`;
      g.items.forEach(item=>{
        const meta = GRADE_META[item.grade] || GRADE_META['Regular'];
        const sub = item.location || new Date(item.date).toLocaleDateString();
        html += `
          <div class="list-row tappable" data-id="${item.id}">
            <div class="badge round" style="background:color-mix(in srgb, ${meta.color} 16%, transparent); color:${meta.color};">${icon(meta.icon,16,2)}</div>
            <div class="row-main">
              <div class="row-title">${escapeHtml(item.station || 'Fill-Up')}</div>
              <div class="row-sub">${escapeHtml(sub)}</div>
            </div>
            <div class="row-right">
              <div>
                <div class="row-amount">${fmtMoney(item.totalCost)}</div>
                <div class="row-liters">${(item.liters||0).toFixed(1)} L</div>
              </div>
              <span class="chevron">${icon('chevron',16,2.2)}</span>
            </div>
          </div>`;
      });
      html += `</div>`;
    });

    main.innerHTML = html;

    main.querySelectorAll('.list-row[data-id]').forEach(row=>{
      row.addEventListener('click', ()=> openEdit(row.dataset.id));
    });
  }

  // Interactive charts via locally-bundled Chart.js (offline-safe).
  let monthlyChart = null, trendChart = null;

  // Effective dark state, honoring the manual Appearance override.
  function isDarkMode(){
    const t = settings.theme || 'auto';
    if(t === 'dark') return true;
    if(t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function chartTheme(){
    const dark = isDarkMode();
    const styles = getComputedStyle(document.documentElement);
    return {
      grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(60,60,67,0.10)',
      tick: dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)',
      orange: (styles.getPropertyValue('--orange') || '#FF9500').trim(),
      blue: (styles.getPropertyValue('--blue') || '#007AFF').trim(),
      tooltipBg: dark ? 'rgba(44,44,52,0.96)' : 'rgba(255,255,255,0.96)',
      tooltipText: dark ? '#FFFFFF' : '#000000',
      tooltipBorder: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    };
  }

  // Apply the theme attribute + browser chrome color, then refresh visuals.
  function applyTheme(){
    document.documentElement.setAttribute('data-theme', settings.theme || 'auto');
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', isDarkMode() ? '#08080C' : '#EDECF3');
  }

  function destroyCharts(){
    if(monthlyChart){ monthlyChart.destroy(); monthlyChart = null; }
    if(trendChart){ trendChart.destroy(); trendChart = null; }
  }

  function buildCharts(monthEntries, trendEntries){
    if(typeof Chart === 'undefined') return;   // safety net; bundled so shouldn't happen
    const t = chartTheme();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tooltipStyle = {
      backgroundColor: t.tooltipBg,
      titleColor: t.tooltipText,
      bodyColor: t.tooltipText,
      borderColor: t.tooltipBorder,
      borderWidth: 1,
      cornerRadius: 10,
      padding: 10,
      displayColors: false,
      titleFont: { weight: '600', size: 13 },
      bodyFont: { size: 13 },
    };

    const monthlyCanvas = document.getElementById('monthlyCanvas');
    if(monthlyCanvas && monthEntries.length > 1){
      monthlyChart = new Chart(monthlyCanvas, {
        type: 'bar',
        data: {
          labels: monthEntries.map(m=>m.label),
          datasets: [{ data: monthEntries.map(m=>m.total), backgroundColor: t.orange, borderRadius: 6, maxBarThickness: 30, hoverBackgroundColor: t.orange }]
        },
        options: {
          animation: reduceMotion ? false : { duration: 500 },
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { ...tooltipStyle, callbacks: {
              title: items => items[0].label,
              label: item => fmtMoney(item.raw)
            } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: t.grid }, ticks: { color: t.tick, callback: v => fmtMoney(v) } },
            x: { grid: { display: false }, ticks: { color: t.tick } }
          }
        }
      });
    }

    const trendCanvas = document.getElementById('trendCanvas');
    if(trendCanvas && trendEntries.length > 1){
      trendChart = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: trendEntries.map(d=> new Date(d.date).toLocaleDateString(undefined,{month:'short',day:'numeric'})),
          datasets: [{
            data: trendEntries.map(d=>d.pricePerLiter),
            borderColor: t.blue, backgroundColor: t.blue,
            tension: 0.35, borderWidth: 2, pointRadius: 2.5, pointHoverRadius: 5,
            pointBackgroundColor: t.blue
          }]
        },
        options: {
          animation: reduceMotion ? false : { duration: 500 },
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: { ...tooltipStyle, callbacks: {
              title: items => items[0].label,
              label: item => fmtMoney(item.raw) + ' / L'
            } }
          },
          scales: {
            y: { grid: { color: t.grid }, ticks: { color: t.tick, callback: v => fmtMoney(v) } },
            x: { grid: { display: false }, ticks: { color: t.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } }
          }
        }
      });
    }
  }

  function renderStats(){
    let html = `<div class="large-title">Stats</div>`;
    if(data.length === 0){
      html += `<div class="empty">${badge('var(--blue)','chart',56,26)}<div class="title">No Data Yet</div><div class="body">Log some fill-ups to see your stats.</div></div>`;
      main.innerHTML = html;
      return;
    }
    const now = new Date();
    const ytdTotal = data.filter(d=> new Date(d.date).getFullYear() === now.getFullYear())
      .reduce((s,d)=> s + (d.totalCost||0), 0);
    const monthTotal = data.filter(d=>{
      const dt = new Date(d.date);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).reduce((s,d)=> s + (d.totalCost||0), 0);
    const avgFillUp = data.reduce((s,d)=> s + (d.totalCost||0), 0) / data.length;
    const avgPrice = data.reduce((s,d)=> s + (d.pricePerLiter||0), 0) / data.length;
    const totalLiters = data.reduce((s,d)=> s + (d.liters||0), 0);
    const economy = computeEconomy();
    const distUnit = settings.distanceUnit === 'mi' ? 'mi' : 'km';

    const byMonth = {};
    data.forEach(d=>{
      const dt = new Date(d.date);
      const key = monthKey(dt);
      if(!byMonth[key]) byMonth[key] = {label: dt.toLocaleDateString(undefined,{month:'short'}), total:0, sortKey:key};
      byMonth[key].total += (d.totalCost||0);
    });
    const monthEntries = Object.values(byMonth).sort((a,b)=> a.sortKey.localeCompare(b.sortKey)).slice(-12);
    const trendEntries = [...data].sort((a,b)=> new Date(a.date)-new Date(b.date));

    html += `
      <div class="stat-grid">
        <div class="stat-card">${badge('color-mix(in srgb, var(--orange) 16%, transparent)','calendar',32,16)}<div class="stat-value">${fmtMoney(monthTotal)}</div><div class="stat-label">This Month</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--blue) 16%, transparent)','calendar',32,16)}<div class="stat-value">${fmtMoney(ytdTotal)}</div><div class="stat-label">Year to Date</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--green) 16%, transparent)','card',32,16)}<div class="stat-value">${fmtMoney(avgFillUp)}</div><div class="stat-label">Avg / Fill-Up</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--purple) 16%, transparent)','drop',32,16)}<div class="stat-value">${fmtMoney(avgPrice)}</div><div class="stat-label">Avg Price / L</div></div>
      </div>
      ${economy != null ? `<div class="stat-grid" style="margin-top:10px;"><div class="stat-card" style="grid-column:1/3;">${badge('color-mix(in srgb, var(--red) 16%, transparent)','gauge',32,16)}<div class="stat-value">${economy.toFixed(1)} L/100${distUnit}</div><div class="stat-label">Avg Consumption</div></div></div>` : ''}

      ${monthEntries.length>1 ? `<div class="chart-card" style="margin-top:16px;"><h3>Monthly Spend</h3><div class="chart-wrap"><canvas id="monthlyCanvas"></canvas></div></div>` : ''}
      ${trendEntries.length>1 ? `<div class="chart-card"><h3>Price per Liter Trend</h3><div class="chart-wrap"><canvas id="trendCanvas"></canvas></div></div>` : ''}

      <div class="list-card" style="padding:0 14px;">
        <div class="summary-row"><span>Total Fill-Ups</span><span>${data.length}</span></div>
        <div class="summary-row"><span>Total Liters</span><span>${totalLiters.toFixed(1)} L</span></div>
      </div>
    `;
    main.innerHTML = html;
    destroyCharts();
    buildCharts(monthEntries, trendEntries);
  }

  // ---------- Edit Sheet ----------
  const backdrop = document.getElementById('backdrop');
  const editSheet = document.getElementById('edit-sheet');
  let editingId = null;

  function openSheet(sheet){ backdrop.classList.add('open'); sheet.classList.add('open'); }
  function closeSheets(){
    backdrop.classList.remove('open');
    editSheet.classList.remove('open');
  }
  backdrop.addEventListener('click', closeSheets);

  // The date field is date-only. `new Date('2026-07-09')` parses as UTC
  // midnight, which in a negative-offset timezone renders as the day BEFORE.
  // So we always format from local getters and re-parse into local noon.
  function toLocalInputValue(d){
    const pad = n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }

  // 'YYYY-MM-DD' -> Date at LOCAL noon. Noon (not midnight) keeps the calendar
  // day stable across DST shifts in both directions.
  // ---------- Station suggestions ----------
  // Seeded with the stations the user visits most; everything else is learned
  // from their own history, so typing a new name once makes it a suggestion
  // from then on. Nothing extra is persisted -- the list is derived from `data`.
  const DEFAULT_STATIONS = ['Hillview Town Pantry', 'Costco Gasoline'];

  function knownStations(){
    const seen = new Map(); // lowercased name -> {name, count, last}
    for(const r of data){
      const name = (r.station || '').trim();
      if(!name) continue;
      const key = name.toLowerCase();
      const t = new Date(r.date).getTime() || 0;
      const e = seen.get(key);
      if(e){ e.count++; if(t > e.last){ e.last = t; e.name = name; } }
      else seen.set(key, { name, count:1, last:t });
    }
    for(const name of DEFAULT_STATIONS){
      const key = name.toLowerCase();
      if(!seen.has(key)) seen.set(key, { name, count:0, last:0 });
    }
    // Most-used first, then most-recent. Stable and predictable.
    return [...seen.values()]
      .sort((a,b)=> b.count - a.count || b.last - a.last)
      .map(e=>e.name);
  }

  function renderStationSuggest(){
    const row = document.getElementById('station-suggest');
    const input = document.getElementById('f-station');
    if(!row || !input) return;
    const typed = input.value.trim().toLowerCase();
    const matches = knownStations()
      .filter(n=> !typed || (n.toLowerCase().includes(typed) && n.toLowerCase() !== typed))
      .slice(0, 6);

    if(!matches.length){ row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = matches
      .map(n=>`<button type="button" class="suggest-chip">${escapeHtml(n)}</button>`).join('');
    row.querySelectorAll('.suggest-chip').forEach((btn, i)=>{
      btn.addEventListener('click', ()=>{
        input.value = matches[i];
        renderStationSuggest();
      });
    });
  }

  function fromLocalInputValue(s){
    const [y, m, d] = String(s).split('-').map(Number);
    if(!y || !m || !d) return new Date();
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  function openAdd(){
    editingId = null;
    document.getElementById('sheet-title').textContent = 'New Fill-Up';
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('f-date').value = toLocalInputValue(new Date());
    document.getElementById('f-station').value = '';
    document.getElementById('f-location').value = '';
    document.getElementById('f-grade').value = 'Regular';
    document.getElementById('f-full').checked = true;
    document.getElementById('f-liters').value = '';
    document.getElementById('f-price').value = '';
    document.getElementById('f-total').value = '';
    document.getElementById('f-odo').value = '';
    document.getElementById('f-notes').value = '';
    renderStationSuggest();
    validateForm();
    openSheet(editSheet);
  }

  function openEdit(id){
    const item = data.find(d=>d.id===id);
    if(!item) return;
    editingId = id;
    document.getElementById('sheet-title').textContent = 'Edit Fill-Up';
    document.getElementById('delete-btn').style.display = 'flex';
    document.getElementById('f-date').value = toLocalInputValue(new Date(item.date));
    document.getElementById('f-station').value = item.station || '';
    document.getElementById('f-location').value = item.location || '';
    document.getElementById('f-grade').value = item.grade || 'Regular';
    document.getElementById('f-full').checked = !!item.fullTank;
    document.getElementById('f-liters').value = item.liters || '';
    document.getElementById('f-price').value = item.pricePerLiter || '';
    document.getElementById('f-total').value = item.totalCost || '';
    document.getElementById('f-odo').value = item.odometer ?? '';
    document.getElementById('f-notes').value = item.notes || '';
    renderStationSuggest();
    validateForm();
    openSheet(editSheet);
  }

  document.getElementById('fab').addEventListener('click', openAdd);
  document.getElementById('cancel-btn').addEventListener('click', closeSheets);

  // Live-filter the station chips as the user types.
  document.getElementById('f-station').addEventListener('input', renderStationSuggest);

  // Tuck the FAB away while scrolling down so it stops covering the last row,
  // and bring it back on any upward scroll. rAF-throttled: the scroll event
  // fires far more often than the screen refreshes.
  let resetFabScroll = ()=>{};
  (function fabScrollBehavior(){
    const fab = document.getElementById('fab');
    const scroller = document.getElementById('main');
    if(!fab || !scroller) return;
    const THRESHOLD = 6;   // ignore sub-pixel jitter and rubber-banding
    let lastY = 0, ticking = false;

    function update(){
      const y = scroller.scrollTop;
      if(y <= 8){
        fab.classList.remove('scrolled-away');       // always visible at the top
      } else if(y > lastY + THRESHOLD){
        fab.classList.add('scrolled-away');          // scrolling down
      } else if(y < lastY - THRESHOLD){
        fab.classList.remove('scrolled-away');       // scrolling up
      }
      lastY = y;
      ticking = false;
    }

    scroller.addEventListener('scroll', ()=>{
      if(!ticking){ ticking = true; requestAnimationFrame(update); }
    }, { passive:true });

    // A tab switch re-renders `main` and resets its scroll to 0; don't leave
    // the button stranded off-screen.
    resetFabScroll = ()=>{ lastY = 0; fab.classList.remove('scrolled-away'); };
  })();

  const litersEl = document.getElementById('f-liters');
  const priceEl = document.getElementById('f-price');
  const totalEl = document.getElementById('f-total');
  function recalcTotal(){
    const l = parseFloat(litersEl.value), p = parseFloat(priceEl.value);
    if(!isNaN(l) && !isNaN(p)) totalEl.value = (l*p).toFixed(2);
    validateForm();
  }
  litersEl.addEventListener('input', recalcTotal);
  priceEl.addEventListener('input', recalcTotal);
  totalEl.addEventListener('input', validateForm);
  document.getElementById('f-station').addEventListener('input', validateForm);

  function validateForm(){
    const station = document.getElementById('f-station').value.trim();
    const liters = parseFloat(litersEl.value);
    const total = parseFloat(totalEl.value);
    document.getElementById('save-btn').disabled = !(station && !isNaN(liters) && !isNaN(total));
  }

  document.getElementById('save-btn').addEventListener('click', ()=>{
    const liters = parseFloat(litersEl.value) || 0;
    const total = parseFloat(totalEl.value) || 0;
    const price = parseFloat(priceEl.value) || (liters>0 ? total/liters : 0);
    const odoRaw = document.getElementById('f-odo').value;
    const record = {
      id: editingId || uid(),
      date: fromLocalInputValue(document.getElementById('f-date').value).toISOString(),
      station: document.getElementById('f-station').value.trim(),
      location: document.getElementById('f-location').value.trim(),
      grade: document.getElementById('f-grade').value,
      fullTank: document.getElementById('f-full').checked,
      liters, pricePerLiter: price, totalCost: total,
      odometer: odoRaw === '' ? null : parseFloat(odoRaw),
      notes: document.getElementById('f-notes').value.trim(),
    };
    if(editingId){
      const idx = data.findIndex(d=>d.id===editingId);
      data[idx] = record;
    } else {
      data.push(record);
    }
    save();
    closeSheets();
    render();
    showToast('Saved');
  });

  document.getElementById('delete-btn').innerHTML = icon('trash',17,2) + '<span>Delete Fill-Up</span>';
  document.getElementById('delete-btn').addEventListener('click', async ()=>{
    if(!editingId) return;
    const ok = await confirmDialog('This fill-up will be permanently deleted.', {
      title:'Delete Fill-Up', confirmText:'Delete', destructive:true
    });
    if(ok){
      data = data.filter(d=>d.id!==editingId);
      save();
      closeSheets();
      render();
      showToast('Deleted');
    }
  });

  document.getElementById('locate-btn').addEventListener('click', ()=>{
    if(!navigator.geolocation){ showToast('Location not available'); return; }
    navigator.geolocation.getCurrentPosition(async pos=>{
      const {latitude, longitude} = pos.coords;
      try{
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`);
        const j = await res.json();
        const name = j.name || j.address?.road || j.address?.suburb || j.address?.city || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        document.getElementById('f-location').value = name;
      }catch(e){
        document.getElementById('f-location').value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    }, ()=> showToast('Could not get location'));
  });

  // ---------- Settings (rendered as a dedicated tab) ----------
  function renderSettings(){
    const cur = settings.currency || 'USD';
    const dist = settings.distanceUnit || 'km';
    const thm = settings.theme || 'auto';
    const currencyList = [
      ['USD','US Dollar'],['CAD','Canadian Dollar'],['EUR','Euro'],['GBP','British Pound'],
      ['AUD','Australian Dollar'],['NZD','NZ Dollar'],['JPY','Japanese Yen'],['CNY','Chinese Yuan'],
      ['INR','Indian Rupee'],['MXN','Mexican Peso'],['BRL','Brazilian Real'],['CHF','Swiss Franc'],
      ['SEK','Swedish Krona'],['NOK','Norwegian Krone'],['DKK','Danish Krone'],['SGD','Singapore Dollar'],
      ['HKD','Hong Kong Dollar'],['ZAR','South African Rand'],['AED','UAE Dirham'],['KRW','Korean Won'],
    ];
    const currencyOptions = currencyList
      .map(([c,n])=>`<option value="${c}" ${c===cur?'selected':''}>${c} \u2014 ${n}</option>`).join('');

    main.innerHTML = `
      <div class="large-title">Settings</div>
      <div class="section-header">Preferences</div>
      <div class="field-group">
        <div class="field">
          <label>Currency</label>
          <select id="s-currency">${currencyOptions}</select>
        </div>
        <div class="field">
          <label>Distance Unit</label>
          <select id="s-distance">
            <option value="km" ${dist==='km'?'selected':''}>Kilometers</option>
            <option value="mi" ${dist==='mi'?'selected':''}>Miles</option>
          </select>
        </div>
        <div class="field">
          <label>Appearance</label>
          <select id="s-theme">
            <option value="auto" ${thm==='auto'?'selected':''}>Automatic</option>
            <option value="light" ${thm==='light'?'selected':''}>Light</option>
            <option value="dark" ${thm==='dark'?'selected':''}>Dark</option>
          </select>
        </div>
      </div>
      <div class="section-header">Backup</div>
      <div class="field-group">
        <div class="field tappable" style="cursor:pointer;" id="export-row"><label style="width:auto;flex:1;">Export backup (JSON)</label><span style="color:var(--text-tertiary);">${icon('up',20)}</span></div>
        <div class="field tappable" style="cursor:pointer;" id="import-row"><label style="width:auto;flex:1;">Import backup (JSON)</label><span style="color:var(--text-tertiary);">${icon('down',20)}</span></div>
      </div>
      <div class="hint">Your data lives only in this browser on this device. Export regularly and save the file to Files / iCloud Drive as your backup \u2014 there's no automatic iCloud sync available to web apps. This is the only format that can be re-imported.</div>
      <div class="section-header">Spreadsheet Export</div>
      <div class="field-group">
        <div class="field tappable" style="cursor:pointer;" id="export-csv-row"><label style="width:auto;flex:1;">Export spreadsheet (CSV)</label><span style="color:var(--text-tertiary);">${icon('up',20)}</span></div>
        <div class="field tappable" style="cursor:pointer;" id="export-xlsx-row"><label style="width:auto;flex:1;">Export spreadsheet (Excel)</label><span style="color:var(--text-tertiary);">${icon('up',20)}</span></div>
      </div>
      <div class="hint">Read-only, for viewing or archiving in Excel, Numbers, or Google Sheets. Editing and re-importing one of these files is not supported \u2014 use Export backup (JSON) for that.</div>
    `;

    // Apply choices immediately so they always stick.
    document.getElementById('s-currency').addEventListener('change', (e)=>{
      settings.currency = e.target.value || 'USD'; saveSettings(); showToast('Currency updated');
    });
    document.getElementById('s-distance').addEventListener('change', (e)=>{
      settings.distanceUnit = e.target.value || 'km'; saveSettings();
    });
    document.getElementById('s-theme').addEventListener('change', (e)=>{
      settings.theme = e.target.value || 'auto'; saveSettings(); applyTheme();
    });
    document.getElementById('export-row').addEventListener('click', exportBackup);
    document.getElementById('import-row').addEventListener('click', ()=>{
      importFile.value = '';   // reset so re-selecting the same file still fires 'change'
      importFile.click();
    });
    document.getElementById('export-csv-row').addEventListener('click', exportCSV);
    document.getElementById('export-xlsx-row').addEventListener('click', exportXLSX);
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportBackup(){
    const blob = new Blob([JSON.stringify({data, settings}, null, 2)], {type:'application/json'});
    downloadBlob(blob, `fuel-tracker-backup-${new Date().toISOString().slice(0,10)}.json`);
    showToast('Backup exported');
  }

  // ---------- Read-only spreadsheet export (CSV / Excel) ----------
  // These are archive/viewing formats only -- Import still only accepts the
  // JSON backup above, which is the sole lossless, re-importable format.
  function fmtDateForSheet(iso){
    try{ return new Date(iso).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}); }
    catch(e){ return iso || ''; }
  }

  function sheetRows(){
    const cur = settings.currency || 'USD';
    const distUnit = settings.distanceUnit === 'mi' ? 'mi' : 'km';
    const headers = ['Date','Station','Location','Grade','Full Tank','Liters',
      `Price/Liter (${cur})`, `Total Cost (${cur})`, `Odometer (${distUnit})`, 'Notes'];
    const rows = data.slice()
      .sort((a,b)=> new Date(a.date) - new Date(b.date))
      .map(r=>[
        fmtDateForSheet(r.date),
        r.station || '',
        r.location || '',
        r.grade || '',
        r.fullTank ? 'Yes' : 'No',
        Number(r.liters) || 0,
        Number(r.pricePerLiter) || 0,
        Number(r.totalCost) || 0,
        (r.odometer === null || r.odometer === undefined) ? '' : Number(r.odometer),
        r.notes || '',
      ]);
    return {headers, rows};
  }

  function exportCSV(){
    if(!data.length){ showToast('No fill-ups to export'); return; }
    const {headers, rows} = sheetRows();
    const csvEscape = (v)=>{
      const s = String(v);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    };
    const lines = [headers, ...rows.map(r=>r.map((v,i)=> (i===5||i===6||i===7) ? v.toFixed(i===6?3:2) : v))]
      .map(row=>row.map(csvEscape).join(','))
      .join('\r\n');
    // Leading BOM so Excel opens UTF-8 CSVs without mangling accented characters.
    const blob = new Blob(['\uFEFF' + lines], {type:'text/csv;charset=utf-8'});
    downloadBlob(blob, `fuel-tracker-${new Date().toISOString().slice(0,10)}.csv`);
    showToast('Spreadsheet exported (CSV)');
  }

  // ---------- Minimal .xlsx writer (no external library, STORE-only zip) ----------
  // Vendoring a real library (SheetJS) to write one read-only sheet would add
  // 400KB+ to the single-file build. This hand-rolls just enough of the ZIP
  // and OOXML spreadsheet format to produce a valid, Excel-openable file.
  function crc32(bytes){
    if(!crc32.table){
      const t = new Uint32Array(256);
      for(let n=0;n<256;n++){
        let c = n;
        for(let k=0;k<8;k++){ c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
        t[n] = c >>> 0;
      }
      crc32.table = t;
    }
    let crc = 0xFFFFFFFF;
    for(let i=0;i<bytes.length;i++){ crc = crc32.table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8); }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(d){
    const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | ((d.getSeconds() >> 1) & 0x1F);
    const date = (((d.getFullYear() - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0xF) << 5) | (d.getDate() & 0x1F);
    return {time, date};
  }

  function makeZip(files){
    const enc = new TextEncoder();
    const {time, date} = dosDateTime(new Date());
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach(f=>{
      const nameBytes = enc.encode(f.name);
      const dataBytes = enc.encode(f.text);
      const crc = crc32(dataBytes);
      const size = dataBytes.length;

      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, time, true);
      lv.setUint16(12, date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      localParts.push(local, dataBytes);

      const central = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      central.set(nameBytes, 46);
      centralParts.push(central);

      offset += local.length + dataBytes.length;
    });

    const centralStart = offset;
    const centralSize = centralParts.reduce((s,p)=>s+p.length, 0);

    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, end],
      {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }

  function escapeXml(s){
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  }

  function colLetter(i){
    let s = '';
    i++;
    while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }

  function exportXLSX(){
    if(!data.length){ showToast('No fill-ups to export'); return; }
    const {headers, rows} = sheetRows();
    const colWidths = [14, 20, 22, 12, 10, 10, 16, 14, 14, 32];
    // 0-indexed data columns that are numeric: Liters, Price/Liter, Total Cost, Odometer
    const styleForCol = {5:2, 6:3, 7:2, 8:4};

    let rowsXml = `<row r="1" s="1">` + headers.map((h,ci)=>
      `<c r="${colLetter(ci)}1" t="inlineStr" s="1"><is><t xml:space="preserve">${escapeXml(h)}</t></is></c>`
    ).join('') + `</row>`;

    rows.forEach((row,ri)=>{
      const r = ri + 2;
      rowsXml += `<row r="${r}">` + row.map((v,ci)=>{
        const ref = `${colLetter(ci)}${r}`;
        if(styleForCol[ci]){
          if(v === '') return `<c r="${ref}" s="${styleForCol[ci]}"/>`;
          return `<c r="${ref}" s="${styleForCol[ci]}"><v>${Number(v)}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`;
      }).join('') + `</row>`;
    });

    const lastCol = colLetter(headers.length - 1);
    const lastRow = rows.length + 1;
    const colsXml = '<cols>' + colWidths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
  <autoFilter ref="A1:${lastCol}1"/>
</worksheet>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="0.000"/></numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><sz val="11"/><name val="Calibri"/><b/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Fill-ups" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const blob = makeZip([
      { name: '[Content_Types].xml', text: contentTypesXml },
      { name: '_rels/.rels', text: rootRelsXml },
      { name: 'xl/workbook.xml', text: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', text: workbookRelsXml },
      { name: 'xl/styles.xml', text: stylesXml },
      { name: 'xl/worksheets/sheet1.xml', text: sheetXml },
    ]);

    downloadBlob(blob, `fuel-tracker-${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('Spreadsheet exported (Excel)');
  }

  // Persistent hidden file input; its change handler is attached once.
  const importFile = document.getElementById('import-file');
  importFile.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file){ return; }
    const reader = new FileReader();
    reader.onload = async (evt)=>{
      let parsed;
      try{
        parsed = JSON.parse(evt.target.result);
      }catch(err){
        showToast('Not a valid JSON file');
        return;
      }
      const incoming = Array.isArray(parsed) ? parsed
                      : (parsed && Array.isArray(parsed.data) ? parsed.data : null);
      if(!incoming){
        showToast('No fill-ups found in file');
        return;
      }
      const ok = await confirmDialog(
        `Import ${incoming.length} fill-up${incoming.length===1?'':'s'}? This replaces your current data.`,
        { title:'Import Backup', confirmText:'Import' }
      );
      if(!ok) return;

      data = incoming.map(r=>({
        id: r.id || uid(),
        date: r.date || new Date().toISOString(),
        station: r.station || '',
        location: r.location || '',
        grade: r.grade || 'Regular',
        fullTank: r.fullTank !== undefined ? !!r.fullTank : true,
        liters: Number(r.liters) || 0,
        pricePerLiter: Number(r.pricePerLiter) || 0,
        totalCost: Number(r.totalCost) || 0,
        odometer: (r.odometer === null || r.odometer === undefined || r.odometer === '') ? null : Number(r.odometer),
        notes: r.notes || '',
      }));
      if(parsed && parsed.settings){
        settings = Object.assign({ currency:'USD', distanceUnit:'km', theme:'auto' }, parsed.settings);
        applyTheme();
      }
      save(); saveSettings();
      document.querySelector('.tab-btn[data-tab="dashboard"]').click();
      showToast(`Imported ${data.length} fill-up${data.length===1?'':'s'}`);
    };
    reader.onerror = ()=> showToast('Could not read that file');
    reader.readAsText(file);
  });

  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=> t.classList.remove('show'), 1600);
  }

  // Promise-based confirm that works in standalone home-screen apps,
  // where the native confirm() dialog is unreliable.
  function confirmDialog(message, { title='Are you sure?', confirmText='Confirm', destructive=false } = {}){
    return new Promise(resolve=>{
      const backdrop = document.getElementById('dialog-backdrop');
      const confirmBtn = document.getElementById('dialog-confirm');
      const cancelBtn = document.getElementById('dialog-cancel');
      document.getElementById('dialog-title').textContent = title;
      document.getElementById('dialog-message').textContent = message;
      confirmBtn.textContent = confirmText;
      confirmBtn.classList.toggle('destructive', destructive);

      function cleanup(result){
        backdrop.classList.remove('open');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        resolve(result);
      }
      function onConfirm(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      function onBackdrop(e){ if(e.target === backdrop) cleanup(false); }

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
      backdrop.classList.add('open');
    });
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // Keep charts/meta in sync when the system theme flips while set to Automatic.
  const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemThemeChange = ()=>{
    if((settings.theme || 'auto') === 'auto'){
      applyTheme();
      if(activeTab === 'stats') render();
    }
  };
  if(systemThemeQuery.addEventListener) systemThemeQuery.addEventListener('change', onSystemThemeChange);
  else if(systemThemeQuery.addListener) systemThemeQuery.addListener(onSystemThemeChange);

  applyTheme();
  render();
})();
