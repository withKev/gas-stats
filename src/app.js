(function(){
  const STORE_KEY = 'fuelTrackerData_v1';
  const SETTINGS_KEY = 'fuelTrackerSettings_v1';
  const VEHICLES_KEY = 'fuelTrackerVehicles_v1';
  const SERVICE_KEY = 'fuelTrackerService_v1';    // maintenance + modification log entries
  const INTERVALS_KEY = 'fuelTrackerIntervals_v1'; // per-vehicle service intervals

  // ---------- Icon system (monoline, currentColor) ----------
  function icon(name, size=20, sw=2){
    const a = `xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" class="icon"`;
    const paths = {
      fuel: `<path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M3 21h12"/><path d="M14 10h1.5a2 2 0 0 1 2 2v3.2a1.3 1.3 0 0 0 2.6 0V9.8a1.3 1.3 0 0 0-.38-.92L17.5 6.7"/><path d="M6 8h6"/>`,
      grid: `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
      list: `<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>`,
      chart: `<path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/>`,
      sliders: `<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><circle cx="4" cy="13" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/>`,
      wrench: `<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.4-.6-.6-2.4 2.1-2.1z"/>`,
      plus_circle: `<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>`,
      clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
      plus: `<path d="M12 5v14"/><path d="M5 12h14"/>`,
      pin: `<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>`,
      calendar: `<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>`,
      card: `<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>`,
      drop: `<path d="M12 3s6.5 6.6 6.5 11.2A6.5 6.5 0 0 1 5.5 14.2C5.5 9.6 12 3 12 3z"/>`,
      gauge: `<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 12.5 15 9"/><circle cx="12" cy="12.5" r="1.1" fill="currentColor" stroke="none"/>`,
      chevron: `<path d="M9 6l6 6-6 6"/>`,
      check: `<path d="M20 6 9 17l-5-5"/>`,
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

  let allFills = load(STORE_KEY, []);
  let settings = load(SETTINGS_KEY, { currency:'USD', distanceUnit:'km', theme:'auto' });
  let vehicles = load(VEHICLES_KEY, []);
  let allService = load(SERVICE_KEY, []);       // {id, vehicleId, kind:'service'|'mod', title, date, odometer, cost, parts, notes}
  let allIntervals = load(INTERVALS_KEY, []);   // {id, vehicleId, title, distance, months}

  // Fill-ups belong to exactly one vehicle. `allFills` is the persisted source
  // of truth; render code works from activeFills(). Never mix the two: reads
  // scope to the active vehicle, writes always target allFills.
  function activeFills(){
    return allFills.filter(f => f.vehicleId === settings.activeVehicleId);
  }
  // Same scoping discipline for the service log and intervals.
  function activeService(){
    return allService.filter(s => s.vehicleId === settings.activeVehicleId);
  }
  function activeIntervals(){
    return allIntervals.filter(i => i.vehicleId === settings.activeVehicleId);
  }
  function saveService(){ localStorage.setItem(SERVICE_KEY, JSON.stringify(allService)); }
  function saveIntervals(){ localStorage.setItem(INTERVALS_KEY, JSON.stringify(allIntervals)); }

  // A service entry can cover several items, each with its own cost. Older
  // records had a single title/cost/parts; these helpers read both shapes so
  // callers never branch. serviceItems() always returns a [{title,cost}] array.
  // Sum money to whole cents, avoiding floating-point noise like 30.2999999.
  function sumCents(nums){ return Math.round(nums.reduce((s,n)=> s + n, 0) * 100) / 100; }

  function serviceItems(rec){
    if(Array.isArray(rec.items) && rec.items.length){
      return rec.items.map(it => {
        const parts = Array.isArray(it.parts) ? it.parts.map(p =>
          (typeof p === 'string')
            ? { name: p.trim(), price: 0 }
            : { name: String(p.name||'').trim(), price: Number(p.price)||0 }
        ).filter(p => p.name || p.price) : [];
        // Item cost is the sum of its parts when it has any; otherwise the
        // directly-entered cost.
        const cost = parts.length ? sumCents(parts.map(p=>p.price)) : (Number(it.cost)||0);
        return { title: String(it.title||'').trim(), cost, parts };
      });
    }
    // Legacy fall-back (also covers a record mid-migration).
    return [{ title: String(rec.title||'').trim(), cost: Number(rec.cost)||0, parts: [] }];
  }
  function serviceCost(rec){ return serviceItems(rec).reduce((s,it)=> s + it.cost, 0); }
  // Where/who: shop name if named, else 'Shop'/'DIY'; empty when unspecified (old records).
  function doneByLabel(rec){
    if(rec.doneBy === 'shop') return (rec.shop && rec.shop.trim()) ? rec.shop.trim() : 'Shop';
    if(rec.doneBy === 'diy') return 'DIY';
    return '';
  }  function serviceItemTitles(rec){ return serviceItems(rec).map(it=>it.title).filter(Boolean); }
  // What to show as the entry's headline: its custom title, else the item list.
  function serviceLabel(rec){
    const t = String(rec.title||'').trim();
    if(t) return t;
    const items = serviceItemTitles(rec);
    return items.length ? items.join(', ') : 'Service';
  }
  function activeVehicle(){
    return vehicles.find(v => v.id === settings.activeVehicleId) || vehicles[0] || null;
  }
  function vehicleName(id){
    const v = vehicles.find(x => x.id === id);
    return v ? v.name : 'Unknown Vehicle';
  }
  function newId(prefix){ return prefix + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

  // ---------- One-time migrations ----------
  // Requested by the user: their older entries used "Costco Gas"; the station
  // they actually want listed is "Costco Gasoline". Guarded by a flag so it
  // runs exactly once and never fights a later manual rename. Exact match only
  // -- we don't want to touch a station that merely contains the string.
  (function migrateStationNames(){
    const FLAG = 'fuelTrackerMigration_costcoRename';
    if(localStorage.getItem(FLAG)) return;
    let changed = 0;
    for(const r of allFills){
      if((r.station || '').trim() === 'Costco Gas'){ r.station = 'Costco Gasoline'; changed++; }
    }
    if(changed) localStorage.setItem(STORE_KEY, JSON.stringify(allFills));
    localStorage.setItem(FLAG, '1');
  })();

  // Every fill-up predating multi-vehicle support belongs to a single car.
  // Create one, adopt the orphans, and make it active. Idempotent: it only
  // acts on vehicles-less state, so it is safe on every load and after an
  // import of an old backup.
  const DEFAULT_INTERVALS = [
    { title:'Oil change',      distance:8000,  months:6 },
    { title:'Tire rotation',   distance:10000, months:6 },
    { title:'Engine air filter', distance:30000, months:24 },
    { title:'Cabin air filter',  distance:25000, months:12 },
    { title:'Brake inspection',  distance:20000, months:12 },
  ];

  function ensureVehicles(){
    let dirty = false;
    if(vehicles.length === 0){
      vehicles = [{ id: newId('v_'), name: 'My Car' }];
      saveVehicles();
      dirty = true;
    }
    const known = new Set(vehicles.map(v=>v.id));
    for(const f of allFills){
      if(!f.vehicleId || !known.has(f.vehicleId)){ f.vehicleId = vehicles[0].id; dirty = true; }
    }
    // Orphaned service entries (bad/missing vehicleId) adopt the first vehicle.
    let serviceDirty = false;
    for(const s of allService){
      if(!s.vehicleId || !known.has(s.vehicleId)){ s.vehicleId = vehicles[0].id; serviceDirty = true; }
      // Migrate old single-item records to items[]. Old free-text parts become a
      // single priced part carrying the whole item cost (best guess; editable).
      if(!Array.isArray(s.items)){
        const cost = Number(s.cost)||0;
        const parts = (s.parts && String(s.parts).trim())
          ? [{ name: String(s.parts).trim(), price: cost }]
          : [];
        s.items = [{ title: String(s.title||'Service').trim(), cost, parts }];
        delete s.cost;
        delete s.parts;
        // Keep s.title as the entry's custom label (may equal the single item).
        serviceDirty = true;
      }
      // Follow-on for records already migrated by an earlier build that folded
      // parts into notes as a trailing "Parts: X" line. Pull it back into the
      // (single) item's parts, giving the part the item's cost so no money is
      // lost when cost switches to the parts sum.
      if(Array.isArray(s.items) && s.items.length === 1 && !(s.items[0].parts && s.items[0].parts.length) && s.notes){
        const m = s.notes.match(/(^|\n)Parts: (.+)$/);
        if(m){
          s.items[0].parts = [{ name: m[2].trim(), price: Number(s.items[0].cost)||0 }];
          s.notes = s.notes.slice(0, m.index).replace(/\n$/,'');
          serviceDirty = true;
        }
      }
    }
    if(serviceDirty) saveService();
    // Seed default intervals for any vehicle that has none yet (new installs and
    // newly-created vehicles both), so the "next due" view isn't blank on day one.
    let intervalsDirty = false;
    for(const v of vehicles){
      const has = allIntervals.some(i => i.vehicleId === v.id);
      if(!has){
        for(const d of DEFAULT_INTERVALS){
          allIntervals.push({ id: newId('i_'), vehicleId: v.id, title: d.title, distance: d.distance, months: d.months });
        }
        intervalsDirty = true;
      }
    }
    // Reconcile any orphaned intervals too.
    for(const i of allIntervals){
      if(!i.vehicleId || !known.has(i.vehicleId)){ i.vehicleId = vehicles[0].id; intervalsDirty = true; }
    }
    if(intervalsDirty) saveIntervals();
    if(!settings.activeVehicleId || !known.has(settings.activeVehicleId)){
      settings.activeVehicleId = vehicles[0].id;
      saveSettings();
    }
    if(dirty) save();
  }
  ensureVehicles();

  function load(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
  function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(allFills)); }
  function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function saveVehicles(){ localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles)); }
  function uid(){ return 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

  function fmtMoney(n){
    try{ return new Intl.NumberFormat(navigator.language, {style:'currency', currency:settings.currency || 'USD'}).format(n||0); }
    catch(e){ return (settings.currency||'USD') + ' ' + (n||0).toFixed(2); }
  }
  function fmtMonthHeader(d){ return d.toLocaleDateString(undefined, {month:'long', year:'numeric'}); }
  function monthKey(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function sortedDesc(){ return activeFills().sort((a,b)=> new Date(b.date) - new Date(a.date)); }

  // Per-fill-up metrics for the history cards: distance since the previous
  // reading, and efficiency on full tanks. Mirrors computeEconomy()'s rules so
  // the numbers agree with the dashboard: active vehicle only, odometer order,
  // and a full tank's consumption covers all fuel since the last full tank.
  // Returns a map of fill id -> { distance, economy } (either may be null).
  function perFillMetrics(){
    const withOdo = activeFills()
      .filter(d=> d.odometer != null && d.odometer !== '' && !isNaN(parseFloat(d.odometer)))
      .sort((a,b)=> parseFloat(a.odometer) - parseFloat(b.odometer));

    const out = {};
    let prevOdo = null;      // odometer of the immediately preceding reading
    let lastFullOdo = null;  // odometer of the last full tank
    let segLiters = 0;       // fuel added since that last full tank

    for(const rec of withOdo){
      const odo = parseFloat(rec.odometer);
      const m = { distance: null, economy: null };

      if(prevOdo !== null && odo > prevOdo) m.distance = odo - prevOdo;

      if(lastFullOdo !== null) segLiters += rec.liters || 0;
      if(rec.fullTank){
        if(lastFullOdo !== null && odo > lastFullOdo){
          m.economy = (segLiters / (odo - lastFullOdo)) * 100;
        }
        lastFullOdo = odo;
        segLiters = 0;
      }
      out[rec.id] = m;
      prevOdo = odo;
    }
    return out;
  }

  // Total distance driven per calendar month for the active vehicle. Distance is
  // the odometer delta each fill-up adds (from perFillMetrics), attributed to the
  // month of that fill-up — so a stretch driven across a month boundary counts in
  // the month its reading was taken. Only spans with odometers on both ends count,
  // so months with missing odometers undercount (by design). Returns
  // { 'YYYY-MM': distance } with only months that have a computable distance > 0.
  function distanceByMonth(){
    const metrics = perFillMetrics();
    const out = {};
    activeFills().forEach(f=>{
      const d = metrics[f.id] && metrics[f.id].distance;
      if(d){
        const key = monthKey(new Date(f.date));
        out[key] = (out[key] || 0) + d;
      }
    });
    return out;
  }

  function computeEconomy(fills){
    // Walk fill-ups in odometer order. Consumption between two full tanks =
    // all fuel added since the last full tank (including partials and the
    // current full tank) divided by the distance between them.
    //
    // CRITICAL: only ever one vehicle's fill-ups. Odometers from different
    // cars interleave (45,000 km next to 12,000 km) and would pair up into
    // meaningless distances -- no error, just a wrong number.
    const all = (fills || activeFills())
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
    { id:'garage',    label:'Garage',    icon:'wrench' },
    { id:'settings',  label:'Settings',  icon:'sliders' },
  ];
  document.querySelectorAll('.tab-btn').forEach((btn, i)=>{
    const def = TAB_DEFS[i];
    btn.innerHTML = icon(def.icon, 23, 2) + `<span>${def.label}</span>`;
  });

  // ---------- Tabs ----------
  let activeTab = 'dashboard';
  let dashYear = new Date().getFullYear();   // which year the dashboard spend card shows
  let garageYear = new Date().getFullYear(); // which year the Garage spend card shows
  let statsYear = new Date().getFullYear();  // Stats tab scope: a year, or 'all'
  const navbarTitle = document.getElementById('navbar-title');
  const main = document.getElementById('main');
  const navbar = document.getElementById('navbar');

  document.querySelectorAll('.tab-btn').forEach((btn, i)=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = TAB_DEFS[i].id;
      main.scrollTop = 0;
      navbar.classList.remove('scrolled');
      if(activeTab !== 'stats') destroyCharts();
      render();   // sets the navbar title too
    });
  });
  main.addEventListener('scroll', ()=>{
    navbar.classList.toggle('scrolled', main.scrollTop > 8);
  });

  // ---------- Render ----------
  function render(){
    if(activeTab === 'stats') renderStats();
    else if(activeTab === 'garage') renderGarage();
    else if(activeTab === 'settings') renderSettings();
    else renderDashboard();
    wireVehicleBar();   // after innerHTML, and covers the empty-state early returns
    updateNavbarTitle();
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

  // Option A: the tab keeps its title; the vehicle switcher rides at the right
  // end of the same row, so it costs no extra vertical space.
  function titleRowHtml(label){
    const v = activeVehicle();
    if(!v) return `<div class="large-title">${escapeHtml(label)}</div>`;
    return `<div class="title-row">
        <div class="large-title">${escapeHtml(label)}</div>
        <button class="vehicle-chip" id="vehicle-bar" aria-label="Switch vehicle">
          <span class="vehicle-chip-name">${escapeHtml(v.name)}</span>
          <span class="vehicle-chip-chevron">${icon('chevron',14,2.6)}</span>
        </button>
      </div>`;
  }
  function wireVehicleBar(){
    const bar = document.getElementById('vehicle-bar');
    if(bar) bar.addEventListener('click', openVehicleSheet);
  }

  // The collapsed navbar title shows the tab name, matching the large title.
  function updateNavbarTitle(){
    const el = document.getElementById('navbar-title');
    if(!el) return;
    const def = TAB_DEFS.find(t => t.id === activeTab);
    el.textContent = def ? def.label : 'Dashboard';
  }

  function renderDashboard(){
    const data = activeFills();   // scoped: everything below is this vehicle only
    const all = sortedDesc();
    let html = titleRowHtml('Dashboard');

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
    const currentYear = now.getFullYear();
    const monthTotal = data.filter(d=>{
      const dt = new Date(d.date);
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    }).reduce((s,d)=> s + (d.totalCost||0), 0);
    // Years that have fill-ups (this vehicle), newest first, plus the current
    // year so you can always land on "this year" even before logging in it.
    const years = [...new Set(data.map(d=> new Date(d.date).getFullYear()).concat(currentYear))]
      .sort((a,b)=> b - a);
    if(!years.includes(dashYear)) dashYear = currentYear;   // clamp if the selected year vanished
    const yearTotal = data.filter(d=> new Date(d.date).getFullYear() === dashYear)
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
        <div class="stat-card"><div class="stat-card-head">${badge('color-mix(in srgb, var(--blue) 16%, transparent)','calendar',32,16)}<select class="year-select" id="dash-year" aria-label="Select year">${years.map(y=>`<option value="${y}" ${y===dashYear?'selected':''}>${y}</option>`).join('')}</select></div><div class="stat-value" style="color:var(--blue);">${fmtMoney(yearTotal)}</div><div class="stat-label">${dashYear===currentYear ? 'Year to Date' : 'Total spent'}</div></div>
      </div>
      <div class="stat-grid" style="margin-top:10px;">
        <div class="stat-card">${badge('color-mix(in srgb, var(--purple) 16%, transparent)','drop',32,16)}<div class="stat-value" style="color:var(--purple);">${fmtMoney(avgPrice)}</div><div class="stat-label">Avg Price / L</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--green) 16%, transparent)','gauge',32,16)}<div class="stat-value" style="color:var(--green);">${economy != null ? economy.toFixed(1)+' L/100'+distUnit : '—'}</div><div class="stat-label">Avg Consumption</div></div>
      </div>
    `;

    // Full history, grouped by month, flowing down the dashboard.
    const metrics = perFillMetrics();
    const groups = {};
    all.forEach(item=>{
      const d = new Date(item.date);
      const key = monthKey(d);
      if(!groups[key]) groups[key] = { label: fmtMonthHeader(d), items: [] };
      groups[key].items.push(item);
    });
    Object.keys(groups).sort().reverse().forEach(key=>{
      const g = groups[key];
      // Sum the odometer-delta distance for the fill-ups in this month.
      const monthDist = g.items.reduce((s,it)=> s + ((metrics[it.id] && metrics[it.id].distance) || 0), 0);
      const monthSpend = g.items.reduce((s,it)=> s + (it.totalCost || 0), 0);
      // Right side of the header: spend (always present) and distance (only when
      // computable). Kept in a muted span so the month name stays the emphasis.
      const bits = [fmtMoney(monthSpend)];
      if(monthDist > 0) bits.push(`${Math.round(monthDist).toLocaleString()} ${distUnit}`);
      html += `<div class="section-header"><span>${g.label}</span><span class="month-meta">${bits.join(' · ')}</span></div><div class="list-card">`;
      g.items.forEach(item=>{
        const meta = GRADE_META[item.grade] || GRADE_META['Regular'];
        const sub = item.location || fmtShortDate(item.date);

        // Compact detail line: only the fields we actually have. Odometer and
        // price/L come straight off the fill-up; distance and efficiency are
        // computed and may be absent (first reading, no odometer, partial tank).
        const m = metrics[item.id] || {};
        const parts = [];
        if(m.distance != null) parts.push(`${Math.round(m.distance)} ${distUnit}`);
        if(item.odometer != null && item.odometer !== '')
          parts.push(`${Math.round(Number(item.odometer)).toLocaleString()} ${distUnit}`);
        if(m.economy != null) parts.push(`${m.economy.toFixed(1)} L/100${distUnit}`);
        if(item.pricePerLiter) parts.push(`${fmtMoney(item.pricePerLiter)}/L`);
        const detail = parts.length
          ? `<div class="row-detail">${parts.map(p=>`<span class="rd-part">${p}</span>`).join('<span class="row-detail-dot">·</span><wbr>')}</div>` : '';

        html += `
          <div class="list-row tappable" data-id="${item.id}">
            <div class="badge round" style="background:color-mix(in srgb, ${meta.color} 16%, transparent); color:${meta.color};">${icon(meta.icon,16,2)}</div>
            <div class="row-main">
              <div class="row-title">${escapeHtml(item.station || 'Fill-Up')}</div>
              <div class="row-sub">${escapeHtml(sub)}</div>
              ${detail}
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

    const yearSel = document.getElementById('dash-year');
    if(yearSel) yearSel.addEventListener('change', ()=>{ dashYear = parseInt(yearSel.value,10); renderDashboard(); wireVehicleBar(); });

    main.querySelectorAll('.list-row[data-id]').forEach(row=>{
      row.addEventListener('click', ()=> openEdit(row.dataset.id));
    });
  }

  // Interactive charts via locally-bundled Chart.js (offline-safe).
  let monthlyChart = null, trendChart = null, distanceChart = null;

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
      green: (styles.getPropertyValue('--green') || '#34C759').trim(),
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
    if(distanceChart){ distanceChart.destroy(); distanceChart = null; }
  }

  function buildCharts(monthEntries, trendEntries, distanceEntries){
    if(typeof Chart === 'undefined') return;   // safety net; bundled so shouldn't happen
    const t = chartTheme();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const distUnit = settings.distanceUnit === 'mi' ? 'mi' : 'km';

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

    const distanceCanvas = document.getElementById('distanceCanvas');
    if(distanceCanvas && distanceEntries && distanceEntries.length > 1){
      distanceChart = new Chart(distanceCanvas, {
        type: 'bar',
        data: {
          labels: distanceEntries.map(m=>m.label),
          datasets: [{ data: distanceEntries.map(m=>Math.round(m.total)), backgroundColor: t.green, borderRadius: 6, maxBarThickness: 30, hoverBackgroundColor: t.green }]
        },
        options: {
          animation: reduceMotion ? false : { duration: 500 },
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { ...tooltipStyle, callbacks: {
              title: items => items[0].label,
              label: item => `${item.raw.toLocaleString()} ${distUnit}`
            } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: t.grid }, ticks: { color: t.tick, callback: v => `${v.toLocaleString()} ${distUnit}` } },
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

  // ==================== GARAGE (maintenance + mods) ====================

  const distUnitLabel = ()=> settings.distanceUnit === 'mi' ? 'mi' : 'km';

  // The latest known odometer for the active vehicle, from fill-ups OR service
  // records -- whichever is highest. Used to estimate distance until due.
  function latestOdometer(){
    let max = null;
    for(const f of activeFills()){
      const o = parseFloat(f.odometer);
      if(!isNaN(o)) max = max === null ? o : Math.max(max, o);
    }
    for(const s of activeService()){
      const o = parseFloat(s.odometer);
      if(!isNaN(o)) max = max === null ? o : Math.max(max, o);
    }
    return max;
  }

  // For each interval, find the most recent matching service entry (by title,
  // case-insensitive) and compute when it's next due by date and by distance.
  // Either basis may be unknown; "due" is whichever comes first.
  function computeDueList(){
    const intervals = activeIntervals();
    const services = activeService()
      .filter(s => s.kind === 'service')
      .sort((a,b)=> new Date(b.date) - new Date(a.date));
    const currentOdo = latestOdometer();
    const now = Date.now();
    const DAY = 86400000;

    return intervals.map(iv => {
      const ivKey = iv.title.trim().toLowerCase();
      const last = services.find(s => serviceItemTitles(s).some(t => t.trim().toLowerCase() === ivKey));
      const r = { interval: iv, last: last || null,
                  dueDistance: null, distanceRemaining: null,
                  dueDate: null, daysRemaining: null,
                  status: 'unknown' };  // 'ok' | 'soon' | 'overdue' | 'unknown'

      if(last){
        const lastOdo = parseFloat(last.odometer);
        if(iv.distance && !isNaN(lastOdo)){
          r.dueDistance = lastOdo + iv.distance;
          if(currentOdo !== null) r.distanceRemaining = r.dueDistance - currentOdo;
        }
        if(iv.months && last.date){
          const d = new Date(last.date);
          d.setMonth(d.getMonth() + iv.months);
          r.dueDate = d;
          r.daysRemaining = Math.round((d.getTime() - now) / DAY);
        }
      }

      // Status = worst of the two bases we can evaluate.
      const flags = [];
      if(r.distanceRemaining !== null){
        flags.push(r.distanceRemaining < 0 ? 'overdue' : r.distanceRemaining < iv.distance*0.15 ? 'soon' : 'ok');
      }
      if(r.daysRemaining !== null){
        flags.push(r.daysRemaining < 0 ? 'overdue' : r.daysRemaining < 30 ? 'soon' : 'ok');
      }
      if(flags.includes('overdue')) r.status = 'overdue';
      else if(flags.includes('soon')) r.status = 'soon';
      else if(flags.includes('ok')) r.status = 'ok';
      else r.status = last ? 'ok' : 'unknown';
      return r;
    });
  }

  const STATUS_COLOR = { overdue:'var(--red)', soon:'var(--orange)', ok:'var(--green)', unknown:'var(--text-tertiary)' };

  function fmtShortDate(d){ return new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }

  function dueSummaryLine(r){
    const unit = distUnitLabel();
    const bits = [];
    if(r.distanceRemaining !== null){
      bits.push(r.distanceRemaining < 0
        ? `${Math.abs(Math.round(r.distanceRemaining)).toLocaleString()} ${unit} overdue`
        : `in ${Math.round(r.distanceRemaining).toLocaleString()} ${unit}`);
    }
    if(r.daysRemaining !== null){
      bits.push(r.daysRemaining < 0
        ? `${Math.abs(r.daysRemaining)} days overdue`
        : `in ${r.daysRemaining} days`);
    }
    if(!bits.length) return r.last ? 'No interval set' : 'Never logged';
    return bits.join(' · ');
  }

  function renderGarage(){
    const service = activeService();
    let html = titleRowHtml('Garage');

    // ----- Total spent (service + mods, this vehicle; fuel excluded) -----
    const serviceTotal = service.filter(x=>x.kind==='service').reduce((s,x)=> s + serviceCost(x), 0);
    const modTotal = service.filter(x=>x.kind==='mod').reduce((s,x)=> s + serviceCost(x), 0);
    const totalSpent = serviceTotal + modTotal;
    const currentYear = new Date().getFullYear();
    const thisYearSpent = service.filter(x=> new Date(x.date).getFullYear() === currentYear)
      .reduce((s,x)=> s + serviceCost(x), 0);
    // The Maintenance card is year-selectable (only that number cycles). Years
    // come from any service/mod record plus the current year.
    const gYears = [...new Set(service.map(x=> new Date(x.date).getFullYear()).concat(currentYear))]
      .sort((a,b)=> b - a);
    if(!gYears.includes(garageYear)) garageYear = currentYear;   // clamp
    const maintenanceYear = service.filter(x=> x.kind==='service' && new Date(x.date).getFullYear() === garageYear)
      .reduce((s,x)=> s + serviceCost(x), 0);

    html += `<div class="stat-grid" style="margin-top:4px;">
      <div class="stat-card">
        ${badge('color-mix(in srgb, var(--orange) 16%, transparent)','calendar',32,16)}
        <div class="stat-value" style="color:var(--orange);">${fmtMoney(thisYearSpent)}</div>
        <div class="stat-label">This Year</div>
      </div>
      <div class="stat-card">
        ${badge('color-mix(in srgb, var(--blue) 16%, transparent)','card',32,16)}
        <div class="stat-value" style="color:var(--blue);">${fmtMoney(totalSpent)}</div>
        <div class="stat-label">All Time</div>
      </div>
    </div>
    <div class="stat-grid" style="margin-top:12px;">
      <div class="stat-card">
        <div class="stat-card-head">${badge('color-mix(in srgb, var(--blue) 16%, transparent)','wrench',32,16)}<select class="year-select" id="garage-year" aria-label="Select year">${gYears.map(y=>`<option value="${y}" ${y===garageYear?'selected':''}>${y}</option>`).join('')}</select></div>
        <div class="stat-value" style="color:var(--blue);">${fmtMoney(maintenanceYear)}</div>
        <div class="stat-label">Maintenance</div>
      </div>
      <div class="stat-card">
        ${badge('color-mix(in srgb, var(--purple) 16%, transparent)','sliders',32,16)}
        <div class="stat-value" style="color:var(--purple);">${fmtMoney(modTotal)}</div>
        <div class="stat-label">Modifications</div>
      </div>
    </div>`;

    // ----- Up next (due list) -----
    const due = computeDueList().sort((a,b)=>{
      const order = { overdue:0, soon:1, ok:2, unknown:3 };
      return order[a.status] - order[b.status];
    });
    html += `<div class="section-header" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Up Next</span>
        <button class="link-btn" id="edit-intervals-btn">Edit intervals</button>
      </div>`;
    if(!due.length){
      html += `<div class="list-card"><div class="empty-inline">No intervals set. Tap "Edit intervals" to add some.</div></div>`;
    } else {
      html += `<div class="list-card">` + due.map(r=>`
        <div class="due-row">
          <span class="due-dot" style="background:${STATUS_COLOR[r.status]};"></span>
          <div class="due-main">
            <div class="due-title">${escapeHtml(r.interval.title)}</div>
            <div class="due-sub">${escapeHtml(dueSummaryLine(r))}${r.last ? ` · last ${fmtShortDate(r.last.date)}` : ''}</div>
          </div>
        </div>`).join('') + `</div>`;
    }

    // ----- Log (filterable) -----
    const filter = settings.garageFilter || 'all';
    const shown = service
      .filter(x => filter === 'all' ? true : filter === 'service' ? x.kind==='service' : x.kind==='mod')
      .sort((a,b)=> new Date(b.date) - new Date(a.date));

    html += `<div class="section-header" style="margin-top:20px;">History</div>
      <div class="seg-control" id="garage-filter">
        ${['all','service','mod'].map(f=>`<button class="seg${filter===f?' active':''}" data-f="${f}">${f==='all'?'All':f==='service'?'Maintenance':'Mods'}</button>`).join('')}
      </div>`;

    if(!shown.length){
      const emptyWord = filter==='all' ? '' : (filter==='service' ? 'maintenance ' : 'mod ');
      html += `<div class="list-card"><div class="empty-inline">No ${emptyWord}entries yet. Tap + to add one.</div></div>`;
    } else {
      html += `<div class="list-card">` + shown.map(x=>{
        const unit = distUnitLabel();
        const meta = [];
        if(x.odometer!=null && x.odometer!=='') meta.push(`${Math.round(Number(x.odometer)).toLocaleString()} ${unit}`);
        // Sub-line stays: date · odometer · DIY/shop. The item list is not shown
        // here (it's the row title when there's no custom title, and always
        // visible when you open the entry).
        const by = doneByLabel(x);
        if(by) meta.push(escapeHtml(by));
        const tag = x.kind==='mod' ? `<span class="kind-tag mod">Mod</span>` : `<span class="kind-tag svc">Maintenance</span>`;
        const total = serviceCost(x);
        return `
          <div class="list-row tappable" data-sid="${x.id}">
            <div class="badge round" style="background:color-mix(in srgb, ${x.kind==='mod'?'var(--purple)':'var(--blue)'} 16%, transparent); color:${x.kind==='mod'?'var(--purple)':'var(--blue)'};">${icon(x.kind==='mod'?'sliders':'wrench',16,2)}</div>
            <div class="row-main">
              <div class="row-title">${escapeHtml(serviceLabel(x))} ${tag}</div>
              <div class="row-sub garage-sub">${fmtShortDate(x.date)}${meta.length?' · '+meta.join(' · '):''}</div>
            </div>
            <div class="row-right">
              <div class="row-amount">${total ? fmtMoney(total) : '—'}</div>
              <span class="chevron">${icon('chevron',16,2.2)}</span>
            </div>
          </div>`;
      }).join('') + `</div>`;
    }

    main.innerHTML = html;

    // Wire interactions
    document.getElementById('edit-intervals-btn')?.addEventListener('click', openIntervalsSheet);
    const gYearSel = document.getElementById('garage-year');
    if(gYearSel) gYearSel.addEventListener('change', ()=>{ garageYear = parseInt(gYearSel.value,10); renderGarage(); wireVehicleBar(); });
    main.querySelectorAll('#garage-filter .seg').forEach(btn=>{
      btn.addEventListener('click', ()=>{ settings.garageFilter = btn.dataset.f; saveSettings(); renderGarage(); wireVehicleBar(); });
    });
    main.querySelectorAll('.list-row[data-sid]').forEach(row=>{
      row.addEventListener('click', ()=> openServiceEdit(row.dataset.sid));
    });
  }

  function renderStats(){
    const data = activeFills();   // all fill-ups for this vehicle (used for All Time + year list)
    let html = titleRowHtml('Stats');
    if(data.length === 0){
      html += `<div class="empty">${badge('var(--blue)','chart',56,26)}<div class="title">No Data Yet</div><div class="body">Log some fill-ups to see your stats.</div></div>`;
      main.innerHTML = html;
      return;
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const distUnit = settings.distanceUnit === 'mi' ? 'mi' : 'km';

    // Year options: 'all' plus each year with fill-ups, newest first.
    const statYears = [...new Set(data.map(d=> new Date(d.date).getFullYear()))].sort((a,b)=> b - a);
    if(statsYear !== 'all' && !statYears.includes(statsYear)) statsYear = currentYear;
    if(statsYear !== 'all' && !statYears.includes(statsYear)) statsYear = statYears[0]; // no current-year data yet

    // Scope: the selected year's fill-ups (or all). Everything below except the
    // All Time card is computed from `scoped`.
    const scoped = statsYear === 'all' ? data : data.filter(d=> new Date(d.date).getFullYear() === statsYear);
    const periodLabel = statsYear === 'all' ? 'All Time' : (statsYear === currentYear ? 'This Year' : String(statsYear));

    const allTimeTotal = data.reduce((s,d)=> s + (d.totalCost||0), 0);
    const scopedTotal = scoped.reduce((s,d)=> s + (d.totalCost||0), 0);
    const avgFillUp = scoped.length ? scoped.reduce((s,d)=> s + (d.totalCost||0), 0) / scoped.length : 0;
    const avgPrice = scoped.length ? scoped.reduce((s,d)=> s + (d.pricePerLiter||0), 0) / scoped.length : 0;
    const totalLiters = scoped.reduce((s,d)=> s + (d.liters||0), 0);
    const economy = computeEconomy(scoped);

    // Monthly spend for the scope.
    const byMonth = {};
    scoped.forEach(d=>{
      const dt = new Date(d.date);
      const key = monthKey(dt);
      if(!byMonth[key]) byMonth[key] = {label: dt.toLocaleDateString(undefined,{month:'short'}), total:0, sortKey:key};
      byMonth[key].total += (d.totalCost||0);
    });
    const monthEntries = Object.values(byMonth).sort((a,b)=> a.sortKey.localeCompare(b.sortKey)).slice(-12);
    const trendEntries = [...scoped].sort((a,b)=> new Date(a.date)-new Date(b.date));

    // Monthly distance uses the ALL-TIME odometer deltas (so a January delta
    // still counts December's reading correctly), then filtered to the scope.
    const distByMonth = distanceByMonth();
    const distanceEntries = Object.keys(distByMonth)
      .filter(k => statsYear === 'all' ? true : k.slice(0,4) === String(statsYear))
      .sort().slice(-12).map(k=>({
        label: new Date(k + '-02').toLocaleDateString(undefined,{month:'short'}),
        total: distByMonth[k],
      }));

    const yearOptions = [`<option value="all" ${statsYear==='all'?'selected':''}>All time</option>`]
      .concat(statYears.map(y=>`<option value="${y}" ${statsYear===y?'selected':''}>${y===currentYear ? y+' (This Year)' : y}</option>`))
      .join('');

    html += `
      <div class="stats-period"><select class="year-select" id="stats-year" aria-label="Select period">${yearOptions}</select></div>
      <div class="stat-grid">
        <div class="stat-card">${badge('color-mix(in srgb, var(--orange) 16%, transparent)','calendar',32,16)}<div class="stat-value">${fmtMoney(scopedTotal)}</div><div class="stat-label">${periodLabel==='All Time'?'Total':escapeHtml(periodLabel)}</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--blue) 16%, transparent)','calendar',32,16)}<div class="stat-value">${fmtMoney(allTimeTotal)}</div><div class="stat-label">All Time</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--green) 16%, transparent)','card',32,16)}<div class="stat-value">${fmtMoney(avgFillUp)}</div><div class="stat-label">Avg / Fill-Up</div></div>
        <div class="stat-card">${badge('color-mix(in srgb, var(--purple) 16%, transparent)','drop',32,16)}<div class="stat-value">${fmtMoney(avgPrice)}</div><div class="stat-label">Avg Price / L</div></div>
      </div>
      ${economy != null ? `<div class="stat-grid" style="margin-top:10px;"><div class="stat-card econ-card" style="grid-column:1/3;">
        <div class="econ-head">${badge('color-mix(in srgb, var(--red) 16%, transparent)','gauge',32,16)}<span class="stat-label">Avg Consumption</span></div>
        <div class="econ-values">
          <div class="econ-item"><div class="stat-value">${economy.toFixed(1)}</div><div class="econ-unit">L/100${distUnit}</div></div>
          <div class="econ-item"><div class="stat-value">${(100/economy).toFixed(1)}</div><div class="econ-unit">${distUnit}/L</div></div>
        </div>
      </div></div>` : ''}

      ${monthEntries.length>1 ? `<div class="chart-card" style="margin-top:16px;"><h3>Monthly Spend</h3><div class="chart-wrap"><canvas id="monthlyCanvas"></canvas></div></div>` : ''}
      ${distanceEntries.length>1 ? `<div class="chart-card"><h3>Monthly Distance</h3><div class="chart-wrap"><canvas id="distanceCanvas"></canvas></div></div>` : ''}
      ${trendEntries.length>1 ? `<div class="chart-card"><h3>Price per Liter Trend</h3><div class="chart-wrap"><canvas id="trendCanvas"></canvas></div></div>` : ''}

      <div class="list-card" style="padding:0 14px;">
        <div class="summary-row"><span>${statsYear==='all'?'Total':escapeHtml(periodLabel)} Fill-Ups</span><span>${scoped.length}</span></div>
        <div class="summary-row"><span>${statsYear==='all'?'Total':escapeHtml(periodLabel)} Liters</span><span>${totalLiters.toFixed(1)} L</span></div>
      </div>
    `;
    main.innerHTML = html;
    const ySel = document.getElementById('stats-year');
    if(ySel) ySel.addEventListener('change', ()=>{ statsYear = ySel.value==='all' ? 'all' : parseInt(ySel.value,10); renderStats(); wireVehicleBar(); });
    destroyCharts();
    buildCharts(monthEntries, trendEntries, distanceEntries);
  }

  // ---------- Edit Sheet ----------
  const backdrop = document.getElementById('backdrop');
  const editSheet = document.getElementById('edit-sheet');
  const vehicleSheet = document.getElementById('vehicle-sheet');
  const serviceSheet = document.getElementById('service-sheet');
  const intervalsSheet = document.getElementById('intervals-sheet');
  let editingId = null;
  let editingServiceId = null;
  let serviceKind = 'service';
  let serviceDoneBy = 'diy';

  function openSheet(sheet){ backdrop.classList.add('open'); sheet.classList.add('open'); }
  function closeSheets(){
    backdrop.classList.remove('open');
    editSheet.classList.remove('open');
    vehicleSheet.classList.remove('open');
    serviceSheet.classList.remove('open');
    intervalsSheet.classList.remove('open');
  }
  backdrop.addEventListener('click', closeSheets);

  // ---------- Vehicles ----------
  function fillCount(vehicleId){ return allFills.filter(f=>f.vehicleId===vehicleId).length; }

  function renderVehicleList(){
    const list = document.getElementById('vehicle-list');
    list.innerHTML = vehicles.map(v=>{
      const n = fillCount(v.id);
      const active = v.id === settings.activeVehicleId;
      return `<button class="vehicle-row" data-id="${v.id}">
          <span class="vehicle-row-check">${active ? icon('check',18,2.6) : ''}</span>
          <span class="vehicle-row-name">${escapeHtml(v.name)}</span>
          <span class="vehicle-row-count">${n} fill-up${n===1?'':'s'}</span>
        </button>`;
    }).join('');
    list.querySelectorAll('.vehicle-row').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        settings.activeVehicleId = btn.dataset.id;
        saveSettings();
        closeSheets();
        render();
        showToast(vehicleName(settings.activeVehicleId));
      });
    });
    // Deleting the last vehicle would leave new fill-ups with nowhere to go.
    document.getElementById('vehicle-delete-btn').disabled = vehicles.length <= 1;
  }

  function openVehicleSheet(){
    renderVehicleList();
    openSheet(vehicleSheet);
  }

  async function addVehicle(){
    const name = await confirmDialog('Give the vehicle a name.', {
      title:'Add Vehicle', confirmText:'Add', input:true, placeholder:'e.g. Mazda 3',
    });
    if(!name) return;
    const v = { id: newId('v_'), name };
    vehicles.push(v);
    settings.activeVehicleId = v.id;    // switch straight to it
    saveVehicles(); saveSettings();
    closeSheets();
    render();
    showToast(`Added ${name}`);
  }

  async function renameVehicle(){
    const v = activeVehicle();
    if(!v) return;
    const name = await confirmDialog('Rename this vehicle.', {
      title:'Rename Vehicle', confirmText:'Save', input:true, value:v.name,
    });
    if(!name || name === v.name) return;
    v.name = name;
    saveVehicles();
    renderVehicleList();
    render();
    showToast('Renamed');
  }

  async function deleteVehicle(){
    const v = activeVehicle();
    if(!v || vehicles.length <= 1) return;
    const n = fillCount(v.id);
    const sn = allService.filter(s=>s.vehicleId === v.id).length;
    const extra = sn ? ` and ${sn} service record${sn===1?'':'s'}` : '';
    const ok = await confirmDialog(
      `This permanently deletes ${v.name}, its ${n} fill-up${n===1?'':'s'}${extra}. This cannot be undone.`,
      { title:'Delete Vehicle', confirmText:'Delete', destructive:true }
    );
    if(!ok) return;
    allFills = allFills.filter(f=>f.vehicleId !== v.id);
    allService = allService.filter(s=>s.vehicleId !== v.id);
    allIntervals = allIntervals.filter(i=>i.vehicleId !== v.id);
    vehicles = vehicles.filter(x=>x.id !== v.id);
    settings.activeVehicleId = vehicles[0].id;
    save(); saveService(); saveIntervals(); saveVehicles(); saveSettings();
    closeSheets();
    render();
    showToast(`Deleted ${v.name}`);
  }

  document.getElementById('vehicle-done').addEventListener('click', closeSheets);
  document.getElementById('vehicle-add-btn').addEventListener('click', addVehicle);
  document.getElementById('vehicle-rename-btn').addEventListener('click', renameVehicle);
  document.getElementById('vehicle-delete-btn').addEventListener('click', deleteVehicle);

  // ---------- Service records ----------
  function setServiceKind(k){
    serviceKind = k;
    document.querySelectorAll('#service-kind .seg').forEach(b=> b.classList.toggle('active', b.dataset.k===k));
  }

  function setServiceDoneBy(d){
    serviceDoneBy = d;
    document.querySelectorAll('#service-doneby .seg').forEach(b=> b.classList.toggle('active', b.dataset.d===d));
    // Shop name only applies to shop visits.
    document.getElementById('s-shop-field').hidden = (d !== 'shop');
  }

  function validateService(){
    // Save is enabled when at least one item has a name.
    const anyNamed = [...document.querySelectorAll('#service-items .item-name')]
      .some(inp => inp.value.trim());
    document.getElementById('service-save').disabled = !anyNamed;
  }

  // Sum the item cost fields into the live total, and refresh the quick-add
  // chips (an interval already present as an item drops out of the chip row).
  function recomputeServiceTotal(){
    let total = 0;
    document.querySelectorAll('#service-items .item-row').forEach(row=>{
      const prices = [...row.querySelectorAll('.part-price')];
      total += prices.length
        ? prices.reduce((s,i)=> s + (Number(i.value)||0), 0)
        : (Number(row.querySelector('.item-cost').value) || 0);
    });
    document.getElementById('s-total').textContent = fmtMoney(total > 0 ? total : 0);
  }

  function currentItemNames(){
    return [...document.querySelectorAll('#service-items .item-name')]
      .map(i=>i.value.trim().toLowerCase()).filter(Boolean);
  }

  // Quick-add chips: interval titles not already added as an item row.
  function renderServiceItemChips(){
    const row = document.getElementById('service-item-chips');
    const have = new Set(currentItemNames());
    const chips = activeIntervals().map(i=>i.title).filter(t=> !have.has(t.trim().toLowerCase()));
    if(!chips.length){ row.hidden = true; row.innerHTML = ''; return; }
    row.hidden = false;
    row.innerHTML = chips.map(t=>`<button type="button" class="suggest-chip">${escapeHtml(t)}</button>`).join('');
    row.querySelectorAll('.suggest-chip').forEach((btn,i)=>{
      btn.addEventListener('click', ()=> addItemRow(chips[i], '', [], 'cost'));
    });
  }

  // When an item has any part lines, its cost is the sum of the part prices and
  // the item-cost field becomes a read-only total. With no parts, the field is
  // directly editable.
  function syncItemCost(itemRow){
    const costInput = itemRow.querySelector('.item-cost');
    const prices = [...itemRow.querySelectorAll('.part-price')];
    if(prices.length){
      const rounded = sumCents(prices.map(i=> Number(i.value)||0));
      costInput.value = rounded ? rounded : '';
      costInput.readOnly = true;
      costInput.classList.add('computed');
    } else {
      costInput.readOnly = false;
      costInput.classList.remove('computed');
    }
  }

  function addPartLine(itemRow, name, price, focus){
    const partsWrap = itemRow.querySelector('.item-parts');
    const line = document.createElement('div');
    line.className = 'part-line';
    line.innerHTML = `
      <input type="text" class="part-name" placeholder="Part name or number" autocomplete="off">
      <input type="number" class="part-price" inputmode="decimal" placeholder="0.00">
      <button type="button" class="part-remove" aria-label="Remove part">${icon('trash',16,2)}</button>`;
    line.querySelector('.part-name').value = name || '';
    line.querySelector('.part-price').value = (price===0||price) ? price : '';
    partsWrap.appendChild(line);
    line.querySelector('.part-price').addEventListener('input', ()=>{ syncItemCost(itemRow); recomputeServiceTotal(); });
    line.querySelector('.part-remove').addEventListener('click', ()=>{
      line.remove(); syncItemCost(itemRow); recomputeServiceTotal();
    });
    syncItemCost(itemRow);
    if(focus) line.querySelector('.part-name').focus();
  }

  function addItemRow(title, cost, parts, focus){
    const wrap = document.getElementById('service-items');
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <div class="item-head">
        <input type="text" class="item-name" placeholder="Item" autocapitalize="words" autocomplete="off">
        <input type="number" class="item-cost" inputmode="decimal" placeholder="0.00">
        <button type="button" class="item-remove" aria-label="Remove item">${icon('trash',18,2)}</button>
      </div>
      <div class="item-parts"></div>
      <button type="button" class="add-part-btn">+ Add part</button>`;
    div.querySelector('.item-name').value = title || '';
    div.querySelector('.item-cost').value = (cost===0||cost) ? cost : '';
    (parts||[]).forEach(p=> addPartLine(div, p.name, p.price, false));
    wrap.appendChild(div);

    div.querySelector('.item-name').addEventListener('input', ()=>{ validateService(); renderServiceItemChips(); });
    div.querySelector('.item-cost').addEventListener('input', recomputeServiceTotal);
    div.querySelector('.item-remove').addEventListener('click', ()=>{
      div.remove(); validateService(); recomputeServiceTotal(); renderServiceItemChips();
    });
    div.querySelector('.add-part-btn').addEventListener('click', ()=> addPartLine(div, '', '', true));
    syncItemCost(div);
    renderServiceItemChips();
    recomputeServiceTotal();
    validateService();
    // Focus only on a deliberate add (chip -> cost, + Add item -> name); never
    // when populating an existing entry, so viewing a record doesn't jump the
    // screen or pop the keyboard.
    if(focus === 'cost') div.querySelector('.item-cost').focus();
    else if(focus === 'name') div.querySelector('.item-name').focus();
  }

  function setServiceItems(items){
    const wrap = document.getElementById('service-items');
    wrap.innerHTML = '';
    (items && items.length ? items : [{title:'',cost:'',parts:[]}]).forEach(it=> addItemRow(it.title, it.cost, it.parts, false));
  }

  function readServiceItems(){
    return [...document.querySelectorAll('#service-items .item-row')].map(row=>{
      const parts = [...row.querySelectorAll('.part-line')].map(line=>({
        name: line.querySelector('.part-name').value.trim(),
        price: Number(line.querySelector('.part-price').value) || 0,
      })).filter(p => p.name || p.price);
      const cost = parts.length
        ? sumCents(parts.map(p=>p.price))
        : (Number(row.querySelector('.item-cost').value) || 0);
      return { title: row.querySelector('.item-name').value.trim(), cost, parts };
    }).filter(it => it.title);   // drop blank rows
  }

  function openServiceAdd(){
    editingServiceId = null;
    document.getElementById('service-sheet-title').textContent = 'Add Record';
    setServiceKind('service');
    setServiceDoneBy('diy');
    document.getElementById('s-title').value = '';
    document.getElementById('s-shop').value = '';
    document.getElementById('s-date').value = toLocalInputValue(new Date());
    document.getElementById('s-odo').value = '';
    document.getElementById('s-notes').value = '';
    setServiceItems([{title:'',cost:''}]);
    document.getElementById('service-delete').style.display = 'none';
    renderServiceItemChips();
    recomputeServiceTotal();
    validateService();
    openSheet(serviceSheet);
  }

  function openServiceEdit(id){
    const x = allService.find(s=>s.id===id);
    if(!x) return;
    editingServiceId = id;
    document.getElementById('service-sheet-title').textContent = 'Edit Record';
    setServiceKind(x.kind === 'mod' ? 'mod' : 'service');
    setServiceDoneBy(x.doneBy === 'shop' ? 'shop' : 'diy');
    document.getElementById('s-title').value = x.title || '';
    document.getElementById('s-shop').value = x.shop || '';
    document.getElementById('s-date').value = x.date ? toLocalInputValue(new Date(x.date)) : toLocalInputValue(new Date());
    document.getElementById('s-odo').value = (x.odometer==null||x.odometer==='') ? '' : x.odometer;
    document.getElementById('s-notes').value = x.notes || '';
    setServiceItems(serviceItems(x));
    document.getElementById('service-delete').style.display = '';
    renderServiceItemChips();
    recomputeServiceTotal();
    validateService();
    openSheet(serviceSheet);
  }

  function saveServiceRecord(){
    const items = readServiceItems();
    if(!items.length) return;   // need at least one named item
    const odoRaw = document.getElementById('s-odo').value;
    const existing = editingServiceId ? allService.find(s=>s.id===editingServiceId) : null;
    const rec = {
      id: editingServiceId || newId('s_'),
      vehicleId: (existing && existing.vehicleId) || settings.activeVehicleId,
      kind: serviceKind,
      doneBy: serviceDoneBy,
      shop: serviceDoneBy === 'shop' ? document.getElementById('s-shop').value.trim() : '',
      title: document.getElementById('s-title').value.trim(),
      date: fromLocalInputValue(document.getElementById('s-date').value).toISOString(),
      odometer: odoRaw === '' ? null : Number(odoRaw),
      items,
      notes: document.getElementById('s-notes').value.trim(),
    };
    if(editingServiceId){
      const i = allService.findIndex(s=>s.id===editingServiceId);
      allService[i] = rec;
    } else {
      allService.push(rec);
    }
    saveService();
    closeSheets();
    render();
    showToast(editingServiceId ? 'Record updated' : 'Record added');
  }

  async function deleteServiceRecord(){
    if(!editingServiceId) return;
    const ok = await confirmDialog('Delete this record? This cannot be undone.',
      { title:'Delete Record', confirmText:'Delete', destructive:true });
    if(!ok) return;
    allService = allService.filter(s=>s.id!==editingServiceId);
    saveService();
    closeSheets();
    render();
    showToast('Record deleted');
  }

  document.getElementById('service-cancel').addEventListener('click', closeSheets);
  document.getElementById('service-save').addEventListener('click', saveServiceRecord);
  document.getElementById('service-delete').addEventListener('click', deleteServiceRecord);
  document.getElementById('service-add-item').addEventListener('click', ()=> addItemRow('', '', [], 'name'));
  document.querySelectorAll('#service-kind .seg').forEach(btn=>{
    btn.addEventListener('click', ()=> setServiceKind(btn.dataset.k));
  });
  document.querySelectorAll('#service-doneby .seg').forEach(btn=>{
    btn.addEventListener('click', ()=> setServiceDoneBy(btn.dataset.d));
  });

  // ---------- Intervals editor ----------
  function renderIntervalsList(){
    const list = document.getElementById('intervals-list');
    const unit = distUnitLabel();
    const items = activeIntervals();
    if(!items.length){
      list.innerHTML = `<div class="empty-inline">No intervals. Tap Add to create one.</div>`;
      return;
    }
    list.innerHTML = items.map(iv=>`
      <div class="interval-row" data-id="${iv.id}">
        <div class="interval-main">
          <div class="interval-title">${escapeHtml(iv.title)}</div>
          <div class="interval-sub">${iv.distance? Math.round(iv.distance).toLocaleString()+' '+unit : 'no distance'} · ${iv.months? iv.months+' mo' : 'no time'}</div>
        </div>
        <button class="interval-edit" data-id="${iv.id}">Edit</button>
        <button class="interval-del" data-id="${iv.id}">${icon('trash',18,2)}</button>
      </div>`).join('');
    list.querySelectorAll('.interval-edit').forEach(b=> b.addEventListener('click', ()=> editInterval(b.dataset.id)));
    list.querySelectorAll('.interval-del').forEach(b=> b.addEventListener('click', ()=> deleteInterval(b.dataset.id)));
  }

  function openIntervalsSheet(){ renderIntervalsList(); openSheet(intervalsSheet); }

  async function addInterval(){
    const title = await confirmDialog('Name this service item.', { title:'Add Interval', confirmText:'Next', input:true, placeholder:'e.g. Transmission fluid' });
    if(!title) return;
    await promptIntervalValues({ id: newId('i_'), vehicleId: settings.activeVehicleId, title, distance:0, months:0 }, true);
  }

  async function editInterval(id){
    const iv = allIntervals.find(x=>x.id===id);
    if(iv) await promptIntervalValues(iv, false);
  }

  // Two quick prompts for the numbers, reusing the input dialog.
  async function promptIntervalValues(iv, isNew){
    const unit = distUnitLabel();
    const dist = await confirmDialog(`Every how many ${unit}? (0 to skip distance)`, {
      title: iv.title, confirmText:'Next', input:true, value: iv.distance? String(iv.distance):'', placeholder:`e.g. 8000` });
    if(dist === false) return;
    const months = await confirmDialog('Every how many months? (0 to skip time)', {
      title: iv.title, confirmText:'Save', input:true, value: iv.months? String(iv.months):'', placeholder:'e.g. 6' });
    if(months === false) return;
    iv.distance = Math.max(0, parseInt(dist,10) || 0);
    iv.months = Math.max(0, parseInt(months,10) || 0);
    if(isNew) allIntervals.push(iv);
    saveIntervals();
    renderIntervalsList();
    render();  // refresh the Up Next list underneath
    wireVehicleBar();
  }

  async function deleteInterval(id){
    const iv = allIntervals.find(x=>x.id===id);
    if(!iv) return;
    const ok = await confirmDialog(`Delete the "${iv.title}" interval? Your logged records stay.`,
      { title:'Delete Interval', confirmText:'Delete', destructive:true });
    if(!ok) return;
    allIntervals = allIntervals.filter(x=>x.id!==id);
    saveIntervals();
    renderIntervalsList();
    render();
    wireVehicleBar();
  }

  document.getElementById('intervals-done').addEventListener('click', closeSheets);
  document.getElementById('interval-add-btn').addEventListener('click', addInterval);


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
    for(const r of allFills){
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
        applyStationDiscount();
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
    document.getElementById('f-grade').value = settings.defaultGrade || 'Regular';
    document.getElementById('f-full').checked = true;
    document.getElementById('f-liters').value = '';
    document.getElementById('f-price').value = '';
    document.getElementById('f-total').value = '';
    document.getElementById('f-odo').value = '';
    document.getElementById('f-notes').value = '';
    document.getElementById('f-discount').value = '';
    document.getElementById('f-discount-max').value = '';
    // Pre-fill the default discount only when it isn't tied to a station. When
    // it is tied to a station, it fills once that station is entered.
    if(!(settings.defaultDiscountStation||'').trim()){
      document.getElementById('f-discount').value = settings.defaultDiscountPerLiter || '';
      document.getElementById('f-discount-max').value = settings.defaultDiscountMaxLiters || '';
    }
    renderStationSuggest();
    recalcTotal();
    validateForm();
    openSheet(editSheet);
  }

  function openEdit(id){
    const item = allFills.find(d=>d.id===id);
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
    document.getElementById('f-discount').value = item.discountPerLiter || '';
    document.getElementById('f-discount-max').value = item.discountMaxLiters ?? '';
    renderStationSuggest();
    refreshDiscountUI();
    validateForm();
    openSheet(editSheet);
  }

  document.getElementById('fab').addEventListener('click', ()=>{
    if(activeTab === 'garage') openServiceAdd();
    else openAdd();
  });
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
  const discEl = document.getElementById('f-discount');
  const discMaxEl = document.getElementById('f-discount-max');

  // Fuel discount: amount off per liter, applied to at most `max` liters
  // (blank = all). Returns the dollar amount saved for the given liters.
  function discountSaved(liters, perLiter, maxLiters){
    const l = Number(liters)||0, per = Number(perLiter)||0;
    if(l <= 0 || per <= 0) return 0;
    const eligible = (maxLiters!=null && maxLiters!=='' && !isNaN(Number(maxLiters)))
      ? Math.min(l, Number(maxLiters)) : l;
    return Math.round(per * eligible * 100) / 100;
  }

  // Station-tied discount: if a default discount station is set, the default
  // discount fills only when the entered station matches it, and clears
  // otherwise. With no station set, the default discount is not station-gated
  // (it pre-fills on open instead — see openAdd).
  function applyStationDiscount(){
    const dStation = (settings.defaultDiscountStation||'').trim().toLowerCase();
    if(!dStation || !(Number(settings.defaultDiscountPerLiter)||0)) return;
    const cur = document.getElementById('f-station').value.trim().toLowerCase();
    if(cur === dStation){
      discEl.value = settings.defaultDiscountPerLiter;
      discMaxEl.value = settings.defaultDiscountMaxLiters || '';
    } else {
      discEl.value = '';
      discMaxEl.value = '';
    }
    recalcTotal();
  }

  function refreshDiscountUI(){
    const hasDisc = (Number(discEl.value)||0) > 0;
    document.getElementById('f-discount-max-field').hidden = !hasDisc;
    const hintEl = document.getElementById('f-discount-hint');
    const saved = discountSaved(parseFloat(litersEl.value), discEl.value, discMaxEl.value);
    if(hasDisc && saved > 0){ hintEl.hidden = false; hintEl.textContent = `You saved ${fmtMoney(saved)} on this fill-up.`; }
    else { hintEl.hidden = true; }
  }

  function recalcTotal(){
    const l = parseFloat(litersEl.value), p = parseFloat(priceEl.value);
    if(!isNaN(l) && !isNaN(p)){
      const saved = discountSaved(l, discEl.value, discMaxEl.value);
      totalEl.value = Math.max(0, l*p - saved).toFixed(2);
    }
    // Show the discount cap field only once a per-liter discount is entered,
    // and surface what was saved.
    const hasDisc = (Number(discEl.value)||0) > 0;
    document.getElementById('f-discount-max-field').hidden = !hasDisc;
    const hintEl = document.getElementById('f-discount-hint');
    const saved = discountSaved(l, discEl.value, discMaxEl.value);
    if(hasDisc && saved > 0){ hintEl.hidden = false; hintEl.textContent = `You saved ${fmtMoney(saved)} on this fill-up.`; }
    else { hintEl.hidden = true; }
    validateForm();
  }
  litersEl.addEventListener('input', recalcTotal);
  priceEl.addEventListener('input', recalcTotal);
  discEl.addEventListener('input', recalcTotal);
  discMaxEl.addEventListener('input', recalcTotal);
  totalEl.addEventListener('input', validateForm);
  document.getElementById('f-station').addEventListener('input', validateForm);
  document.getElementById('f-station').addEventListener('input', applyStationDiscount);

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
    const existing = editingId ? allFills.find(d=>d.id===editingId) : null;
    const record = {
      id: editingId || uid(),
      // Editing keeps the fill-up on its original vehicle; new ones land on
      // whichever vehicle is currently selected.
      vehicleId: (existing && existing.vehicleId) || settings.activeVehicleId,
      date: fromLocalInputValue(document.getElementById('f-date').value).toISOString(),
      station: document.getElementById('f-station').value.trim(),
      location: document.getElementById('f-location').value.trim(),
      grade: document.getElementById('f-grade').value,
      fullTank: document.getElementById('f-full').checked,
      liters, pricePerLiter: price, totalCost: total,
      odometer: odoRaw === '' ? null : parseFloat(odoRaw),
      discountPerLiter: (Number(discEl.value)||0) || null,
      discountMaxLiters: (discMaxEl.value !== '' && !isNaN(Number(discMaxEl.value))) ? Number(discMaxEl.value) : null,
      notes: document.getElementById('f-notes').value.trim(),
    };
    if(editingId){
      const idx = allFills.findIndex(d=>d.id===editingId);
      allFills[idx] = record;
    } else {
      allFills.push(record);
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
      allFills = allFills.filter(d=>d.id!==editingId);
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
    const defGrade = settings.defaultGrade || 'Regular';
    const defDiscount = settings.defaultDiscountPerLiter || '';
    const defDiscountMax = settings.defaultDiscountMaxLiters || '';
    const defDiscountStation = settings.defaultDiscountStation || '';
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
          <label>Default Grade</label>
          <select id="s-default-grade">${Object.keys(GRADE_META).map(g=>`<option value="${g}" ${g===defGrade?'selected':''}>${g}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Discount Station</label>
          <input type="text" id="s-default-discount-station" placeholder="any station" value="${escapeHtml(defDiscountStation)}" autocomplete="off" autocapitalize="words">
        </div>
        <div class="field">
          <label>Default Discount / L</label>
          <input type="number" inputmode="decimal" id="s-default-discount" placeholder="e.g. 0.03" value="${defDiscount}">
        </div>
        <div class="field">
          <label>Default Up to (L)</label>
          <input type="number" inputmode="decimal" id="s-default-discount-max" placeholder="all liters" value="${defDiscountMax}">
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
      <div class="hint">Both include fuel fill-ups and service/mods. CSV downloads two files (fuel and service); Excel puts them on separate tabs. Read-only \u2014 for viewing or archiving in Excel, Numbers, or Google Sheets. To edit and re-import, use Export backup (JSON).</div>
    `;

    // Apply choices immediately so they always stick.
    document.getElementById('s-currency').addEventListener('change', (e)=>{
      settings.currency = e.target.value || 'USD'; saveSettings(); showToast('Currency updated');
    });
    document.getElementById('s-distance').addEventListener('change', (e)=>{
      settings.distanceUnit = e.target.value || 'km'; saveSettings();
    });
    document.getElementById('s-default-grade').addEventListener('change', (e)=>{
      settings.defaultGrade = e.target.value || 'Regular'; saveSettings(); showToast('Default grade updated');
    });
    document.getElementById('s-default-discount-station').addEventListener('change', (e)=>{
      settings.defaultDiscountStation = e.target.value.trim(); saveSettings();
    });
    document.getElementById('s-default-discount').addEventListener('change', (e)=>{
      const v = Number(e.target.value)||0; settings.defaultDiscountPerLiter = v>0 ? v : null; saveSettings();
    });
    document.getElementById('s-default-discount-max').addEventListener('change', (e)=>{
      const v = e.target.value; settings.defaultDiscountMaxLiters = (v!=='' && !isNaN(Number(v))) ? Number(v) : null; saveSettings();
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
    const payload = { data: allFills, settings, vehicles, service: allService, intervals: allIntervals };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
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
    const headers = ['Vehicle','Date','Station','Location','Grade','Full Tank','Liters',
      `Price/Liter (${cur})`, `Total Cost (${cur})`, `Discount Saved (${cur})`, `Odometer (${distUnit})`, 'Notes'];
    // Every vehicle, grouped together and each in date order -- so the sheet
    // reads as one block per car rather than an interleaved jumble.
    const rows = allFills.slice()
      .sort((a,b)=>
        vehicleName(a.vehicleId).localeCompare(vehicleName(b.vehicleId))
        || new Date(a.date) - new Date(b.date))
      .map(r=>[
        vehicleName(r.vehicleId),
        fmtDateForSheet(r.date),
        r.station || '',
        r.location || '',
        r.grade || '',
        r.fullTank ? 'Yes' : 'No',
        Number(r.liters) || 0,
        Number(r.pricePerLiter) || 0,
        Number(r.totalCost) || 0,
        discountSaved(r.liters, r.discountPerLiter, r.discountMaxLiters),
        (r.odometer === null || r.odometer === undefined) ? '' : Number(r.odometer),
        r.notes || '',
      ]);
    return {headers, rows};
  }

  // Service + modification records for every vehicle, for the Excel "Service"
  // tab. Grouped by vehicle then date, mirroring the fuel sheet's ordering.
  function serviceRows(){
    const cur = settings.currency || 'USD';
    const distUnit = settings.distanceUnit === 'mi' ? 'mi' : 'km';
    const headers = ['Vehicle','Type','Done by','Shop','Title','Item','Part',`Cost (${cur})`,`Odometer (${distUnit})`,'Date','Notes'];
    // One row per item, so per-item spend is pivotable in the spreadsheet.
    const rows = [];
    allService.slice()
      .sort((a,b)=>
        vehicleName(a.vehicleId).localeCompare(vehicleName(b.vehicleId))
        || new Date(a.date) - new Date(b.date))
      .forEach(s=>{
        const odo = (s.odometer === null || s.odometer === undefined || s.odometer === '') ? '' : Number(s.odometer);
        const doneBy = s.doneBy === 'shop' ? 'Shop' : s.doneBy === 'diy' ? 'DIY' : '';
        serviceItems(s).forEach(it=>{
          rows.push([
            vehicleName(s.vehicleId),
            s.kind === 'mod' ? 'Modification' : 'Maintenance',
            doneBy,
            s.doneBy === 'shop' ? (s.shop || '') : '',
            s.title || '',
            it.title,
            (it.parts||[]).map(p=>p.name).filter(Boolean).join('; '),
            Number(it.cost) || 0,
            odo,
            fmtDateForSheet(s.date),
            s.notes || '',
          ]);
        });
      });
    return {headers, rows};
  }

  // Serialize a {headers, rows} table to CSV text. numericCols maps a 0-based
  // column index to a fixed decimal count; everything else is written as-is.
  function tableToCsv(headers, rows, numericCols){
    const csvEscape = (v)=>{
      const s = String(v);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    };
    return [headers, ...rows.map(r=>r.map((v,i)=>
        (i in numericCols) ? Number(v).toFixed(numericCols[i]) : v))]
      .map(row=>row.map(csvEscape).join(','))
      .join('\r\n');
  }

  function exportCSV(){
    if(!allFills.length && !allService.length){ showToast('Nothing to export'); return; }
    const stamp = new Date().toISOString().slice(0,10);
    let count = 0;

    // Fuel CSV. Numeric columns derived from headers so a new column can't shift
    // the formatting onto the wrong one.
    if(allFills.length){
      const { headers, rows } = sheetRows();
      const numeric = {};
      numeric[headers.indexOf('Liters')] = 2;
      numeric[headers.findIndex(h=>h.startsWith('Price/Liter'))] = 3;
      numeric[headers.findIndex(h=>h.startsWith('Total Cost'))] = 2;
      numeric[headers.findIndex(h=>h.startsWith('Discount Saved'))] = 2;
      const csv = tableToCsv(headers, rows, numeric);
      // Leading BOM so Excel opens UTF-8 CSVs without mangling accented characters.
      downloadBlob(new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'}),
        `fuel-tracker-fuel-${stamp}.csv`);
      count++;
    }

    // Service & mods CSV (all vehicles), matching the Excel second tab.
    if(allService.length){
      const { headers, rows } = serviceRows();
      const numeric = {};
      numeric[headers.findIndex(h=>h.startsWith('Cost'))] = 2;
      const csv = tableToCsv(headers, rows, numeric);
      downloadBlob(new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8'}),
        `fuel-tracker-service-${stamp}.csv`);
      count++;
    }

    showToast(count > 1 ? 'Exported 2 CSV files' : 'Spreadsheet exported (CSV)');
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

  // Build one worksheet's XML from headers + rows. styleForCol maps a 0-based
  // column index to a cell style id (2=2dp, 3=3dp, 4=integer); everything else
  // is inline text. Row 1 is the bold frozen header with an autofilter.
  function worksheetXml(headers, rows, colWidths, styleForCol){
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

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
  <autoFilter ref="A1:${lastCol}1"/>
</worksheet>`;
  }

  function exportXLSX(){
    if(!allFills.length && !allService.length){ showToast('Nothing to export'); return; }

    // --- Sheet 1: Fill-ups ---
    const fuel = sheetRows();
    const fuelStyle = {};
    fuelStyle[fuel.headers.indexOf('Liters')] = 2;
    fuelStyle[fuel.headers.findIndex(h=>h.startsWith('Price/Liter'))] = 3;
    fuelStyle[fuel.headers.findIndex(h=>h.startsWith('Total Cost'))] = 2;
    fuelStyle[fuel.headers.findIndex(h=>h.startsWith('Discount Saved'))] = 2;
    fuelStyle[fuel.headers.findIndex(h=>h.startsWith('Odometer'))] = 4;
    const fuelSheet = worksheetXml(fuel.headers, fuel.rows, [18,14,20,22,12,10,10,16,14,16,14,32], fuelStyle);

    // --- Sheet 2: Service & mods ---
    const svc = serviceRows();
    const svcStyle = {};
    svcStyle[svc.headers.findIndex(h=>h.startsWith('Cost'))] = 2;
    svcStyle[svc.headers.findIndex(h=>h.startsWith('Odometer'))] = 4;
    const svcSheet = worksheetXml(svc.headers, svc.rows, [18,14,10,18,22,22,24,14,14,14,32], svcStyle);

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
  <sheets><sheet name="Fill-ups" sheetId="1" r:id="rId1"/><sheet name="Maintenance &amp; Mods" sheetId="2" r:id="rId3"/></sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
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
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const blob = makeZip([
      { name: '[Content_Types].xml', text: contentTypesXml },
      { name: '_rels/.rels', text: rootRelsXml },
      { name: 'xl/workbook.xml', text: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', text: workbookRelsXml },
      { name: 'xl/styles.xml', text: stylesXml },
      { name: 'xl/worksheets/sheet1.xml', text: fuelSheet },
      { name: 'xl/worksheets/sheet2.xml', text: svcSheet },
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

      allFills = incoming.map(r=>({
        id: r.id || uid(),
        vehicleId: r.vehicleId || null,   // reconciled by ensureVehicles() below
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
      // Backups predating multi-vehicle support have no `vehicles` array and no
      // vehicleId on their fill-ups. Take the file's vehicles when present;
      // otherwise ensureVehicles() creates one and adopts the orphaned fill-ups.
      vehicles = (parsed && Array.isArray(parsed.vehicles) && parsed.vehicles.length)
        ? parsed.vehicles.map(v=>({ id: v.id || newId('v_'), name: String(v.name || 'My Car') }))
        : [];
      // Service log and intervals: take them if the backup has them, else empty.
      // ensureVehicles() then reconciles orphans and seeds default intervals for
      // any vehicle missing them (e.g. an old backup with no service section).
      allService = (parsed && Array.isArray(parsed.service)) ? parsed.service : [];
      allIntervals = (parsed && Array.isArray(parsed.intervals)) ? parsed.intervals : [];
      saveVehicles(); saveService(); saveIntervals();
      ensureVehicles();
      save(); saveSettings(); saveVehicles(); saveService(); saveIntervals();
      document.querySelector('.tab-btn[data-tab="dashboard"]').click();
      showToast(`Imported ${allFills.length} fill-up${allFills.length===1?'':'s'}`);
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
  // Also serves as a prompt: pass `input:true` and it resolves to the trimmed
  // string (or false if cancelled). Native prompt() is as unreliable as
  // confirm() in home-screen PWAs, so we reuse this dialog rather than add one.
  function confirmDialog(message, { title='Are you sure?', confirmText='Confirm', destructive=false, input=false, value='', placeholder='' } = {}){
    return new Promise(resolve=>{
      const backdrop = document.getElementById('dialog-backdrop');
      const confirmBtn = document.getElementById('dialog-confirm');
      const cancelBtn = document.getElementById('dialog-cancel');
      const inputEl = document.getElementById('dialog-input');
      document.getElementById('dialog-title').textContent = title;
      document.getElementById('dialog-message').textContent = message;
      confirmBtn.textContent = confirmText;
      confirmBtn.classList.toggle('destructive', destructive);

      inputEl.hidden = !input;
      if(input){
        inputEl.value = value;
        inputEl.placeholder = placeholder;
        confirmBtn.disabled = !value.trim();
      } else {
        confirmBtn.disabled = false;
      }

      function onInput(){ confirmBtn.disabled = !inputEl.value.trim(); }
      function onKey(e){ if(e.key === 'Enter' && !confirmBtn.disabled) onConfirm(); }

      function cleanup(result){
        backdrop.classList.remove('open');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        backdrop.removeEventListener('click', onBackdrop);
        inputEl.removeEventListener('input', onInput);
        inputEl.removeEventListener('keydown', onKey);
        confirmBtn.disabled = false;
        inputEl.hidden = true;
        resolve(result);
      }
      function onConfirm(){ cleanup(input ? inputEl.value.trim() : true); }
      function onCancel(){ cleanup(false); }
      function onBackdrop(e){ if(e.target === backdrop) cleanup(false); }

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      backdrop.addEventListener('click', onBackdrop);
      if(input){
        inputEl.addEventListener('input', onInput);
        inputEl.addEventListener('keydown', onKey);
      }
      backdrop.classList.add('open');
      if(input) setTimeout(()=>inputEl.focus(), 50);
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
