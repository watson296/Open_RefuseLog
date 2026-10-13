const ROLE = document.body.dataset.role || 'emt';
const STORAGE_KEY = 'refuselog-osm-v4-state';
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('refuselog-osm-v4') : null;

const refusalCats = {
  A: { label: '의료 자원 부족', items: [{ c: 'A-1', l: '응급실 병상 포화' }, { c: 'A-2', l: '해당 전문의 부재' }, { c: 'A-3', l: '수술실 사용 불가' }, { c: 'A-4', l: '의료 장비 부족' }, { c: 'A-5', l: '중환자실 만실' }, { c: 'A-6', l: '의료진 전체 부족' }] },
  B: { label: '시설·인프라', items: [{ c: 'B-1', l: '전력·통신 마비' }, { c: 'B-2', l: '화재·붕괴' }, { c: 'B-3', l: '시설 공사 중' }] },
  C: { label: '환자 상태', items: [{ c: 'C-1', l: '중증도 초과' }, { c: 'C-2', l: '해당 진료과 없음' }, { c: 'C-3', l: '소아과 부재' }, { c: 'C-4', l: '비응급 판단' }] },
  D: { label: '보호자·환자', items: [{ c: 'D-1', l: '보호자 없음' }, { c: 'D-2', l: '폭행·협박' }, { c: 'D-3', l: '치료 거부' }] },
  E: { label: '기타', items: [{ c: 'E-1', l: '직접 입력' }] },
};
const SL = { submitted: '본부 대기', dispatched: '지령 완료', accepted: '병원 수락', refused: '병원 거절', arrived: '도착 완료', cancelled: '초기화됨' };
const $ = (id) => document.getElementById(id);

let map;
let infoWindow;
let markers = [];
let polylines = [];
let circles = [];
let routeRenderToken = 0;
let geoWatchId = null;
let syncTimer = null;
let hospitalTimer = null;
let mapsLoadPromise = null;
let runtimeSyncPromise = null;
let runtimePushTimer = null;
let lastRuntimeSignature = '';
const HOSPITAL_REFRESH_MS = 2 * 60 * 1000; // 2분
let lastLocationPushAt = 0;
const routeCache = new Map();

const state = loadState();
if (!Array.isArray(state.requests)) state.requests = [];
if (!Array.isArray(state.logs)) state.logs = [];
if (!state.auth) state.auth = { emt: null, hq: null };
if (!state.ui) state.ui = {};
if (!state.ui.routeMeta) state.ui.routeMeta = {};
if (!state.ui.lastFocusedRequestId) state.ui.lastFocusedRequestId = null;

init();

function loadState() {
  const defaults = {
    config: null,
    stage1: '부산광역시',
    stage2: '해운대구',
    hospitals: [],
    selectedHospitalId: null,
    requests: [],
    selectedRequestId: null,
    logs: [],
    myLocation: null,
    hospitalSession: null,
    auth: { emt: null, hq: null },
    source: 'unknown',
    emtDraft: null,
    pendingRefusalHospitalId: null,
    pendingRefusalRequestId: null,
    ui: { routeMeta: {}, lastFocusedRequestId: null },
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

function save({ broadcast = true } = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (broadcast) channel?.postMessage({ type: 'sync', state });
  } catch {}
}

channel?.addEventListener('message', (e) => {
  if (e.data?.type !== 'sync') return;
  const incoming = e.data.state || {};
  state.selectedHospitalId = incoming.selectedHospitalId ?? state.selectedHospitalId;
  state.selectedRequestId = incoming.selectedRequestId ?? state.selectedRequestId;
  state.requests = Array.isArray(incoming.requests) ? incoming.requests : state.requests;
  state.logs = Array.isArray(incoming.logs) ? incoming.logs : state.logs;
  state.hospitals = Array.isArray(incoming.hospitals) ? incoming.hospitals : state.hospitals;
  state.source = incoming.source || state.source;
  state.myLocation = incoming.myLocation || state.myLocation;
  state.stage1 = incoming.stage1 || state.stage1;
  state.stage2 = incoming.stage2 || state.stage2;
  if (!(ROLE === 'emt' && editing())) render();
  renderMap(false);
});

window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY || !e.newValue) return;
  try {
    const incoming = JSON.parse(e.newValue);
    state.requests = Array.isArray(incoming.requests) ? incoming.requests : state.requests;
    state.logs = Array.isArray(incoming.logs) ? incoming.logs : state.logs;
    state.hospitals = Array.isArray(incoming.hospitals) ? incoming.hospitals : state.hospitals;
    state.selectedRequestId = incoming.selectedRequestId ?? state.selectedRequestId;
    state.selectedHospitalId = incoming.selectedHospitalId ?? state.selectedHospitalId;
    if (!(ROLE === 'emt' && editing())) render();
    renderMap(false);
  } catch {}
});

async function init() {
  if (!isAuth(ROLE)) {
    window.location.href = '/login';
    return;
  }
  highlightTabs();
  wireEvents();
  initRefusal();
  await loadConfig();
  updateRegionLabel();
  await ensureGoogleMapsLoaded();
  await initMap();
  await loadRemoteState();
  await detectLoc({ focus: true, updateRegion: false });
  await refreshHospitals(false);
  render();
  await renderMap(true);
  startLocationWatch();
  startSyncLoop();
  startHospitalRefreshLoop();
}

function wireEvents() {
  $('loadHospitalsBtn')?.addEventListener('click', () => refreshHospitals(true));
  $('resetRegionBtn')?.addEventListener('click', async () => {
    state.stage1 = state.config?.defaults?.stage1 || '부산광역시';
    state.stage2 = state.config?.defaults?.stage2 || '해운대구';
    updateRegionLabel();
    save();
    await refreshHospitals(true);
  });
  $('currentLocationBtn')?.addEventListener('click', useCurLoc);
  $('exportStateBtn')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = 'refuselog.json';
    a.click();
  });
  $('closeRefusalBtn')?.addEventListener('click', () => $('refusalModal')?.classList.add('hidden'));
  $('saveRefusalBtn')?.addEventListener('click', saveRefusal);
  $('clearDataBtn')?.addEventListener('click', async () => {
    if (!confirm('모든 요청/로그 데이터를 초기화하시겠습니까?')) return;
    state.requests = [];
    state.logs = [];
    state.selectedRequestId = null;
    state.selectedHospitalId = null;
    state.emtDraft = null;
    save();
    await persistRuntime();
    render();
    await renderMap(true);
  });
}

function initRefusal() {
  const c = $('refusalCategory');
  if (!c) return;
  c.innerHTML = Object.entries(refusalCats).map(([k, v]) => `<option value="${k}">${k}·${v.label}</option>`).join('');
  c.addEventListener('change', fillSub);
  $('refusalSubcategory')?.addEventListener('change', () => $('refusalWarning')?.classList.toggle('show', $('refusalSubcategory').value === 'D-1'));
  fillSub();
}

function fillSub() {
  const c = refusalCats[$('refusalCategory')?.value] || refusalCats.A;
  const s = $('refusalSubcategory');
  if (s) s.innerHTML = c.items.map((i) => `<option value="${i.c}">${i.c}·${i.l}</option>`).join('');
}

function isAuth(role = ROLE) {
  return role === 'hospital' ? Boolean(state.hospitalSession?.hospitalId) : Boolean(state.auth?.[role]?.loginId);
}

function logout() {
  if (geoWatchId != null) navigator.geolocation?.clearWatch?.(geoWatchId);
  if (ROLE === 'hospital') state.hospitalSession = null;
  else state.auth[ROLE] = null;
  if (ROLE === 'emt') state.emtDraft = null;
  save();
  window.location.href = '/login';
}

function highlightTabs() {
  document.querySelectorAll('[data-role-link]').forEach((l) => l.classList.toggle('active', l.dataset.roleLink === ROLE));
}

function editing() {
  const a = document.activeElement;
  return a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName) && a.closest('#rolePanel');
}

function updateRegionLabel() {
  const el = $('regionLabel');
  if (el) el.textContent = `${state.stage1} ${state.stage2}`;
}

async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    state.config = await r.json();
    state.stage1 ||= state.config.defaults.stage1;
    state.stage2 ||= state.config.defaults.stage2;
  } catch {
    state.config = { defaults: { stage1: '부산광역시', stage2: '해운대구', centerLat: 35.1631, centerLon: 129.1635 }, googleMapsKey: '', googleMapId: 'DEMO_MAP_ID' };
  }
}

async function ensureGoogleMapsLoaded() {
  if (window.google?.maps?.importLibrary) return;
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    const key = state.config?.googleMapsKey;
    if (!key) {
      reject(new Error('Google Maps API key 없음'));
      return;
    }
    window.__refuseLogGoogleReady = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker&loading=async&callback=__refuseLogGoogleReady`;
    script.async = true;
    script.onerror = () => reject(new Error('Google Maps 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

async function initMap() {
  const el = $('map');
  if (!el) return;
  await ensureGoogleMapsLoaded();
  const { Map, InfoWindow } = await google.maps.importLibrary('maps');
  await google.maps.importLibrary('marker');
  map = new Map(el, {
    center: { lat: state.config?.defaults?.centerLat || 35.1631, lng: state.config?.defaults?.centerLon || 129.1635 },
    zoom: 12,
    mapId: state.config?.googleMapId || 'DEMO_MAP_ID',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  infoWindow = new InfoWindow();
}

function clearMap() {
  markers.forEach((m) => { try { m.map = null; } catch {} });
  polylines.forEach((p) => { try { p.setMap(null); } catch {} });
  circles.forEach((c) => { try { c.setMap(null); } catch {} });
  markers = [];
  polylines = [];
  circles = [];
}

function addMarker({ lat, lng, glyph = '', title = '', background = '#2563eb', border = '#ffffff', scale = 1.0, onClick = null, zIndex = 0 }) {
  if (!map || !isFinite(lat) || !isFinite(lng)) return null;
  const pin = new google.maps.marker.PinElement({ background, borderColor: border, glyphColor: '#fff', glyphText: glyph, scale });
  const marker = new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat, lng },
    title,
    content: pin.element,
    zIndex,
  });
  if (onClick) marker.addListener('click', onClick);
  markers.push(marker);
  return marker;
}

function addCircle(lat, lng, radius, strokeColor = '#2563eb') {
  if (!map || !isFinite(lat) || !isFinite(lng)) return;
  const circle = new google.maps.Circle({
    map,
    center: { lat, lng },
    radius,
    strokeColor,
    strokeOpacity: 0.65,
    strokeWeight: 2,
    fillOpacity: 0,
  });
  circles.push(circle);
}

async function renderMap(fit = false) {
  if (!map || !isAuth(ROLE)) return;
  const token = ++routeRenderToken;
  clearMap();

  const req = activeReq();
  const ownHospital = ROLE === 'hospital' ? hById(state.hospitalSession?.hospitalId) : null;
  const livePos = reqLivePos(req);
  const previewHospital = getPreviewHospital(req);
  const bounds = new google.maps.LatLngBounds();
  let hasBounds = false;

  if (state.myLocation?.lat && state.myLocation?.lon) {
    addMarker({
      lat: state.myLocation.lat,
      lng: state.myLocation.lon,
      glyph: ROLE === 'hospital' ? '나' : '나',
      title: '내 위치',
      background: '#2563eb',
      border: '#ffffff',
      scale: 0.95,
      zIndex: 10,
    });
    bounds.extend({ lat: state.myLocation.lat, lng: state.myLocation.lon });
    hasBounds = true;
  }

  const ranked = recList(req);
  ranked.forEach((h, i) => {
    if (!isFinite(h.wgs84Lat) || !isFinite(h.wgs84Lon)) return;
    const isSelected = state.selectedHospitalId === h.id;
    const isAssigned = req?.assignedHospitalId === h.id;
    const top3 = i < 3;
    const glyph = isAssigned ? '지' : top3 ? String(i + 1) : '병';
    const background = isAssigned ? '#1d4ed8' : isSelected ? '#7c3aed' : '#0f766e';
    const border = top3 ? '#ffffff' : '#bae6fd';
    addMarker({
      lat: h.wgs84Lat,
      lng: h.wgs84Lon,
      glyph,
      title: `${h.dutyName} (${h.dutyEmclsName || 'API 병원'})`,
      background,
      border,
      scale: isAssigned ? 1.15 : isSelected ? 1.05 : 0.9,
      zIndex: isAssigned ? 50 : isSelected ? 40 : 20,
      onClick: () => selectHosp(h.id),
    });
    if (isSelected || isAssigned) addCircle(h.wgs84Lat, h.wgs84Lon, isAssigned ? 350 : 220, isAssigned ? '#1d4ed8' : '#7c3aed');
    bounds.extend({ lat: h.wgs84Lat, lng: h.wgs84Lon });
    hasBounds = true;
  });

  if (ownHospital && isFinite(ownHospital.wgs84Lat) && isFinite(ownHospital.wgs84Lon)) {
    addMarker({ lat: ownHospital.wgs84Lat, lng: ownHospital.wgs84Lon, glyph: '병', title: ownHospital.dutyName, background: '#059669', border: '#ffffff', scale: 1.1, zIndex: 60 });
    bounds.extend({ lat: ownHospital.wgs84Lat, lng: ownHospital.wgs84Lon });
    hasBounds = true;
  }

  if (req && livePos) {
    addMarker({
      lat: livePos.lat,
      lng: livePos.lon,
      glyph: '구',
      title: req.ambulanceLabel || '구급차',
      background: '#dc2626',
      border: '#ffffff',
      scale: 1.1,
      zIndex: 80,
    });
    bounds.extend({ lat: livePos.lat, lng: livePos.lon });
    hasBounds = true;
  }

  if (req && previewHospital && livePos && isFinite(previewHospital.wgs84Lat) && isFinite(previewHospital.wgs84Lon)) {
    const route = await getRoute(livePos, { lat: previewHospital.wgs84Lat, lng: previewHospital.wgs84Lon });
    if (token !== routeRenderToken || !route) return;
    const path = route.path.map((p) => ({ lat: p.lat, lng: p.lng }));
    const polyline = new google.maps.Polyline({
      map,
      path,
      geodesic: false,
      strokeColor: req.assignedHospitalId === previewHospital.id ? '#1d4ed8' : '#7c3aed',
      strokeOpacity: 0.9,
      strokeWeight: req.assignedHospitalId === previewHospital.id ? 6 : 5,
    });
    polylines.push(polyline);
    path.forEach((p) => bounds.extend(p));
    hasBounds = true;
  }

  if (!fit) return;

  if (!state.ui.didInitialLocationFocus && state.myLocation?.lat && state.myLocation?.lon) {
    map.setCenter({ lat: state.myLocation.lat, lng: state.myLocation.lon });
    map.setZoom(13);
    state.ui.didInitialLocationFocus = true;
    save({ broadcast: false });
    return;
  }

  if (ROLE === 'emt' && state.selectedHospitalId) {
    const h = hById(state.selectedHospitalId);
    if (h && isFinite(h.wgs84Lat) && isFinite(h.wgs84Lon)) {
      map.setCenter({ lat: h.wgs84Lat, lng: h.wgs84Lon });
      map.setZoom(14);
      return;
    }
  }

  if (hasBounds && !bounds.isEmpty()) {
    if (state.myLocation?.lat && !req && ROLE !== 'hospital') {
      map.setCenter({ lat: state.myLocation.lat, lng: state.myLocation.lon });
      map.setZoom(13);
      return;
    }
    map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
    return;
  }

  if (state.myLocation?.lat && state.myLocation?.lon) {
    map.setCenter({ lat: state.myLocation.lat, lng: state.myLocation.lon });
    map.setZoom(13);
  }
}

async function detectLoc({ focus = false, updateRegion = false } = {}) {
  if (!navigator.geolocation) return;
  await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await onLocationUpdate(pos.coords.latitude, pos.coords.longitude, { focus, updateRegion });
        resolve();
      },
      () => resolve(),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 },
    );
  });
}

function startLocationWatch() {
  if (!navigator.geolocation) return;
  if (geoWatchId != null) navigator.geolocation.clearWatch(geoWatchId);
  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => onLocationUpdate(pos.coords.latitude, pos.coords.longitude, { focus: false, updateRegion: false, fromWatch: true }),
    () => {},
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
  );
}

async function onLocationUpdate(lat, lon, { focus = false, updateRegion = false, fromWatch = false } = {}) {
  if (!isFinite(lat) || !isFinite(lon)) return;
  const prev = state.myLocation;
  const moved = !prev || haversine(prev.lat, prev.lon, lat, lon) >= 0.01;
  state.myLocation = { lat, lon };

  let reqChanged = false;
  if (ROLE === 'emt' && isAuth('emt')) {
    const req = activeReq();
    if (req) {
      req.currentLat = lat;
      req.currentLon = lon;
      req.currentLocationUpdatedAt = new Date().toISOString();
      if (!isFinite(req.originLat) || !isFinite(req.originLon)) {
        req.originLat = lat;
        req.originLon = lon;
      }
      const assigned = hById(req.assignedHospitalId);
      if (assigned && isFinite(assigned.wgs84Lat) && isFinite(assigned.wgs84Lon)) {
        const remainKm = haversine(lat, lon, assigned.wgs84Lat, assigned.wgs84Lon);
        if (remainKm !== null && remainKm <= 0.08 && req.status !== 'arrived') {
          req.status = 'arrived';
          req.arrivedAt = new Date().toISOString();
          state.emtDraft = null;
          log(`${req.ambulanceLabel || '구급차'} → ${assigned.dutyName} 도착`);
        }
      }
      req.updatedAt = new Date().toISOString();
      upsert(req);
      reqChanged = true;
    }
  }

  save({ broadcast: true });

  if (updateRegion) {
    try {
      const r = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
      const d = await r.json();
      if (d.ok) {
        state.stage1 = d.stage1 || state.stage1;
        state.stage2 = d.stage2 || state.stage2;
        updateRegionLabel();
        save({ broadcast: true });
      }
    } catch {}
  }

  if (reqChanged && (Date.now() - lastLocationPushAt > 2500)) {
    lastLocationPushAt = Date.now();
    scheduleRuntimePush();
  }

  if (!(ROLE === 'emt' && editing()) && (moved || focus || fromWatch)) {
    render();
    renderMap(Boolean(focus));
  }
}

async function useCurLoc() {
  await detectLoc({ focus: true, updateRegion: true });
  if (map && state.myLocation?.lat && state.myLocation?.lon) {
    map.setCenter({ lat: state.myLocation.lat, lng: state.myLocation.lon });
    map.setZoom(13);
  }
  await refreshHospitals(true);
}

function runtimeSignature() {
  return JSON.stringify({
    requests: state.requests.map((r) => [r.id, r.status, r.updatedAt, r.currentLat, r.currentLon, r.assignedHospitalId]),
    logs: state.logs.slice(-20),
  });
}

function mergeRuntime(remote) {
  const incomingRequests = Array.isArray(remote.requests) ? remote.requests : [];
  const merged = new Map();
  [...state.requests, ...incomingRequests].forEach((req) => {
    if (!req?.id) return;
    const current = merged.get(req.id);
    const currentTs = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const nextTs = req.updatedAt ? new Date(req.updatedAt).getTime() : 0;
    if (!current || nextTs >= currentTs) merged.set(req.id, req);
  });
  state.requests = [...merged.values()].sort((a, b) => rPri(b) - rPri(a) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const logMap = new Map();
  [...(Array.isArray(remote.logs) ? remote.logs : []), ...state.logs].forEach((l) => {
    const key = `${l.time || ''}|${l.message || ''}`;
    if (!logMap.has(key)) logMap.set(key, l);
  });
  state.logs = [...logMap.values()].slice(-80);
  if (state.selectedRequestId && !state.requests.some((r) => r.id === state.selectedRequestId)) state.selectedRequestId = null;
  if (!state.selectedRequestId && state.requests[0]) state.selectedRequestId = state.requests[0].id;
  save({ broadcast: true });
}

async function loadRemoteState() {
  if (runtimeSyncPromise) return runtimeSyncPromise;
  runtimeSyncPromise = (async () => {
    try {
      const r = await fetch('/api/runtime');
      const d = await r.json();
      if (d.ok) mergeRuntime(d);
      lastRuntimeSignature = runtimeSignature();
    } catch {}
    finally { runtimeSyncPromise = null; }
  })();
  return runtimeSyncPromise;
}

function scheduleRuntimePush() {
  clearTimeout(runtimePushTimer);
  runtimePushTimer = setTimeout(() => persistRuntime(), 300);
}

async function markArrived() {
  const req = activeReq();
  if (!req || !['dispatched', 'accepted'].includes(req.status)) return;
  const hospitalName = hById(req.assignedHospitalId)?.dutyName || '병원';
  if (!confirm(`'${hospitalName}' 도착으로 처리할까요?`)) return;
  req.status = 'arrived';
  req.arrivedAt = new Date().toISOString();
  req.updatedAt = new Date().toISOString();
  state.emtDraft = null;
  upsert(req);
  log(`${req.ambulanceLabel || '구급차'} → ${hospitalName} 도착 (수동)`);
  save();
  await persistRuntime();
  render();
  await renderMap(true);
}

async function resetDispatch() {
  const req = activeReq();
  if (!req || !req.assignedHospitalId) return;
  const hospitalName = hById(req.assignedHospitalId)?.dutyName || '병원';
  if (!confirm(`'${hospitalName}' 지령을 초기화할까요?\n현재 경로와 지정 병원이 삭제됩니다.`)) return;
  req.assignedHospitalId = null;
  req.status = 'cancelled';
  delete req.dispatchedAt;
  req.updatedAt = new Date().toISOString();
  state.selectedHospitalId = null;
  state.emtDraft = null;
  upsert(req);
  log(`${req.ambulanceLabel || '요청'} 지령 초기화 (${hospitalName})`);
  save();
  await persistRuntime();
  render();
  await renderMap(true);
}

async function persistRuntime() {
  try {
    const r = await fetch('/api/runtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: state.requests, logs: state.logs }),
    });
    const d = await r.json();
    if (d.ok) mergeRuntime(d);
    lastRuntimeSignature = runtimeSignature();
  } catch {}
}

function startSyncLoop() {
  clearInterval(syncTimer);
  syncTimer = setInterval(async () => {
    const before = runtimeSignature();
    await loadRemoteState();
    const after = runtimeSignature();
    if (before !== after) {
      if (!(ROLE === 'emt' && editing())) render();
      await renderMap(false);
    }
  }, ROLE === 'hq' ? 2000 : 3000);
}

function startHospitalRefreshLoop() {
  clearInterval(hospitalTimer);
  hospitalTimer = setInterval(async () => {
    await refreshHospitals(false);
  }, HOSPITAL_REFRESH_MS);
}

async function refreshHospitals(toast = false) {
  if (ROLE === 'emt' && isAuth('emt')) captureDraft();
  const req = activeReq();
  const live = reqLivePos(req) || state.myLocation;
  const p = new URLSearchParams({ stage1: state.stage1, stage2: state.stage2 });
  if (req?.ktas) p.set('ktas', req.ktas);
  if (req?.specialty) p.set('specialty', req.specialty);
  if (live?.lat) {
    p.set('userLat', live.lat);
    p.set('userLon', live.lon);
  }
  try {
    const r = await fetch(`/api/hospitals?${p.toString()}`);
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || '응급실 로드 실패');
    state.hospitals = d.hospitals || [];
    state.source = d.source || 'nemc-live';
    syncSelectedHospital();
    await hydrateTop3Travel(req);
    const badge = $('sourceBadge');
    if (badge) {
      badge.textContent = d.source || '-';
      badge.className = `pill ${String(d.source).includes('mock') ? 'warn' : 'success'}`;
    }
    if (toast) log(`응급실 ${state.hospitals.length}곳 로드`);
    save({ broadcast: true });
    render();
    await renderMap(true);
  } catch (error) {
    state.hospitals = [];
    save({ broadcast: true });
    render();
    await renderMap(false);
    log(`오류: ${error.message}`);
  }
}

async function hydrateTop3Travel(req) {
  const origin = reqLivePos(req) || state.myLocation;
  if (!origin) return;
  const top = recList(req).slice(0, 3);
  await Promise.all(top.map(async (h) => {
    if (!isFinite(h.wgs84Lat) || !isFinite(h.wgs84Lon)) return;
    const route = await getRoute(origin, { lat: h.wgs84Lat, lng: h.wgs84Lon });
    if (!route) return;
    h.travelLive = { durationMin: Math.max(1, Math.round(route.durationSec / 60)), distanceKm: (route.distanceMeters / 1000).toFixed(1) };
  }));
}

async function getRoute(origin, destination) {
  if (!origin || !destination) return null;
  const key = routeKey(origin, destination);
  const cached = routeCache.get(key);
  if (cached && (Date.now() - cached.fetchedAt < 45000)) return cached;
  try {
    const url = `/api/route?originLat=${encodeURIComponent(origin.lat)}&originLon=${encodeURIComponent(origin.lon || origin.lng)}&destLat=${encodeURIComponent(destination.lat)}&destLon=${encodeURIComponent(destination.lng || destination.lon)}`;
    const r = await fetch(url);
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || 'route error');
    const route = {
      path: Array.isArray(d.path) ? d.path : (d.encodedPolyline ? decodePolyline(d.encodedPolyline) : []),
      distanceMeters: Number(d.distanceMeters || 0),
      durationSec: Number(d.durationSec || 0),
      fetchedAt: Date.now(),
      source: d.source || 'unknown',
    };
    if (!route.path.length) {
      route.path = [{ lat: origin.lat, lng: origin.lon || origin.lng }, { lat: destination.lat, lng: destination.lng || destination.lon }];
    }
    routeCache.set(key, route);
    return route;
  } catch {
    const km = haversine(origin.lat, origin.lon || origin.lng, destination.lat, destination.lng || destination.lon);
    if (km == null) return null;
    const fallback = {
      path: [{ lat: origin.lat, lng: origin.lon || origin.lng }, { lat: destination.lat, lng: destination.lng || destination.lon }],
      distanceMeters: Math.round(km * 1000),
      durationSec: Math.round(Math.max(4, Math.min(45, km * 2.6 + 3)) * 60),
      fetchedAt: Date.now(),
      source: 'fallback',
    };
    routeCache.set(key, fallback);
    return fallback;
  }
}

function routeKey(origin, destination) {
  return [origin.lat, origin.lon, destination.lat, destination.lng].map((v) => Number(v).toFixed(5)).join('|');
}

function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function syncSelectedHospital() {
  if (state.selectedHospitalId && state.hospitals.some((h) => h.id === state.selectedHospitalId)) return;
  const req = activeReq();
  const candidate = req?.assignedHospitalId || req?.preferredHospitalId || state.hospitals[0]?.id || null;
  state.selectedHospitalId = candidate;
}

function render() {
  if (ROLE === 'emt') renderEmt();
  else if (ROLE === 'hq') renderHq();
  else renderHospital();
}

function renderEmt() {
  if (editing()) return;
  const draft = state.emtDraft || {};
  const req = activeReq();
  const assigned = req?.assignedHospitalId ? hById(req.assignedHospitalId) : null;
  const locked = Boolean(req && ['submitted', 'dispatched', 'accepted'].includes(req.status));
  $('rolePanel').innerHTML = `
    <h3>환자 입력</h3>
    ${statusStepHtml(req)}
    <div class="grid2 compact-grid">
      <label>성별<select id="reqSex"><option ${String(draft.sex || '남') === '남' ? 'selected' : ''}>남</option><option ${draft.sex === '여' ? 'selected' : ''}>여</option></select></label>
      <label>나이<input id="reqAge" value="${esc(draft.age || '')}" placeholder="54"></label>
      <label class="span2">현장 위치<input id="reqLocation" value="${esc(draft.location || '')}" placeholder="해운대구 우동"></label>
      <label class="span2">주증상<input id="reqSymptoms" value="${esc(draft.symptoms || '')}" placeholder="흉통, 의식저하"></label>
      <label>KTAS<select id="reqKtas">${[1,2,3,4,5].map((v) => `<option value="${v}" ${String(draft.ktas || '2') === String(v) ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>전문과<select id="reqSpecialty">${['외상','심혈관','소아','신경','내과'].map((v) => `<option value="${v}" ${String(draft.specialty || '외상') === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>혈압<input id="reqBp" value="${esc(draft.bp || '')}" placeholder="120/80"></label>
      <label>맥박<input id="reqHr" value="${esc(draft.hr || '')}" placeholder="80"></label>
      <label>SpO2<input id="reqSpo2" value="${esc(draft.spo2 || '')}" placeholder="98"></label>
      <label class="span2">메모<textarea id="reqMemo" rows="2">${esc(draft.memo || '')}</textarea></label>
    </div>
    <div class="actions" style="margin-top:8px">
      <button id="sendBtn" class="btn ${locked ? 'sent-btn' : 'primary'}" ${locked ? 'disabled' : ''}>${locked ? '전송완료' : '본부 전송'}</button>
      ${locked ? '<button id="newBtn" class="btn primary">새 요청</button>' : '<button id="sampleBtn" class="btn">샘플</button>'}
      <button id="logoutBtn" class="btn">로그아웃</button>
    </div>
    ${locked ? '<div class="status-note success-note">본부 전송 완료</div>' : ''}
    ${assigned && ['dispatched', 'accepted'].includes(req.status) ? `<div class="dispatch-banner"><strong>지령: ${esc(assigned.dutyName)}</strong><div class="small-muted">${SL[req.status] || req.status} · ${travelSummaryText(req)}${req.currentLocationUpdatedAt ? ' · 위치 연동중' : ''}</div><div class="actions" style="margin-top:6px"><button id="arrivedBtn" class="btn success" style="flex:1">도착 처리</button><button id="resetDispatchBtn" class="btn danger" style="flex:1">지령 초기화</button></div></div>` : ''}
    ${req?.status === 'arrived' ? `<div class="status-note success-note">도착 완료 · ${esc(assigned?.dutyName || '병원')} 인계 후 새 환자를 입력하세요</div>` : ''}
  `;

  $('sendBtn')?.addEventListener('click', submitReq);
  $('sampleBtn')?.addEventListener('click', () => fillForm({ sex: '남', age: '54', location: '해운대구 우동', symptoms: '다발성 외상, 의식저하', ktas: '2', specialty: '외상', bp: '88/54', hr: '132', spo2: '91', memo: '교통사고' }));
  $('newBtn')?.addEventListener('click', () => { state.selectedRequestId = null; state.emtDraft = null; save(); render(); refreshHospitals(false); });
  $('logoutBtn')?.addEventListener('click', logout);
  $('arrivedBtn')?.addEventListener('click', markArrived);
  $('resetDispatchBtn')?.addEventListener('click', resetDispatch);
  bindDraft();

  const list = recList(req).slice(0, 3);
  $('listSummary').textContent = `${state.hospitals.length}곳 중 상위 3`;
  $('hospitalList').innerHTML = list.length ? list.map((h, i) => hospitalCardHtml(h, i, false, req)).join('') : '<div class="small-muted">병원 로드중...</div>';
  $('hospitalList').querySelectorAll('[data-sel]').forEach((card) => {
    card.onclick = async (e) => { if (e.target.closest('[data-final]')) return; selectHosp(card.dataset.sel); };
  });
  renderDetail();
  renderLogs();
}

function renderHq() {
  const myRegion = state.region || 'busan';
  const queue = [...state.requests].filter(r => r.status !== 'cancelled' && (!r.region || r.region === myRegion)).sort((a, b) => rPri(b) - rPri(a) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const req = activeReq();
  const assigned = req?.assignedHospitalId ? hById(req.assignedHospitalId) : null;
  $('rolePanel').innerHTML = `
    <h3>관제 요약</h3>
    <div class="mini-stats four">
      <div class="stat"><span>대기</span><strong>${queue.filter((r) => r.status === 'submitted').length}</strong></div>
      <div class="stat"><span>이송중</span><strong>${queue.filter((r) => ['dispatched', 'accepted'].includes(r.status)).length}</strong></div>
      <div class="stat"><span>거절</span><strong>${queue.filter((r) => r.status === 'refused').length}</strong></div>
      <div class="stat"><span>도착완료</span><strong>${queue.filter((r) => r.status === 'arrived').length}</strong></div>
    </div>
    ${req ? `<div class="snapshot" style="margin-top:8px">${snapshotHtml(req)}</div>` : '<div class="small-muted" style="margin-top:8px">대기 요청 없음</div>'}
    ${assigned ? `<div class="dispatch-banner"><strong>지령: ${esc(assigned.dutyName)}</strong><div class="small-muted">선택한 구급차 기준 경로 표시 중</div><button id="resetDispatchBtn" class="btn danger" style="margin-top:6px;width:100%">지령 초기화</button></div>` : '<div class="small-muted" style="margin-top:8px">구급차를 선택하면 주변 병원과 경로가 나타납니다.</div>'}
    <div class="actions" style="margin-top:8px"><button id="logoutBtn" class="btn">로그아웃</button></div>
  `;
  $('logoutBtn')?.addEventListener('click', logout);
  $('resetDispatchBtn')?.addEventListener('click', resetDispatch);

  $('requestQueue').innerHTML = queue.length ? queue.map((r) => `
    <div class="request-card ${state.selectedRequestId === r.id ? 'active' : ''}" data-rid="${r.id}">
      <div class="card-head"><div><strong>${esc(r.ambulanceLabel || '구급차')}</strong><div class="small-muted">${SL[r.status] || r.status} · ${elapsed(r.createdAt)}</div></div><span class="pill ${r.status === 'refused' ? 'danger' : r.status === 'submitted' ? 'warn' : 'success'}">${shortId(r.id)}</span></div>
      <div class="chips"><span class="chip ${ktasClass(r.ktas)}">KTAS ${r.ktas || '-'}</span><span class="chip">${esc(r.specialty || '-')}</span><span class="chip">${esc(r.location || r.stage2 || '-')}</span></div>
    </div>`).join('') : '<div class="small-muted">요청 없음</div>';
  $('requestQueue').querySelectorAll('[data-rid]').forEach((card) => {
    card.onclick = async () => selectReq(card.dataset.rid);
  });

  const list = req ? recList(req).slice(0, 3) : [];
  $('listSummary').textContent = req ? `추천 ${list.length}곳` : '요청 선택 필요';
  $('hospitalList').innerHTML = list.length ? list.map((h, i) => hospitalCardHtml(h, i, true, req)).join('') : '<div class="small-muted">요청을 선택해줘.</div>';
  $('hospitalList').querySelectorAll('[data-sel]').forEach((card) => {
    card.onclick = async (e) => { if (e.target.closest('[data-final]')) return; selectHosp(card.dataset.sel); };
  });
  $('hospitalList').querySelectorAll('[data-final]').forEach((b) => b.onclick = async (e) => { e.stopPropagation(); setFinal(b.dataset.final); });
  renderDetail();
  renderLogs();
}

function renderHospital() {
  const hospital = hById(state.hospitalSession?.hospitalId);
  if (!hospital) {
    $('rolePanel').innerHTML = `<h3>병원 데이터 로딩중...</h3><div class="small-muted">잠시만 기다려줘.</div><div class="actions" style="margin-top:8px"><button id="logoutBtn" class="btn">로그아웃</button></div>`;
    $('logoutBtn')?.addEventListener('click', logout);
    return;
  }
  $('rolePanel').innerHTML = `
    <h3>${esc(hospital.dutyName)}</h3>
    <div class="small-muted">${esc(hospital.dutyEmclsName || '')} · ${esc(hospital.dutyAddr || '')}</div>
    <div class="small-muted" style="margin-top:4px">전화: ${esc(hospital.dutyTel3 || hospital.hv1 || '-')}</div>
    <div class="actions" style="margin-top:8px"><button id="logoutBtn" class="btn">로그아웃</button></div>
  `;
  $('logoutBtn')?.addEventListener('click', logout);

  $('hospitalDetailPanel').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><span>응급실 병상</span><strong>${hospital.hvec ?? '-'}개</strong></div>
      <div class="detail-row"><span>수술실</span><strong>${hospital.hvoc ?? '-'}개</strong></div>
      <div class="detail-row"><span>ICU</span><strong>${hospital.hvicc ?? '-'}개</strong></div>
      <div class="detail-row"><span>CT</span><strong>${yn(hospital.hvctayn) ? '가능' : '불가'}</strong></div>
      <div class="detail-row"><span>MRI</span><strong>${yn(hospital.hvmriayn) ? '가능' : '불가'}</strong></div>
      <div class="detail-row"><span>구급차</span><strong>${yn(hospital.hvamyn) ? '가능' : '불가'}</strong></div>
      <div class="detail-row"><span>인공호흡기</span><strong>${yn(hospital.hvventiayn) ? '가능' : '불가'}</strong></div>
    </div>`;

  const items = state.requests.filter((r) => r.assignedHospitalId === hospital.id && ['dispatched', 'accepted', 'arrived'].includes(r.status)).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  $('listSummary').textContent = `${items.length}건`;
  $('hospitalList').innerHTML = items.length ? items.map((r) => `
    <div class="request-card ${state.selectedRequestId === r.id ? 'active' : ''}">
      <div class="card-head"><div><strong>${esc(r.ambulanceLabel || '구급차')}</strong><div class="small-muted">${SL[r.status] || r.status} · ${elapsed(r.createdAt)}</div></div><span class="pill warn">${shortId(r.id)}</span></div>
      <div class="small-muted">${esc(r.symptoms || '-')}</div>
      <div class="chips"><span class="chip ${ktasClass(r.ktas)}">KTAS ${r.ktas || '-'}</span><span class="chip">${esc(r.sex || '-')}/${esc(r.age || '-')}세</span><span class="chip">BP ${esc(r.bp || '-')}</span><span class="chip">SpO2 ${esc(r.spo2 || '-')}</span><span class="chip">${travelSummaryText(r)}</span></div>
      <div class="actions">
        <button class="btn" data-open="${r.id}">보기</button>
        ${r.status === 'dispatched' ? `<button class="btn success" data-accept="${r.id}">수락</button><button class="btn danger" data-refuse="${r.id}">거절</button>` : ''}
      </div>
    </div>`).join('') : '<div class="small-muted">대기 중인 요청 없음</div>';
  $('hospitalList').querySelectorAll('[data-open]').forEach((b) => b.onclick = async () => { state.selectedRequestId = b.dataset.open; save(); render(); await renderMap(true); });
  $('hospitalList').querySelectorAll('[data-accept]').forEach((b) => b.onclick = async () => {
    const req = rById(b.dataset.accept);
    if (!req) return;
    req.status = 'accepted';
    req.acceptedAt = new Date().toISOString();
    req.updatedAt = new Date().toISOString();
    upsert(req);
    log(`${hospital.dutyName} → ${req.ambulanceLabel || '요청'} 수락`);
    save();
    await persistRuntime();
    render();
    await renderMap(true);
  });
  $('hospitalList').querySelectorAll('[data-refuse]').forEach((b) => b.onclick = () => {
    state.pendingRefusalHospitalId = hospital.id;
    state.pendingRefusalRequestId = b.dataset.refuse;
    $('refusalModal')?.classList.remove('hidden');
  });
  renderLogs();
}

function hospitalCardHtml(h, index, showFinal = false, req = null) {
  const isAssigned = req?.assignedHospitalId === h.id;
  const isSelected = state.selectedHospitalId === h.id;
  const eta = h.travelLive?.durationMin ? `${h.travelLive.durationMin}분` : `${estT(h.prediction?.distanceKm)}분`;
  const dist = h.travelLive?.distanceKm ? `${h.travelLive.distanceKm}km` : fDist(h.prediction?.distanceKm);
  return `
    <div class="hospital-card ${isSelected ? 'selected' : ''} ${isAssigned ? 'assigned' : ''}" data-sel="${h.id}">
      <div class="card-head"><div><strong>${index + 1}. ${esc(h.dutyName)}</strong><div class="small-muted">${esc(h.dutyEmclsName || '')}</div></div><div class="wait-badge ${pClass(h.prediction?.predictedPressure)}">${h.prediction?.predictedWaitMinutes ?? '-'}분</div></div>
      <div class="chips"><span class="chip">거리 ${dist}</span><span class="chip">이동 ${eta}</span><span class="chip">병상 ${h.hvec ?? '-'}</span><span class="chip ${confClass(h.prediction?.confidence)}">신뢰 ${h.prediction?.confidence || '-'}</span>${isAssigned ? '<span class="chip final-chip">지령완료</span>' : ''}</div>
      <div class="actions"><button class="btn">병원 선택</button>${showFinal ? `<button class="btn primary" data-final="${h.id}">최종 지정</button>` : ''}</div>
    </div>`;
}

function renderDetail() {
  if (ROLE === 'hospital') return;
  const h = hById(state.selectedHospitalId);
  if (!h) {
    $('hospitalDetailPanel').innerHTML = '병원을 선택해줘.';
    return;
  }
  const eta = h.travelLive?.durationMin ? `${h.travelLive.durationMin}분` : `${estT(h.prediction?.distanceKm)}분`;
  const dist = h.travelLive?.distanceKm ? `${h.travelLive.distanceKm}km` : fDist(h.prediction?.distanceKm);
  $('hospitalDetailPanel').innerHTML = `
    <div class="detail-grid">
      <div><strong>${esc(h.dutyName)}</strong><div class="small-muted">${esc(h.dutyEmclsName || '')} · ${esc(h.dutyAddr || '')}</div><div class="marker-hint">API 병원</div></div>
      <div class="detail-row"><span>예상 대기</span><strong>${h.prediction?.predictedWaitMinutes ?? '-'}분</strong></div>
      <div class="detail-row"><span>이동</span><strong>${eta}</strong></div>
      <div class="detail-row"><span>거리</span><strong>${dist}</strong></div>
      <div class="detail-row"><span>병상</span><strong>${h.hvec ?? '-'}</strong></div>
      <div class="detail-row"><span>수술실</span><strong>${h.hvoc ?? '-'}</strong></div>
      <div class="detail-row"><span>ICU</span><strong>${h.hvicc ?? '-'}</strong></div>
      <div class="detail-row"><span>CT/MRI</span><strong>${yn(h.hvctayn) ? 'CT' : '—'} ${yn(h.hvmriayn) ? '/ MRI' : ''}</strong></div>
      <div class="detail-row"><span>구급차</span><strong>${yn(h.hvamyn) ? '수용가능' : '—'}</strong></div>
      <div class="detail-row"><span>전화</span><strong>${esc(h.dutyTel3 || h.hv1 || '-')}</strong></div>
    </div>`;
}

function renderLogs() {
  const el = $('logList');
  if (!el) return;
  el.innerHTML = state.logs.length ? state.logs.slice(-15).reverse().map((l) => `<div class="log-item">[${esc(l.time || '')}] ${esc(l.message || '')}</div>`).join('') : '<div class="small-muted">로그 없음</div>';
}

function captureDraft() {
  if (!$('reqSex')) return;
  state.emtDraft = {
    sex: val('reqSex'),
    age: val('reqAge'),
    location: val('reqLocation') || state.stage2,
    symptoms: val('reqSymptoms'),
    ktas: val('reqKtas'),
    specialty: val('reqSpecialty'),
    bp: val('reqBp'),
    hr: val('reqHr'),
    spo2: val('reqSpo2'),
    memo: val('reqMemo'),
  };
  save({ broadcast: false });
}

function bindDraft() {
  ['reqSex','reqAge','reqLocation','reqSymptoms','reqKtas','reqSpecialty','reqBp','reqHr','reqSpo2','reqMemo'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', captureDraft);
  });
}

function fillForm(obj) {
  Object.entries(obj).forEach(([k, v]) => {
    const id = `req${k[0].toUpperCase()}${k.slice(1)}`;
    const el = $(id);
    if (el) el.value = v;
  });
  captureDraft();
}

async function submitReq() {
  if (!isAuth('emt')) return;
  captureDraft();
  const d = state.emtDraft || {};
  const existing = activeReq();
  const now = new Date().toISOString();
  const req = {
    id: existing?.status === 'submitted' ? existing.id : uid(),
    ...d,
    location: d.location || state.stage2,
    stage1: state.stage1,
    stage2: state.stage2,
    originLat: state.myLocation?.lat || null,
    originLon: state.myLocation?.lon || null,
    currentLat: state.myLocation?.lat || null,
    currentLon: state.myLocation?.lon || null,
    currentLocationUpdatedAt: state.myLocation ? now : null,
    status: 'submitted',
    preferredHospitalId: state.selectedHospitalId,
    assignedHospitalId: null,
    createdAt: existing?.status === 'submitted' ? existing.createdAt : now,
    updatedAt: now,
    ambulanceLabel: state.auth.emt?.label || '구급차',
    submittedBy: state.auth.emt?.loginId || 'emt01',
    region: state.region || 'busan',
  };
  upsert(req);
  state.selectedRequestId = req.id;
  log(`${req.ambulanceLabel} 본부 전송`);
  save();
  await persistRuntime();
  render();
  await refreshHospitals(false);
}

async function selectHosp(id) {
  state.selectedHospitalId = id;
  const req = activeReq();
  if (ROLE === 'emt' && req?.status === 'submitted') {
    req.preferredHospitalId = id;
    req.updatedAt = new Date().toISOString();
    upsert(req);
    scheduleRuntimePush();
  }
  save();
  render(); // 즉시 선택 표시
  await hydrateTop3Travel(req);
  render(); // 경로 데이터 반영
  await renderMap(true);
}

async function setFinal(id) {
  const req = activeReq();
  if (!req || ROLE !== 'hq') return;
  req.assignedHospitalId = id;
  req.status = 'dispatched';
  req.dispatchedAt = new Date().toISOString();
  req.updatedAt = new Date().toISOString();
  state.selectedHospitalId = id;
  upsert(req);
  log(`${req.ambulanceLabel || '요청'} → ${hById(id)?.dutyName || '병원'} 최종 지정`);
  save();
  await persistRuntime();
  render();
  await renderMap(true);
}

async function selectReq(id) {
  const req = rById(id);
  if (!req) return;
  state.selectedRequestId = id;
  state.selectedHospitalId = req.assignedHospitalId || req.preferredHospitalId || state.selectedHospitalId;
  if (req.stage1) state.stage1 = req.stage1;
  if (req.stage2) state.stage2 = req.stage2;
  updateRegionLabel();
  save();
  render();
  await refreshHospitals(false);
  await renderMap(true);
}

async function saveRefusal() {
  const hospital = hById(state.pendingRefusalHospitalId);
  const req = rById(state.pendingRefusalRequestId);
  const sub = $('refusalSubcategory');
  const label = sub?.options[sub.selectedIndex]?.text || '';
  const note = $('refusalNote')?.value || '';
  if (req) {
    req.status = 'refused';
    req.refusal = { code: sub?.value, label, note, hospitalId: hospital?.id, ts: new Date().toISOString() };
    req.updatedAt = new Date().toISOString();
    upsert(req);
  }
  log(`${hospital?.dutyName || '병원'} 거절 · ${sub?.value || '-'} · ${label}`);
  if ($('refusalNote')) $('refusalNote').value = '';
  $('refusalModal')?.classList.add('hidden');
  save();
  await persistRuntime();
  render();
  await renderMap(true);
}

function activeReq() {
  if (ROLE === 'hospital' && state.hospitalSession?.hospitalId) {
    const own = state.requests.filter((r) => r.assignedHospitalId === state.hospitalSession.hospitalId);
    const selected = rById(state.selectedRequestId);
    return selected && own.some((r) => r.id === selected.id) ? selected : own[0] || null;
  }
  if (ROLE === 'hq') {
    const myRegion = state.region || 'busan';
    const regionReqs = state.requests.filter(r => !r.region || r.region === myRegion);
    const selected = rById(state.selectedRequestId);
    return selected && regionReqs.some(r => r.id === selected.id) ? selected : regionReqs[0] || null;
  }
  const lid = state.auth?.emt?.loginId;
  const own = [...state.requests].filter((r) => !lid || (r.submittedBy || 'emt01') === lid).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const selected = rById(state.selectedRequestId);
  return selected && own.some((r) => r.id === selected.id) ? selected : own[0] || null;
}

function recList(req) {
  const list = [...(state.hospitals || [])];
  const assigned = req?.assignedHospitalId;
  return list.sort((a, b) => {
    const rank = (item) => item.id === assigned ? 1 : 0;
    return (rank(b) - rank(a)) || ((b.prediction?.recommendationScore || 0) - (a.prediction?.recommendationScore || 0));
  });
}

function getPreviewHospital(req) {
  if (!req && ROLE === 'hospital') return hById(state.hospitalSession?.hospitalId);
  if (req?.assignedHospitalId && state.selectedRequestId === req.id) return hById(state.selectedHospitalId || req.assignedHospitalId);
  if (state.selectedHospitalId) return hById(state.selectedHospitalId);
  if (req?.preferredHospitalId) return hById(req.preferredHospitalId);
  return null;
}

function hById(id) { return state.hospitals.find((h) => h.id === id) || null; }
function rById(id) { return state.requests.find((r) => r.id === id) || null; }
function upsert(req) { const i = state.requests.findIndex((r) => r.id === req.id); if (i >= 0) state.requests[i] = req; else state.requests.push(req); }
function reqOrigin(req) { return req && isFinite(req.originLat) && isFinite(req.originLon) ? { lat: req.originLat, lon: req.originLon } : null; }
function reqLivePos(req) { return req && isFinite(req.currentLat) && isFinite(req.currentLon) ? { lat: req.currentLat, lon: req.currentLon } : reqOrigin(req); }
function snapshotHtml(req) { return req ? `<div class="snapshot-lines"><strong>${esc(req.sex || '-')}/${esc(req.age || '-')}세</strong> · <span class="chip ${ktasClass(req.ktas)}" style="font-size:11px;padding:2px 7px">KTAS ${esc(req.ktas || '-')}</span> · ${esc(req.symptoms || '-')}</div>` : ''; }
function log(message) { state.logs.push({ type: 'info', message, time: new Date().toLocaleTimeString('ko-KR', { hour12: false }) }); state.logs = state.logs.slice(-80); save({ broadcast: true }); renderLogs(); scheduleRuntimePush(); }
function travelSummaryText(req) {
  const hospital = hById(req?.assignedHospitalId);
  const live = reqLivePos(req);
  if (!hospital || !live) return '이동정보 없음';
  const cached = routeCache.get(routeKey(live, { lat: hospital.wgs84Lat, lng: hospital.wgs84Lon }));
  if (cached?.durationSec) return `도착 약 ${Math.max(1, Math.round(cached.durationSec / 60))}분`;
  const km = haversine(live.lat, live.lon, hospital.wgs84Lat, hospital.wgs84Lon);
  return `도착 약 ${estT(km)}분`;
}
function rPri(req) { return ({ submitted: 5, refused: 4, dispatched: 3, accepted: 2, arrived: 1 }[req.status]) || 0; }
function uid() { return `req-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`; }
function shortId(id) { return String(id || '').split('-').slice(-1)[0] || '-'; }
function val(id) { return $(id)?.value?.trim() || ''; }
function pClass(v) { return v === '낮음' ? 'ok' : v === '보통' ? 'mid' : v === '높음' ? 'high' : 'danger'; }
function ktasClass(k) { const v = Number(k); return v === 1 ? 'ktas-1' : v === 2 ? 'ktas-2' : v === 3 ? 'ktas-3' : v === 4 ? 'ktas-4' : v === 5 ? 'ktas-5' : ''; }
function elapsed(ts) { if (!ts) return ''; const m = Math.round((Date.now() - new Date(ts).getTime()) / 60000); if (m < 1) return '방금 전'; if (m < 60) return `${m}분 전`; return `${Math.floor(m / 60)}시간 ${m % 60}분 전`; }
function confClass(c) { return c === '높음' ? 'conf-high' : c === '보통' ? 'conf-mid' : 'conf-low'; }
function statusStepHtml(req) {
  const steps = ['입력', '전송', '지령', '수락', '도착'];
  const cur = req ? ({ submitted: 1, dispatched: 2, accepted: 3, arrived: 4, refused: 1, cancelled: 0 }[req.status] ?? 0) : 0;
  return `<div class="status-steps">${steps.map((s, i) => `<div class="step ${i < cur ? 'done' : i === cur ? 'active' : ''}">${s}</div>`).join('')}</div>`;
}
function fDist(v) { return v !== null && v !== undefined && Number.isFinite(v) ? `${v}km` : '-'; }
function yn(v) { return String(v || '').toUpperCase() === 'Y'; }
function estT(d) { return d !== null && d !== undefined && Number.isFinite(d) ? Math.max(4, Math.min(45, Math.round(d * 2.6 + 3))) : '-'; }
function haversine(a, b, c, d) { if (![a, b, c, d].every(Number.isFinite)) return null; const toRad = (v) => v * Math.PI / 180; const R = 6371; const dl = toRad(c - a); const dn = toRad(d - b); const s = Math.sin(dl / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(dn / 2) ** 2; return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10; }
function esc(t) { return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
