import {topology} from 'topojson-server';
import {feature} from 'topojson-client';

// The retained Cuban coast follows a roughly one-arcsecond raster (about 30 m).
// Limit corner cuts to one cell on either side.
const cell = 1 / 3600;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

function gridAxis(a, b) {
  const x = Math.abs(a[0] - b[0]), y = Math.abs(a[1] - b[1]);
  if (Math.min(x, y) > .075 * Math.max(x, y)) return -1;
  return x > y ? 0 : 1;
}

function smoothArc(points, closed) {
  const n = points.length - Number(closed);
  if (n < 6) return points;
  const axes = points.slice(1).map((p, i) => gridAxis(points[i], p));
  const turns = Array.from({length: n}, (_, i) => {
    if (!closed && (i === 0 || i === n - 1)) return false;
    const prev = points[(i + n - 1) % n], p = points[i], next = points[(i + 1) % n];
    // The source excludes the Guantanamo naval base, including its land boundary.
    if (p[0] > -75.27 && p[0] < -75.04 && p[1] > 19.88 && p[1] < 20.05) return false;
    const a = axes[(i + n - 1) % n], b = axes[i];
    return a >= 0 && b >= 0 && a !== b &&
      Math.min(Math.hypot(prev[0]-p[0], prev[1]-p[1]), Math.hypot(next[0]-p[0], next[1]-p[1])) <= 3.1 * cell;
  });
  const out = [], anchors = [0];
  function append(p) {
    if (!out.length || !same(out.at(-1), p)) out.push(p);
  }
  function cut(p, q) {
    const fraction = Math.min(.5, cell / Math.hypot(q[0]-p[0], q[1]-p[1]));
    return p.map((v, i) => Number((v + (q[i]-v)*fraction).toFixed(6)));
  }
  for (let i = 0; i < n; i++) {
    const before = (i + n - 1) % n, after = (i + 1) % n;
    if (turns[i] && (turns[before] || turns[after])) {
      append(cut(points[i], points[before]));
      append(cut(points[i], points[after]));
    } else {
      append(points[i]);
      anchors.push(out.length - 1);
    }
  }
  if (closed) append(out[0]);
  anchors.push(out.length - 1);
  // Simplify the new diagonals within a quarter cell. Retain original vertices
  // outside treated runs and keep the endpoints where administrative borders meet.
  const keep = new Set(anchors);
  const spans = anchors.slice(1).map((end, i) => [anchors[i], end]);
  while (spans.length) {
    const [lo, hi] = spans.pop();
    const a = out[lo], b = out[hi], dx = b[0]-a[0], dy = b[1]-a[1];
    const length2 = dx*dx + dy*dy;
    let farthest = -1, limit = (cell / 4) ** 2;
    for (let i = lo + 1; i < hi; i++) {
      const x = out[i][0]-a[0], y = out[i][1]-a[1];
      const t = length2 ? Math.max(0, Math.min(1, (x*dx + y*dy) / length2)) : 0;
      const distance2 = (x-t*dx)**2 + (y-t*dy)**2;
      if (distance2 > limit) { farthest = i; limit = distance2; }
    }
    if (farthest !== -1) {
      keep.add(farthest);
      spans.push([lo, farthest], [farthest, hi]);
    }
  }
  const reduced = [...keep].sort((a,b) => a-b).map(i => out[i]);
  return same(out[0], out.at(-1)) && reduced.length < 4 ? out : reduced;
}

export function smoothCubaCoast(provinces, municipalities) {
  const graph = topology({provinces, municipalities});
  const exterior = new Set(), protectedArcs = new Set(), endpoints = new Map();
  for (const region of graph.objects.municipalities.geometries) {
    const polygons = region.type === 'Polygon' ? [region.arcs] : region.arcs;
    for (const rings of polygons) {
      for (const [index, ring] of rings.entries()) {
        for (const ref of ring) {
          const id = ref < 0 ? ~ref : ref;
          if (index || exterior.has(id)) protectedArcs.add(id);
          else exterior.add(id);
        }
      }
    }
  }
  for (const arc of graph.arcs) {
    for (const p of [arc[0], arc.at(-1)]) {
      const key = p.join(',');
      endpoints.set(key, (endpoints.get(key) || 0) + 1);
    }
  }
  for (const id of exterior) {
    if (protectedArcs.has(id)) continue;
    const arc = graph.arcs[id];
    const isolatedRing = same(arc[0], arc.at(-1)) && endpoints.get(arc[0].join(',')) === 2;
    graph.arcs[id] = smoothArc(arc, isolatedRing);
  }
  for (const [name, collection] of Object.entries({provinces, municipalities})) {
    const shapes = feature(graph, graph.objects[name]);
    collection.features.forEach((f, i) => { f.geometry = shapes.features[i].geometry; });
  }
}
