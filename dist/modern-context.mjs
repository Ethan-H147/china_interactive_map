import {coverage} from './context-coverage.mjs';
import {overlaps} from './context-visibility.mjs';
import {mapPalette} from './map-palette.mjs';
import {hasHistoricalCoast} from './historical-coast-detail.mjs';

const enterZoom = 7.75;
const exitZoom = 7.25;
const layer = 'modern-context-detail';
const special = {
  china: ['china-context.bin', 'china-mobile/provinces.bin', null, .375, 18, 128, 'china-mobile/provinces-fragments.bin'],
  japan: ['japan-context.bin', 'japan-boundaries.bin', 'first', .25, 16, 64],
  korea: ['korea-context.bin', 'scoped/korea/korea-first.bin', null, .375, 18, 128],
  mongolia: ['mongolia-context.bin', 'scoped/mongolia/mongolia-first.bin', null, .375, 18, 128],
  indonesia: ['archipelago/indonesia-context.bin', 'archipelago/indonesia-overview.bin', 'first', .25, 16, 64],
  philippines: ['archipelago/philippines-context.bin', 'archipelago/philippines-overview.bin', 'first', .25, 16, 64],
  malaysia: ['southeast-asia/malaysia-context.bin', 'southeast-asia/malaysia-first.bin', null, .15, 16, 64],
  singapore: ['southeast-asia/singapore-context.bin', 'southeast-asia/singapore-first.bin', 'regions', .15, 16, 64]
};

const dataUrl = file => new URL('data/' + file, import.meta.url).href;
export function modernContextFiles(country, entry) {
  if (!entry.portal || entry.snapshot || entry.polar) return null;
  if (special[country]) {
    const [coarse, file, member, tolerance, maxzoom, buffer, extra] = special[country];
    const chunks = entry.adapter === 'archipelago' ? 'archipelago/' + country + '-catalogue.bin' : null;
    return {coarse, file, member, tolerance, maxzoom, buffer, extra, chunks};
  }
  const base = entry.adapter === 'russia' ? 'russia/' : entry.adapter + '/' + country + '/';
  return {coarse: base + 'context.bin', file: base + (entry.map.firstFile || 'first.bin'),
    catalogue: base + 'catalogue.bin', member: 'regions', tolerance: 0, maxzoom: 16, buffer: 128};
}

function viewBounds(map) {
  return map.getBounds().toArray().flat();
}

function contains(scope, view) {
  const shift = 360 * Math.round((scope[0] + scope[2] - view[0] - view[2]) / 720);
  return scope[0] <= view[0] + shift && view[2] + shift <= scope[2] &&
    scope[1] <= view[1] && view[3] <= scope[3];
}

function expand([west, south, east, north]) {
  const dx = (east - west) * .65;
  const dy = (north - south) * .65;
  return [west - dx, Math.max(-90, south - dy), east + dx, Math.min(90, north + dy)];
}

export function createModernContext(map, {registry, active, excludes, allowed, changed}) {
  const countries = new Map(registry.ids.flatMap(country => {
    const entry = registry.countries[country];
    const files = modernContextFiles(country, entry);
    return files && coverage[files.coarse]?.boxes.length ? [[country, {files, portal: entry.portal.layer}]] : [];
  }));
  let current, failed, lastView, queued = false, disposed = false;
  const eligible = (country, open) => country !== open && allowed(country) && !excludes(open).includes(country);
  const matches = (job, view, open) => job?.open === open && eligible(job.country, open) && contains(job.scope, view);

  function clear() {
    const job = current;
    if (!job) return;
    current = null;
    lastView = null;
    clearTimeout(job.timer);
    job.worker?.terminate();
    if (!disposed && map.getLayer(layer)) map.removeLayer(layer);
    if (!disposed && map.getSource(layer)) map.removeSource(layer);
    if (job.blob) URL.revokeObjectURL(job.blob);
    if (job.ready && !disposed) changed();
  }

  function invalidate() {
    if (current && (map.getZoom() < exitZoom || hasHistoricalCoast(map) ||
        !matches(current, viewBounds(map), active()))) clear();
  }

  function reveal() {
    const job = current;
    if (!job?.blob || job.ready || !map.getLayer(layer) || !map.isSourceLoaded(layer)) return;
    invalidate();
    if (job !== current) return;
    clearTimeout(job.timer);
    job.ready = true;
    map.setPaintProperty(layer, 'fill-opacity', 1);
    changed();
  }

  function unavailable(job, error) {
    if (current !== job) return;
    failed = {country: job.country, scope: job.scope, open: job.open};
    clear();
    if (error) console.warn('Detailed background unavailable for ' + job.country, error);
  }

  function start(country, view, open) {
    const {files} = countries.get(country);
    const scope = expand(view);
    const worker = new Worker(new URL('./country-boundary-worker.mjs', import.meta.url), {type: 'module'});
    const job = current = {country, scope, open, worker, timer: setTimeout(() => unavailable(job), 30000)};
    worker.onmessage = ({data}) => {
      if (current !== job) return;
      worker.terminate();
      job.worker = null;
      if (!data.blob) return unavailable(job, data.error);
      invalidate();
      if (current !== job) return;
      try {
        job.blob = URL.createObjectURL(data.blob);
        map.addSource(layer, {type: 'geojson', data: job.blob, tolerance: data.tolerance,
          maxzoom: files.maxzoom, buffer: files.buffer});
        map.addLayer({id: layer, source: layer, type: 'fill',
          metadata: {atlas: {role: 'context', contextCountry: country}},
          paint: {'fill-color': mapPalette.country, 'fill-opacity': 0,
            'fill-opacity-transition': {duration: 0}, 'fill-antialias': false}});
      } catch (error) {
        unavailable(job, error);
      }
    };
    worker.onerror = event => unavailable(job, event.message);
    const source = Object.fromEntries(['file', 'coarse', 'extra', 'catalogue', 'chunks']
      .filter(key => files[key]).map(key => [key, dataUrl(files[key])]));
    const {lng, lat} = map.getCenter();
    const limit = map.getContainer().clientWidth < 760 || navigator.connection?.saveData ? 2 : 3;
    worker.postMessage({operation: 'context-detail', country, open, scope, ...source,
      member: files.member, tolerance: files.tolerance, center: [lng, lat], limit});
  }

  function target(view, open) {
    const candidates = new Set();
    const byLayer = new Map();
    for (const [country, {files, portal}] of countries) {
      if (!eligible(country, open) || !coverage[files.coarse].boxes.some(box => overlaps(box, view))) continue;
      candidates.add(country);
      if (map.getLayer(portal)) byLayer.set(portal, country);
    }
    if (!candidates.size) return;
    if (current?.ready) byLayer.set(layer, current.country);
    const layers = [...byLayer.keys(), ...(map.getLayer('world-land') ? ['world-land'] : [])];
    if (!layers.length) return;
    const hit = features => features.map(f => byLayer.get(f.layer.id) || f.properties.country)
      .find(country => candidates.has(country));
    const center = map.project(map.getCenter());
    return hit(map.queryRenderedFeatures(center, {layers})) ||
      hit(map.queryRenderedFeatures({layers}));
  }

  function refresh() {
    queued = false;
    if (disposed) return;
    invalidate();
    if (map.isMoving() || map.getZoom() < (current ? exitZoom : enterZoom) || hasHistoricalCoast(map)) return;
    const view = viewBounds(map);
    const open = active();
    if (view[2] - view[0] > 45) return;
    if (failed && !matches(failed, view, open)) failed = null;
    const key = [open, map.getZoom(), ...view].join(':');
    if (lastView === key) return;
    const country = target(view, open);
    if (country && country !== current?.country && country !== failed?.country) {
      clear();
      start(country, view, open);
    }
    if (country || map.loaded()) lastView = key;
  }

  function schedule() {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(refresh);
  }

  const onSource = event => { if (event.sourceId === layer) reveal(); };
  const onError = event => { if (current && event.sourceId === layer) unavailable(current, event.error); };
  map.on('sourcedata', onSource);
  map.on('error', onError);
  map.on('move', invalidate);
  map.on('moveend', schedule);
  map.on('resize', schedule);
  map.on('idle', schedule);
  map.on('atlascontextchange', schedule);
  map.on('remove', () => {
    disposed = true;
    clear();
    map.off('sourcedata', onSource);
    map.off('error', onError);
    map.off('move', invalidate);
    map.off('moveend', schedule);
    map.off('resize', schedule);
    map.off('idle', schedule);
    map.off('atlascontextchange', schedule);
  });

  return {
    schedule() { if (!current) lastView = null; schedule(); },
    get country() { return current?.ready && current.open === active() ? current.country : null; },
    hit(point) {
      if (!this.country || !map.getLayer(layer)) return;
      const feature = map.queryRenderedFeatures(point, {layers: [layer]})[0];
      if (feature) return {country: this.country, ...feature.properties};
    }
  };
}
