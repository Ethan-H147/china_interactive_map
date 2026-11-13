import assert from 'node:assert/strict';
import {landIndex, linesOf, polygons} from './geo-index.mjs';
import {command, fc} from './build-regional-dataset.mjs';

const source = 'europe/australia/context.bin';
const states = ['AU-WA', 'AU-NT', 'AU-SA', 'AU-QLD', 'AU-NSW', 'AU-VIC', 'AU-TAS', 'AU-ACT', 'AU-JBT'];
const ids = new Set(['new-south-wales', 'western-australia', 'tasmania', 'south-australia', 'victoria', 'queensland', 'australia']);
const line = coordinates => ({type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates}});
const pointDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// The regional border files end at the full-resolution shoreline. Carry a
// coastal endpoint out to sea so it also crosses the context shoreline.
function extend(path) {
  const [x, y] = path[0];
  const next = path.find(p => pointDistance(p, path[0]) > .002);
  const scale = .04 / pointDistance(next, path[0]);
  return [x + (x - next[0]) * scale, y + (y - next[1]) * scale];
}

function colonyAt(year, state, [x, y]) {
  if (year >= 1901) return 'australia';
  if (year < 1825) return x >= 135 && x <= 155 ? 'new-south-wales' : undefined;
  if (state === 'AU-WA') return year >= 1829 ? 'western-australia' : undefined;
  if (state === 'AU-TAS') return 'tasmania';
  if (x > 155) return undefined;
  if (state === 'AU-VIC' && year >= 1851) return 'victoria';
  if (state === 'AU-QLD' && year >= 1859 && (year >= 1862 || x >= 141)) return 'queensland';
  if (state === 'AU-NT' && year >= 1863) return 'south-australia';
  if (year >= 1836 && (year >= 1861 || x >= 132) &&
      (state === 'AU-SA' || state === 'AU-QLD' && x < 141 && y < -26)) return 'south-australia';
  return 'new-south-wales';
}

export async function australiaHistoryMesh(versions, {load, topology, merge, lineIndex, detailed = false}) {
  const context = await load(source);
  const current = await load('europe/australia/first.bin');
  const stateShapes = current.regions.features.filter(f => states.includes(f.properties.id));
  const mainland = detailed ? (await command(fc(stateShapes), '-dissolve2', {precision: null})).features :
    context.features.filter(f => !f.properties.region || ['AU-JBT', 'AU-MAC'].includes(f.properties.region));
  const inLand = landIndex(mainland.flatMap(f => polygons(f.geometry).flat(1)));
  const shores = mainland.flatMap(f => polygons(f.geometry).flatMap(p => p.map(line)));
  const divisions = current.boundaries.features.flatMap(f => {
    const [a, b] = f.properties.owners;
    if (a === 'AU-ACT' || a === 'AU-JBT') return [];
    const [path] = linesOf(fc([f]));
    const first = ['AU-NSW/AU-QLD', 'AU-NT/AU-QLD'].includes(a + '/' + b);
    const last = ['AU-NSW/AU-VIC', 'AU-SA/AU-VIC', 'AU-SA/AU-WA', 'AU-NT/AU-WA'].includes(a + '/' + b);
    return [line([...(first ? [extend(path)] : []), ...path, ...(last ? [extend([...path].reverse())] : [])])];
  });
  const reduced = await command(fc(divisions), '-simplify dp interval=.00015 planar keep-shapes', {precision: null});
  const cuts = [
    [[135, -45], [135, -8]], // New South Wales in 1788
    [[132, -40], [132, -25.99]], // South Australia's original western limit
    [[141, -29.01], [141, -8]] // Queensland's original western limit
  ].map(line);
  // Node the dated inland boundaries against the existing context coast, leaving
  // the coastline vertices intact. Polygonization also yields closed water
  // faces, so retain only cells whose interior point lies on the original land.
  const mesh = await command(fc([...shores, ...reduced.features, ...cuts]), '-polygons', {precision: null});
  mesh.features.forEach((f, i) => { f.properties = {i}; });
  const points = await command(mesh, '-points inner', {precision: null});
  const stateIndices = stateShapes.map(({geometry, properties}) => {
    const rings = polygons(geometry).flat(1);
    return {id: properties.id, inside: landIndex(rings), rings};
  });
  let nearest;
  const matches = versions.flatMap((v, i) => ids.has(v.id) ? [{...v, i}] : []);
  const groups = new Map();
  for (const {properties: {i}, geometry: {coordinates: point}} of points.features) {
    if (!inLand(point)) continue;
    let state = stateIndices.find(s => s.inside(point))?.id;
    if (!state) {
      // An island in the simplified context can protrude slightly beyond its
      // surveyed counterpart. Resolve it using the nearest state coastline.
      nearest ??= stateIndices.map(s => ({id: s.id, distance: lineIndex(s.rings)}));
      const closest = nearest.reduce((best, s) => {
        const distance = s.distance(point);
        return distance < best.distance ? {id: s.id, distance} : best;
      }, {id: undefined, distance: Infinity});
      state = closest.id;
    }
    assert(state, 'Could not identify Australian land at ' + point);
    const owners = matches.filter(v => colonyAt(v.from, state, point) === v.id).map(v => v.i);
    const key = owners.join(',');
    if (!groups.has(key)) groups.set(key, {owners, cells: []});
    groups.get(key).cells.push(mesh.features[i]);
  }
  assert([...groups.values()].reduce((n, group) => n + group.cells.length, 0) > 1000,
    'Australian mesh retains the context islands');
  return [...groups.values()].map(({owners, cells}) => {
    const graph = topology({cells: fc(cells)});
    const geometry = merge(graph, graph.objects.cells.geometries);
    return {owners, geometry, properties: {sharedSource: source}};
  });
}
