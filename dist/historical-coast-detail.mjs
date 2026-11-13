import {membershipFilter} from './interaction-policy.mjs';
import {shapeAtLocation} from './historic-shapes.mjs';
import {compactUrl, fetchBytes} from './geo-pack.mjs';
import {mapPalette} from './map-palette.mjs';
import {containsScope,paddedView,reusableHistoricalScope} from './context-visibility.mjs';

const startZoom = 7;
const all = ['literal', true];
const historicalCoasts = new WeakMap();
const mapKey = map => map.style?.map || map;
const wraps = (x, a, b) => [x, x - 360, x + 360].some(lng => lng >= a && lng <= b);

function coastAt(map, entries) {
  if (!entries) return;
  const {lng, lat} = map.getCenter();
  return entries.find(({bounds, areas = [bounds], minZoom = startZoom}) => map.getZoom() >= minZoom && areas.some(([w, s, e, n]) =>
    lat >= s && lat <= n && wraps(lng, w, e)));
}

// The dated coast source already covers this area. Avoid decoding and tiling a
// second copy of the modern coastline while this historical view is open.
export function hasHistoricalCoast(map) {
  return !!coastAt(map, historicalCoasts.get(mapKey(map)));
}

export function createHistoricalCoastDetail(map, {base, prefix, ownLayers, scene, onSwap, geometry}) {
  const fill = prefix + '-coast-detail';
  const water = prefix + '-coast-water';
  const gray = prefix + '-coast-land';
  const highlight = prefix + '-coast-selected-fill';
  const border = prefix + '-coast-lines';
  const frontier = prefix + '-coast-frontiers';
  ownLayers.add(fill);
  ownLayers.add(water);
  ownLayers.add(gray);
  ownLayers.add(highlight);
  ownLayers.add(border);
  ownLayers.add(frontier);
  let manifest, current, pending, pendingScope, ready, fillLayer, colors, controller, failed, tileTimer;
  let selected = new Set(), selectionPaint, borderStyle;

  function clear(notify = true) {
    const changed = !!ready, blob = current?.blob;
    clearTimeout(tileTimer);
    controller?.abort();
    geometry?.cancel("coast");
    controller = pending = pendingScope = ready = current = null;
    for (const id of [water, highlight, border, frontier, fill, gray]) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(fill)) map.removeSource(fill);
    if (changed && notify) onSwap();
    if (blob) URL.revokeObjectURL(blob);
  }

  function member(url, name, scope) {
    return 'atlas-data://' + fill + '?' + new URLSearchParams({url, transform: name,scope:scope.join(',')});
  }

  let faceFilter = ['all',['has','f'],['!=',['get','f'],-1]];

  function syncSelection() {
    if (!ready) return;
    const next = new Set([...selected].filter(f => ready.ids.has(f)));
    const nativeNext=geometry?(next.size<=256?next:new Set()):next;
    const previous = geometry?(ready.stateSelected||new Set()):ready.selected;
    if (next.size && !map.getLayer(highlight)) {
      map.addLayer({id: highlight, type: 'fill', source: fill, filter: geometry?['all',faceFilter,membershipFilter('f',next)]:faceFilter,
        metadata: {atlas: {preserveSelectionOpacity: true, stableSelectionFill: true, satellite: {fill: 'none'}}},
        paint: selectionPaint});
    }
    const update=()=>{
     for (const id of previous) if (!nativeNext.has(id)) map.removeFeatureState({source: fill, id}, 'selected');
     for (const id of nativeNext) if (!previous.has(id)) map.setFeatureState({source: fill, id}, {selected: true});
    };
    if(scene?.batchFeatureState)scene.batchFeatureState(update);else update();
    ready.selected = next;
    if(geometry){ready.stateSelected=nativeNext;if(map.getLayer(highlight))map.setFilter(highlight,['all',faceFilter,membershipFilter('f',next)]);}
  }

  function syncBorders() {
    if (!ready?.entry.sides || !borderStyle) return;
    const {config, linePaint, frontierPaint, visible} = borderStyle;
    const lines = [], frontiers = [];
    for (const [edge, l, r] of ready.entry.sides) {
      const a = config.face[l] ?? -1, b = config.face[r] ?? -1;
      if (a === b || a < 0 && b < 0) continue;
      if (visible && !(a >= 0 && visible(config.units[a]) || b >= 0 && visible(config.units[b]))) continue;
      const interior = a >= 0 && b >= 0 && config.units[a].sovereign === config.units[b].sovereign;
      (interior ? lines : frontiers).push(edge);
    }
    for (const [id, edges, paint] of [[border, lines, linePaint], [frontier, frontiers, frontierPaint]]) {
      const filter = membershipFilter('edge',edges);
      if (!map.getLayer(id)) {
        map.addLayer({id,source:fill,type:'line',metadata:{atlas:{role:'border'}},
          layout:{'line-cap':'round','line-join':'round',visibility:scene?.baseVisibility(prefix+(id===border?'-lines':'-frontiers'))||'visible'},filter,paint});
      } else {
        map.setFilter(id,filter);
        for (const [key,value] of Object.entries(paint)) map.setPaintProperty(id,key,value);
      }
    }
  }

  function loaded() {
    if (ready || !current || !map.getLayer(fill) || !map.getLayer(water) ||
        !map.isSourceLoaded(fill)) return;
    clearTimeout(tileTimer);
    ready = current;
    map.setPaintProperty(fill, 'fill-opacity', 1);
    map.setPaintProperty(water, 'fill-opacity', 1);
    map.setPaintProperty(gray, 'fill-opacity', 1);
    syncSelection();
    syncBorders();
    onSwap();
  }

  const view=()=>map.getBounds().toArray().flat();
  const reusable=(scope,bounds)=>geometry?reusableHistoricalScope(scope,bounds):containsScope(scope,bounds);
  function invalidate(){
    if(current&&(coastAt(map,manifest)!==current.entry||!reusable(current.scope,view())))clear();
  }
  async function move() {
    const entry = coastAt(map, manifest),bounds=view();
    if(entry&&(entry===pending&&reusable(pendingScope,bounds)||entry===current?.entry&&reusable(current.scope,bounds)))return;
    if(failed&&failed.entry===entry&&Math.abs(map.getZoom()-failed.zoom)<.5&&containsScope(failed.scope,bounds))return;
    clear();
    if (!entry) return;
    pending = entry;
    const scope=pendingScope=paddedView(bounds,{minimum:geometry ? .03 : 5});
    const signal = (controller = new AbortController()).signal;
    try {
      const url = new URL(compactUrl(base + 'history/' + entry.file), document.baseURI).href;
      const prepared=geometry?await geometry.run('coast',member(url,'coast-display',scope)+(entry.sides?'&borders=1':''),{signal}):new Blob([await fetchBytes(url,{signal})]);
      if (signal.aborted) return;
      const blob = URL.createObjectURL(prepared);
      failed=null;
      current = {entry, scope, blob, picking:prepared.picking, ids: new Set(entry.faces), selected: new Set()};
      map.addSource(fill, {type: 'geojson', data: member(blob, 'coast-display', scope) + (entry.sides ? '&borders=1' : '') + (geometry?'&prepared=1':''), promoteId: 'f', tolerance: 0, buffer: 128, maxzoom: 16});
      const isWater = ['==', ['get','water'], true];
      map.addLayer({id: gray, type: 'fill', source: fill, metadata: {atlas: {role: 'context'}},
        filter: entry.id === 'australia' ? ['has','f'] : ['==',['get','f'],-1],
        paint: {'fill-color': mapPalette.country, 'fill-opacity': 0, 'fill-antialias': false}});
      map.addLayer({id: fill, type: 'fill', source: fill, filter: faceFilter, metadata:{atlas:{historicalCoast:entry.id}},
        paint: {'fill-color': colors, 'fill-opacity': 0, 'fill-antialias': false}}, fillLayer);
      map.addLayer({id: water, type: 'fill', source: fill, filter: isWater,
        metadata: {atlas: {role: 'water', backgroundFill: true, satellite: {fill: 'fade'}}},
        paint: {'fill-color': scene?.basePaint('background','background-color') ?? map.getPaintProperty('background','background-color'),
          'fill-opacity': 0, 'fill-antialias': false}});
      pending = null;
      if(geometry){const installed=current;tileTimer=setTimeout(()=>{if(current===installed&&!ready){clear();failed={entry,scope,zoom:map.getZoom()};console.warn('Historical coast: tile loading exceeded its time budget');}},25000);}
      loaded();
    } catch (error) {
      if (!signal.aborted) {
        clear();
        failed={entry,scope,zoom:map.getZoom()};
        console.warn('Historical coast:', error.message);
      }
    }
  }

  // The old mosaic remains visible during the fetch. The new layers are
  // initially transparent so their tiles can load before the swap.
  function sync() {
    if (!current || ready) return;
    loaded();
  }

  return {
    draw(entries, color, before, borders) {
      if (!entries?.length) return;
      colors = color;
      borderStyle = borders;
      const {config, visible} = borders;
      const ids = config.face.flatMap((u,f) => u >= 0 && (!visible || visible(config.units[u])) ? [f] : []);
      faceFilter = config.fullLand ? ['all',['has','f'],['!=',['get','f'],-1]] : membershipFilter('f',ids.concat(config.modernLand || []));
      for (const id of [fill, highlight]) if (map.getLayer(id)) map.setFilter(id, geometry&&id===highlight?['all',faceFilter,membershipFilter('f',ready?.selected||[])]:faceFilter);
      syncBorders();
      fillLayer = before;
      if (map.getLayer(fill)) map.setPaintProperty(fill, 'fill-color', colors);
      if (!manifest) {
        manifest = entries;
        historicalCoasts.set(mapKey(map), entries);
        map.fire?.('atlascontextchange');
        map.on('move', invalidate);
        map.on('resize', move);
        map.on('moveend', move);
        map.on('sourcedata', sync);
        void move();
      }
    },
    filter(baseFilter = all) {
      return ready ? ['all', baseFilter, ['!', membershipFilter('f',ready.entry.faces)]] : baseFilter;
    },
    filterArcs(filter) {
      return ready?.entry.sides ? ['all',filter,
        ['!', membershipFilter('l',ready.entry.faces)],
        ['!', membershipFilter('r',ready.entry.faces)]] : filter;
    },
    has(f) { return !!ready?.ids.has(f); },
    pick(point, config) {
      if (!ready) return undefined;
      if(ready.picking){
        const location=map.unproject(point);
        if(shapeAtLocation(ready.picking,location,p=>p.water))return null;
        return shapeAtLocation(ready.picking,location,p=>p.f>=0&&(!config||config.face[p.f]>=0))?.properties.f;
      }
      const hits = map.queryRenderedFeatures(point, {layers: [water, fill]});
      if (!hits.length) return undefined;
      if (hits.some(hit => hit.layer.id === water)) return null;
      const land = hits.find(({properties:{f}}) => f >= 0 && (!config || config.face[f] >= 0));
      return land?.properties.f ?? undefined;
    },
    selection(ids, paint) { selected = ids; selectionPaint = paint; syncSelection(); },
    get url() { return ready?.blob; },
    get region() { return ready?.entry.id; },
    remove() {
      if (!manifest) return;
      if (historicalCoasts.get(mapKey(map)) === manifest) historicalCoasts.delete(mapKey(map));
      manifest = null;
      failed=null;
      selected = new Set();
      selectionPaint = null;
      map.off('move', invalidate);
      map.off('resize', move);
      map.off('moveend', move);
      map.off('sourcedata', sync);
      clear(false);
      map.fire?.('atlascontextchange');
    }
  };
}
