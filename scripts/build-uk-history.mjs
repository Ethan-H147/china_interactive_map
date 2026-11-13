import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {gzipSync, gunzipSync} from 'node:zlib';
import {encodeGeo, decodeData} from '../dist/geo-pack.mjs';
import {command, fc, geographicBounds} from './build-regional-dataset.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {lineIndex, polygons} from './geo-index.mjs';
import {firstYear, lastYear, addTerritories, events} from './uk-history-territories.mjs';
import {sharedOverseasLand} from './uk-history-shared.mjs';
import {australiaHistoryMesh} from './uk-history-australia.mjs';
import {writeUKCoasts, alignCanonicalLabels} from './uk-history-coasts.mjs';
import {writeUKCoastWater} from './build-uk-history-water.mjs';

const require = createRequire(import.meta.url);
const mapshaper = require('mapshaper');
const {feature, merge} = require('topojson-client');
const {topology: buildTopology} = require('topojson-server');
const clip = require('polygon-clipping');
const cache = 'scripts/boundary-sources/uk-history/outlines.json.gz';
const output = process.env.ATLAS_UK_HISTORY_OUTPUT || 'dist/data/europe/united-kingdom/history';
const clioSource = 'https://github.com/Seshat-Global-History-Databank/cliopatria/tree/v0.2.1';
const endOf = year => year + '-12-31';
const range = (from, until) => Array.from({length: until - from}, (_, i) => from + i);
const shape = coordinates => ({type: 'MultiPolygon', coordinates});
const record = (coordinates, properties = {}) => ({type: 'Feature', properties, geometry: shape(coordinates)});
const matches = (key, selector) => selector instanceof RegExp ? selector.test(key) :
  typeof selector === 'function' ? selector(key) : !selector || key === selector;
const union = (...parts) => {
  const present = parts.filter(part => part.length);
  return present.length > 1 ? clip.union(...present) : present[0] || [];
};
const box = (w, s, e, n) => [[[[w, s], [e, s], [e, n], [w, n], [w, s]]]];
const cut = (a, b) => a.length && b.length ? clip.intersection(a, b) : [];
const minus = (a, ...parts) => parts.length && a.length ? clip.difference(a, ...parts.filter(b => b.length)) : a;
const area = geometry => geographicAreaKm2(shape(geometry));
const json = file => JSON.parse(fs.readFileSync(file));
const gzip = data => gzipSync(JSON.stringify(data), {level: 9});

// The cache retains the exact subset needed from the tagged public archives.
// Rebuild it with --import /path/to/cliopatria.geojson /path/to/ne_10m_admin_0_map_units.geojson
const importing = process.argv[2] === '--import';
const usedMapUnits = new Set();
const sources = importing ? {
  world: json(process.argv[4]).features.map(({properties, geometry}) => ({type: 'Feature', properties: {code: properties.GU_A3}, geometry})),
  dated: json(process.argv[3]).features.filter(({properties: p}) =>
    p.Name === '(British Empire)' && p.ToYear >= 1709 && p.FromYear <= 1966
  ).map(({properties: p, geometry}) => ({type: 'Feature', properties: {from: p.FromYear, until: p.ToYear + 1}, geometry}))
    .sort((a, b) => a.properties.from - b.properties.from)
} : JSON.parse(gunzipSync(fs.readFileSync(cache)));

const simplify = (features, interval) =>
  command(fc(features), '-simplify dp interval=' + interval + ' planar keep-shapes -clean gap-width=0 allow-overlaps', {precision: .000001});

const atlasFiles = {
  'united-kingdom': 'europe/united-kingdom/first.bin',
  ireland: 'europe/ireland/first.bin',
  'antigua-and-barbuda': 'europe/antigua-and-barbuda/first.bin',
  australia: 'europe/australia/first.bin',
  cameroon: 'europe/cameroon/first.bin',
  greece: 'europe/greece/first.bin',
  malaysia: 'southeast-asia/malaysia-first.bin'
};
const load = async file => decodeData(fs.readFileSync('dist/data/' + file));
const atlasShapes = new Map();
let britishLand;
for (const [country, file] of Object.entries(atlasFiles)) {
  const data = await load(file);
  if (country === 'united-kingdom') britishLand = data.regions.features.filter(f => /^GB-R-/.test(f.properties.id));
  const reduced = await simplify((data.regions || data).features, country === 'united-kingdom' || country === 'ireland' ? .001 : .004);
  atlasShapes.set(country, reduced.features);
}
const historyShapes = new Map();
for (const country of ['canada', 'united-states']) {
  const data = await load('europe/' + country + '/history/borders.bin');
  const reduced = await simplify(data.faces.features, .007);
  historyShapes.set(country, {...data, faces: reduced.features});
}
const modern = (...codes) => {
  const parts = codes.map(code => {
    usedMapUnits.add(code);
    const features = sources.world.filter(f => f.properties.code === code);
    assert(features.length, 'Natural Earth outline missing for ' + code);
    return features.flatMap(f => polygons(f.geometry));
  });
  return union(...parts);
};
const atlas = (country, selector) => {
  const features = atlasShapes.get(country).filter(f => matches(f.properties.id, selector));
  assert(features.length, 'Atlas outline missing for ' + country + ' / ' + selector);
  return union(...features.map(f => polygons(f.geometry)));
};
const historical = (country, year, selector) => {
  const {years, configs, faces} = historyShapes.get(country);
  const config = configs[years[year].config];
  const features = faces.filter(f => {
    const unit = config.units[config.face[f.properties.f]];
    return unit && matches(unit.key, selector);
  });
  assert(features.length, 'Historical atlas outline missing for ' + country + ' ' + year + ' / ' + selector);
  // Merge in batches to keep the overlay sweep small on the continental mosaic.
  const parts = features.map(f => polygons(f.geometry));
  const groups = [];
  for (let i = 0; i < parts.length; i += 60) groups.push(union(...parts.slice(i, i + 60)));
  return union(...groups);
};

// Clean the coarse global reconstructions once, then use only the relevant
// continental sections. Entire islands and small territories have their own
// higher-resolution inputs so they do not disappear in the early global data.
const dated = (await simplify(sources.dated, .012)).features;
const versions = [];
function add(id, name, type, from, until, coordinates, extra = {}) {
  assert(coordinates.length, 'Empty territory: ' + id + ' in ' + from);
  versions.push({id, name, type, from, until: until ?? lastYear + 1, coordinates, ...extra});
}
function series(id, name, type, from, until, mask, extra, amend = coordinates => coordinates) {
  let previous;
  const start = versions.length;
  for (const row of dated) {
    const a = Math.max(from, row.properties.from === 1709 ? firstYear : row.properties.from);
    const b = Math.min(until, row.properties.until);
    if (a >= b || !row.geometry) continue;
    const coordinates = amend(cut(polygons(row.geometry), mask)).filter(p => area([p]) >= .25);
    if (!coordinates.length) continue;
    const extent = area(coordinates);
    // Ignore slight coastal shifts and small topology differences between
    // successive global reconstructions. Retained outposts use their own dates.
    const tolerance = Math.max(5, .0004 * extent);
    if (previous && previous.until === a && Math.abs(extent - previous.area) <= tolerance &&
      area(clip.xor(previous.coordinates, coordinates)) <= tolerance) {
      previous.until = b;
    } else {
      add(id, name, type, a, b, coordinates, extra);
      previous = versions.at(-1);
      previous.area = extent;
    }
  }
  if (versions.length === start) console.warn('No sourced outline for ' + id + ' in ' + from + '–' + (until - 1));
}
addTerritories({add, modern, atlas, historical, box, cut, minus, union, series});

if (importing) {
  fs.mkdirSync(path.dirname(cache), {recursive: true});
  fs.writeFileSync(cache, gzip({...sources, world: sources.world.filter(f => usedMapUnits.has(f.properties.code))}));
}
for (const year of range(firstYear, lastYear + 1)) {
  const live = versions.filter(v => v.from <= year && v.until > year);
  assert.equal(live.length, new Set(live.map(v => v.id)).size, 'Overlapping dates for the same unit in ' + year);
}

// Several statuses can reuse the exact same geometry. Node the remaining
// outlines together once so all years share the same non-overlapping faces.
// Great Britain and Northern Ireland keep the exact first-level polygons
// used by the modern map. Only their dated grouping changes.
const homeIds = new Set(['england', 'scotland', 'wales', 'ireland', 'northern-ireland']);
const shared = await sharedOverseasLand(versions, {load, topology: buildTopology, merge, polygons, fc, cut, box});
console.log('Aligning Australian history to the atlas coastline');
const australia = await australiaHistoryMesh(versions, {load, topology: buildTopology, merge, lineIndex});
const australiaStart = shared.length;
shared.push(...australia);
const sharedVersions = new Set(shared.flatMap(entry => entry.owners));
const geometryIds = new Map(), inputs = [], versionsForGeometry = [];
for (const [i, version] of versions.entries()) {
  if (homeIds.has(version.id) || sharedVersions.has(i)) continue;
  const key = JSON.stringify(version.coordinates);
  if (!geometryIds.has(key)) {
    geometryIds.set(key, inputs.length);
    inputs.push(record(version.coordinates, {g: inputs.length}));
    versionsForGeometry.push([]);
  }
  versionsForGeometry[geometryIds.get(key)].push(i);
}
console.log('Building UK history mosaic from', inputs.length, 'unique outlines');
const prepared = await simplify(inputs, .004);
const instructions = [
  '-i in.json name=outlines',
  '-mosaic target=outlines + name=faces calc="geometries=collect(g)"',
  '-points inner target=faces + name=labels',
  '-o target=faces,labels format=topojson no-quantization out.json'
].join(' ');
const files = await mapshaper.applyCommands(instructions, {'in.json': JSON.stringify(prepared)});
const topology = JSON.parse(files['out.json']);
const faceTopology = topology.objects.faces.geometries;
const labels = topology.objects.labels.geometries;
const ownerVersions = [], bounds = [], areas = [], features = [], owners = new Map();
for (const [i, f] of faceTopology.entries()) {
  const geometry = feature(topology, f).geometry;
  if (!geometry) continue;
  const size = geographicAreaKm2(geometry);
  if (!size || !f.properties.geometries?.length) continue;
  const n = features.length;
  for (const side of new Set(f.arcs.flat(Infinity))) {
    const i = side < 0 ? ~side : side;
    if (!owners.has(i)) owners.set(i, new Set());
    owners.get(i).add(n);
  }
  ownerVersions.push([...new Set(f.properties.geometries.flatMap(i => versionsForGeometry[i]))].sort((a, b) => a - b));
  bounds.push(geographicBounds(geometry));
  areas.push(size);
  features.push({type: 'Feature', properties: {f: n}, geometry, label: labels[i].coordinates});
}
const arcs = [...owners].map(([arc, uses]) => {
  assert(uses.size <= 2, 'A historical edge separates at most two land faces');
  const [l, r = -1] = uses;
  return {type: 'Feature', properties: {a: arc, l, r}, geometry: feature(topology, {type: 'LineString', arcs: [arc]}).geometry};
});
// Keep the Irish Republic portion outside the exact Northern Ireland
// outline. The present-day land frontier comes from the UK's existing line
// asset and only appears after partition.
const frontier = await load('europe/united-kingdom/international.bin');
const northernIreland = britishLand.find(f => f.properties.id === 'GB-R-TLN');
const northernLand = polygons(northernIreland.geometry);
const vertices = new Set(northernLand.flat(2).map(String));
const irishFrontier = frontier.features.filter(f => f.geometry.coordinates.every(point => vertices.has(String(point))));
assert(irishFrontier.length, 'The modern UK–Ireland frontier is available');
const republic = union(...atlasShapes.get('ireland').map(f => polygons(f.geometry)));
const island = versions.find(v => v.id === 'ireland').coordinates;
const frontierStrip = await command(fc(irishFrontier), '-buffer radius=200m', {precision: .000001});
const joins = cut(union(...frontierStrip.features.map(f => polygons(f.geometry))), island);
const outside = await command({
  'republic.json': fc([record(republic), record(joins)]),
  'north.json': fc([northernIreland])
}, '-dissolve2 -erase north.json');
const remainder = outside.features.flatMap(f => polygons(f.geometry));
const homeFeatures = [...britishLand, record(remainder, {id: 'irish-remainder'})];
const homeMesh = buildTopology({land: fc(homeFeatures)});
const homeLabels = await command(fc(homeFeatures), '-points inner', {precision: null});
const homeOwners = new Map();
for (const [i, cell] of homeMesh.objects.land.geometries.entries()) {
  const id = cell.properties.id;
  const nation = id === 'GB-R-TLM' ? 'scotland' : id === 'GB-R-TLL' ? 'wales' : 'england';
  const keys = id === 'GB-R-TLN' ? ['ireland', 'northern-ireland'] : id === 'irish-remainder' ? ['ireland'] : [nation];
  const geometry = homeFeatures[i].geometry;
  const n = features.length;
  const hostId = id === 'irish-remainder' ? {} : {hostId: id};
  ownerVersions.push(versions.flatMap((v, j) => keys.includes(v.id) ? [j] : []));
  bounds.push(geographicBounds(geometry));
  areas.push(geographicAreaKm2(geometry));
  features.push({type: 'Feature', properties: {f: n, ...hostId}, geometry, label: homeLabels.features[i].geometry.coordinates});
  for (const side of new Set(cell.arcs.flat(Infinity).map(a => a < 0 ? ~a : a))) {
    if (!homeOwners.has(side)) homeOwners.set(side, []);
    homeOwners.get(side).push(n);
  }
}
const irishRemainderFace = features.length - 1;
const northernIrelandFace = features.findIndex(f => f.properties.hostId === 'GB-R-TLN');
const distanceToFrontier = lineIndex(irishFrontier.map(f => f.geometry.coordinates));
let nextHomeArc = arcs.reduce((max, f) => Math.max(max, f.properties.a + 1), 0);
const addHomeArc = (coordinates, l, r) => {
  arcs.push({type: 'Feature', properties: {a: nextHomeArc++, l, r, exact: true},
    geometry: {type: 'LineString', coordinates}});
};
for (const [side, [l, r = -1]] of homeOwners) {
  const {coordinates} = feature(homeMesh, {type: 'LineString', arcs: [side]}).geometry;
  if (r >= 0 || l !== northernIrelandFace && l !== irishRemainderFace) {
    addHomeArc(coordinates, l, r);
    continue;
  }
  // Erasing Northern Ireland can subdivide a shared segment on the Irish
  // side, even though it lies on the same land frontier. Assign that stroke
  // to the exact Northern Ireland side so a unified Ireland has no interior
  // selection stroke and the later Northern Ireland outline draws it once.
  let from = 0, isFrontier;
  const append = (until, onFrontier) => {
    if (!onFrontier || l === northernIrelandFace) {
      addHomeArc(coordinates.slice(from, until + 1), l, onFrontier ? irishRemainderFace : -1);
    }
    from = until;
  };
  for (let i = 1; i < coordinates.length; i++) {
    const [a, b] = [coordinates[i - 1], coordinates[i]];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const onFrontier = [a, mid, b].every(point => distanceToFrontier(point) < 2);
    if (isFrontier !== undefined && isFrontier !== onFrontier) append(i - 1, isFrontier);
    isFrontier = onFrontier;
  }
  append(coordinates.length - 1, isFrontier);
}
// Shared modern outlines can cover the same ground as an earlier dated
// reconstruction. Their intervals are kept separate for drawing and picking.
const sharedLabels = await command(fc(shared.map(({geometry}, id) => ({type: 'Feature', properties: {id}, geometry}))), '-points inner', {precision: null});
const labelsByOutline = new Map(sharedLabels.features.map(f => [f.properties.id, f.geometry.coordinates]));
const australiaFaces = [];
for (const [i, {geometry, owners, properties}] of shared.entries()) {
  const f = features.length;
  const shape = {type: 'Feature', properties: {f, ...properties}, geometry};
  features.push({...shape, label: labelsByOutline.get(i)});
  ownerVersions.push(owners);
  bounds.push(geographicBounds(geometry));
  areas.push(geographicAreaKm2(geometry));
  // Only a territory's own edges participate in its selection outline.
  // Coincident copies belonging to earlier intervals are not adjacencies.
  if (i >= australiaStart) australiaFaces.push(shape);
  else for (const polygon of polygons(geometry)) {
    for (const ring of polygon) addHomeArc(ring, f, -1);
  }
}
const australiaTopology = buildTopology({land: fc(australiaFaces)});
const australiaOwners = new Map();
for (const cell of australiaTopology.objects.land.geometries) {
  for (const side of new Set(cell.arcs.flat(Infinity).map(a => a < 0 ? ~a : a))) {
    if (!australiaOwners.has(side)) australiaOwners.set(side, []);
    australiaOwners.get(side).push(cell.properties.f);
  }
}
for (const [side, [l, r = -1]] of australiaOwners) {
  const {coordinates} = feature(australiaTopology, {type: 'LineString', arcs: [side]}).geometry;
  addHomeArc(coordinates, l, r);
}
const borders = irishFrontier.map((f, b) => ({...f, properties: {...f.properties, b}}));
const boxUnion = ([[w, s], [e, n]], [[a, b], [x, y]]) =>
  [[Math.min(w, a), Math.min(s, b)], [Math.max(e, x), Math.max(n, y)]];
const navigationBounds = (parts, label) => {
  const span = parts.reduce(boxUnion);
  if (span[1][0] - span[0][0] < 180) return span;
  // Use the longitude copy nearest the label to fit archipelagos that
  // straddle the antimeridian without changing the stored geometry.
  return parts.map(([[w, s], [e, n]]) => {
    const shift = 360 * Math.round((label[0] - (w + e) / 2) / 360);
    return [[w + shift, s], [e + shift, n]];
  }).reduce(boxUnion);
};
const authoredEvents = Map.groupBy(events, ([date]) => +date.slice(0, 4));
const yearData = {}, configurations = [], calendar = {}, configIndices = new Map();
let lastActive = new Map(), largestOverlap = {area: 0};
for (const year of range(firstYear, lastYear + 1)) {
  const active = new Map();
  const onFace = ownerVersions.map((ids, f) => {
    const available = ids.filter(i => versions[i].from <= year && versions[i].until > year);
    // More specific, later-declared boundaries win over broad source extents
    // where their coasts or a later survey cross the older reconstruction.
    const chosen = available.at(-1) ?? -1;
    if (available.length > 1 && areas[f] > largestOverlap.area) {
      largestOverlap = {area: areas[f], year, units: available.map(i => versions[i].name)};
    }
    if (chosen < 0) return -1;
    if (!active.has(chosen)) active.set(chosen, []);
    active.get(chosen).push(f);
    return chosen;
  });
  const key = onFace.join(',');
  let index = configIndices.get(key);
  if (index === undefined) {
    index = configurations.length;
    configIndices.set(key, index);
    const ordered = [...active.keys()].sort((a, b) => a - b);
    const byVersion = new Map(ordered.map((v, i) => [v, i]));
    const units = ordered.map(v => {
      const {id, name, type, label: preferred, note} = versions[v];
      const parts = active.get(v);
      const biggest = parts.reduce((a, b) => areas[a] >= areas[b] ? a : b);
      const label = preferred || features[biggest].label;
      return {
        id, key: id, name, type, label,
        bounds: navigationBounds(parts.map(f => bounds[f]), label),
        ...(note ? {note} : {})
      };
    });
    const lines = [], frontiers = [];
    for (const {properties: {a, l, r}} of arcs) {
      if (r < 0 || onFace[l] === onFace[r] || l === irishRemainderFace || r === irishRemainderFace) continue;
      (onFace[l] < 0 || onFace[r] < 0 ? frontiers : lines).push(a);
    }
    configurations.push({units, face: onFace.map(v => byVersion.get(v) ?? -1), lines, frontiers, borders: year < 1922 ? [] : borders.map(f => f.properties.b), partOf: {}});
  }
  yearData[year] = {date: endOf(year), config: index};
  const present = new Map([...active.keys()].map(i => [versions[i].id, i]));
  const authored = authoredEvents.get(year) || [];
  const described = new Set(authored.flatMap(row => row[3]));
  const changes = authored.map(([date, name, text]) => ({date, name, text}));
  if (year > firstYear) {
    for (const id of new Set([...present.keys(), ...lastActive.keys()])) {
      if (described.has(id) || present.get(id) === lastActive.get(id)) continue;
      const before = versions[lastActive.get(id)], now = versions[present.get(id)];
      if (before && now && before.name === now.name && before.type === now.type && before.coordinates === now.coordinates) continue;
      const name = (now || before).name;
      const text = !before ? 'First year-end shown under this status.' :
        !now ? 'Leaves this map of British territories and administrations.' :
        now.type !== before.type ? 'Status changes to ' + now.type.toLowerCase() + '.' :
        now.name !== before.name ? 'Previously shown as ' + before.name + '.' :
        'The mapped extent changes this year.';
      changes.push({when: String(year), name, text});
    }
  }
  if (changes.length) calendar[year] = changes.sort((a, b) => (a.date || endOf(year)).localeCompare(b.date || endOf(year)));
  lastActive = present;
}

const coasts = await writeUKCoasts({features, ownerVersions, versions, configs: configurations, years: yearData, baseArcs: arcs, australiaFaces, load, lineIndex,
  topology: buildTopology, feature, merge, output});
await alignCanonicalLabels(features,configurations);
// Regional selection reads the canonical coast. Keep a legacy arc only when
// an unreplaced neighbouring face still needs it for its outline.
const canonicalFaces = new Set(coasts.flatMap(region=>region.faces));
const keepArc = ({properties:p}) => !p.selectionOnly ||
  p.l>=0&&!canonicalFaces.has(p.l) || p.r>=0&&!canonicalFaces.has(p.r);
const data = {
  coasts,
  coastWater: await writeUKCoastWater(output,coasts),
  source: {name: 'Cliopatria v0.2.1 and Boundary Atlas', url: clioSource, lastDate: endOf(lastYear)},
  versions: [],
  configs: configurations,
  years: yearData,
  events: calendar,
  faces: fc(features.map(({label, ...f}) => f)),
  arcs: fc(arcs.filter(keepArc)),
  borders: fc(borders)
};
fs.mkdirSync(output, {recursive: true});
const bytes = gzipSync(encodeGeo(data, {source: clioSource}, {scale: 1e7}), {level: 9});
fs.writeFileSync(output + '/borders.bin', bytes);
console.log(Object.keys(yearData).length, 'year-ends,', configurations.length, 'configurations,',
  features.length, 'faces,', new Set(versions.map(v => v.id)).size, 'territories,', bytes.length, 'bytes');
if (largestOverlap.area) console.log('Largest source overlap resolved:', largestOverlap.area.toFixed(1), 'km²,',
  largestOverlap.year, largestOverlap.units.join(' / '));
