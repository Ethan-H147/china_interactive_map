import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeData} from '../dist/geo-pack.mjs';
import {packShapes, shapeAtLocation} from '../dist/historic-borders.mjs';
import {polygonParts} from '../dist/polygon-parts.mjs';
import {ukHistory} from '../dist/uk-history.mjs';
import {landIndex, polygons} from './geo-index.mjs';
import {geographicAreaKm2} from './geographic-area.mjs';
import {firstYear, lastYear} from './uk-history-territories.mjs';

const root = (process.env.ATLAS_UK_HISTORY_OUTPUT || 'dist/data/europe/united-kingdom/history').replace(/\/$/, '') + '/';
const bytes = fs.readFileSync(root + 'borders.bin');
const data = await decodeData(bytes);
const shapes = packShapes(polygonParts(data.faces).features);
const modern = await decodeData(fs.readFileSync('dist/data/europe/united-kingdom/all.bin'));
const modernLand = new Map((modern.levels[0] || modern.levels[1]).regions.features.map(f => [f.properties.id, f.geometry]));
const hostFaces = data.faces.features.filter(f => f.properties.hostId);
assert.equal(hostFaces.filter(f => f.properties.hostId.startsWith('GB-R-')).length, 12);
assert(hostFaces.some(f => f.properties.hostId === 'GB-O-BM'));
for (const {geometry, properties: {hostId}} of hostFaces) {
  assert.deepEqual(geometry, modernLand.get(hostId), hostId + ' uses the modern vertices and rings');
}
const modernHongKong = await decodeData(fs.readFileSync('dist/data/china-mobile/provinces.bin'));
const hongKongShape = modernHongKong.features.find(f => String(f.properties.adcode) === '810000');
const sharedHongKong = data.faces.features.find(f => f.properties.sharedSource === 'china-mobile/provinces.bin' && !f.properties.historicalExtent);
assert.deepEqual(sharedHongKong.geometry, hongKongShape.geometry);
const island = hongKongShape.geometry.coordinates.find(p => landIndex(p)([114.17, 22.275]));
const earlyHongKong = data.faces.features.find(f => f.properties.historicalExtent === 'island');
assert.deepEqual(earlyHongKong.geometry.coordinates, [island], 'The early colony uses the complete modern island coast');
const years = Array.from({length: lastYear - firstYear + 1}, (_, i) => i + firstYear);
const config = year => data.configs[data.years[year].config];
const at = (year, [lng, lat]) => {
  const dated = config(year);
  const hit = shapeAtLocation(shapes, {lng, lat}, ({f}) => dated.face[f] >= 0);
  return hit ? dated.units[dated.face[hit.properties.f]] : undefined;
};
const check = (year, point, expected) => assert.equal(at(year, point)?.name, expected, year + ' at ' + point);

assert.deepEqual(Object.keys(data.years).map(Number), years);
for (const year of years) assert.equal(data.years[year].date, year + '-12-31');
assert.equal(data.years[1708].config, data.years[1709].config);
assert.equal(data.years[2024].config, data.years[2025].config);
assert.deepEqual(config(1921).borders, []);
assert(config(1922).borders.length > 0, 'The existing UK–Ireland land frontier appears in 1922');
const segment = (a, b) => [a.join(','), b.join(',')].sort().join('|');
const frontier = new Set(data.borders.features.flatMap(f => f.geometry.coordinates.slice(1)
  .map((b, i) => segment(f.geometry.coordinates[i], b))));
const union = config(1801);
const ireland = union.units.findIndex(unit => unit.id === 'ireland');
for (const {properties: {l, r, exact}, geometry} of data.arcs.features) {
  if (!exact || (union.face[l] === ireland) === (union.face[r] === ireland)) continue;
  assert(!geometry.coordinates.slice(1).some((b, i) => frontier.has(segment(geometry.coordinates[i], b))),
    'Selecting all Ireland before partition leaves out the modern land frontier');
}
assert(data.configs.length < years.length, 'Identical maps share the same configuration');
assert(bytes.length < 12 * 1024 * 1024, 'The worldwide map is packed in one on-demand download');
const kinds = new Set(ukHistory.keys.map(([key]) => key));
const arcs = new Map(data.arcs.features.map(({properties: edge}) => [edge.a, edge]));
const territories = new Set();
for (const [index, dated] of data.configs.entries()) {
  const year = years.find(y => data.years[y].config === index);
  assert(year, 'Each stored configuration is used');
  assert.equal(dated.face.length, data.faces.features.length);
  assert(dated.face.every(i => Number.isInteger(i) && i >= -1 && i < dated.units.length));
  assert.equal(new Set(dated.units.map(unit => unit.id)).size, dated.units.length);
  for (const unit of dated.units) {
    territories.add(unit.id);
    assert(kinds.has(ukHistory.kind(unit)), 'Legend includes ' + unit.type);
    assert(unit.label.every(Number.isFinite) && unit.bounds.flat().every(Number.isFinite));
    assert.equal(at(year, unit.label)?.id, unit.id, year + ' label for ' + unit.name + ' falls on its own land');
  }
  for (const [edgeIds, outer] of [[dated.lines, false], [dated.frontiers, true]]) {
    for (const id of edgeIds) {
      const edge = arcs.get(id);
      assert(edge && !edge.selectionOnly && !edge.coast, 'Only administrative border edges are drawn');
      const {l, r} = edge;
      const left = dated.face[l] ?? -1, right = dated.face[r] ?? -1;
      assert((l >= 0 || r >= 0) && left !== right, 'Each drawn edge separates two assignments');
      assert.equal(left < 0 || right < 0, outer);
    }
  }
}

const dublin = [-6.26, 53.35], belfast = [-5.93, 54.60];
check(1707, [-.13, 51.51], 'England');
check(1707, [-3.2, 55.95], 'Scotland');
check(1707, [-3.18, 51.49], 'Wales');
check(1800, dublin, 'Kingdom of Ireland');
check(1801, dublin, 'Ireland');
check(1921, dublin, 'Ireland');
check(1922, dublin, undefined);
check(1922, belfast, 'Northern Ireland');

const boston = [-71.06, 42.36], florida = [-81.38, 28.54], winnipeg = [-97.14, 49.9];
check(1707, boston, 'British American colonies');
check(1775, boston, 'Thirteen Colonies');
check(1783, boston, undefined);
check(1762, florida, undefined);
check(1763, florida, 'East and West Florida');
check(1783, florida, undefined);
// Southern colonial claims meet the dated Floridas without a coarse-source
// wedge. West Florida's northward extension takes effect in its own year.
for (const year of [1763,1764,1775]) {
  for (const point of [[-83.28,30.83],[-84.15,31.58],[-84.6,32]]) check(year, point, 'Thirteen Colonies');
}
check(1763, [-89.5,31.7], 'Thirteen Colonies');
check(1764, [-89.5,31.7], 'East and West Florida');
check(1775, [-85.3,31.9], 'East and West Florida');
check(1775, [-88,31.001], 'East and West Florida');
check(1775, [-88,32.45], 'East and West Florida');
check(1775, [-88,32.5], 'Thirteen Colonies');
check(1775, [-89.5,32.7], 'Thirteen Colonies');
check(1776, [-83.28,30.83], 'British claims in the American Revolution');
check(1783, [-83.28,30.83], undefined);

check(1869, winnipeg, 'Rupert’s Land');
check(1870, winnipeg, 'Dominion of Canada');
check(1931, winnipeg, undefined);
check(1926, [-62, 53], 'Dominion of Canada');
check(1927, [-62, 53], 'Dominion of Newfoundland');

const sydney = [151.21, -33.87], delhi = [77.22, 28.61], hongKong = [114.17, 22.275];
check(1787, sydney, undefined);
check(1788, sydney, 'New South Wales');
check(1901, sydney, 'Commonwealth of Australia');
check(1942, sydney, undefined);
const perth = [115.86, -31.95], hobart = [147.32, -42.88], melbourne = [144.96, -37.81];
check(1788, perth, undefined);
check(1829, perth, 'Western Australia');
check(1824, hobart, 'New South Wales');
check(1825, hobart, 'Van Diemen’s Land');
check(1850, melbourne, 'New South Wales');
check(1851, melbourne, 'Victoria');
check(1860, [140.5, -20.7], 'New South Wales');
check(1862, [140.5, -20.7], 'Queensland');
check(1862, [133.88, -23.70], 'New South Wales');
check(1863, [133.88, -23.70], 'South Australia and Northern Territory');
const australiaSource = 'europe/australia/context.bin';
const coast = await decodeData(fs.readFileSync('dist/data/' + australiaSource));
const mainland = coast.features.filter(f => !f.properties.region || ['AU-JBT', 'AU-MAC'].includes(f.properties.region));
const canonicalAustralia = await decodeData(fs.readFileSync(root+'coasts/australia.bin'));
const modernArea = canonicalAustralia.faces.features.filter(f=>config(1901).units[config(1901).face[f.properties.f]]?.id==='australia').reduce((n,f)=>n+geographicAreaKm2(f.geometry),0);
const federated = config(1901);
const painted = data.faces.features.filter(f => f.properties.sharedSource === 'canonical-coast:australia' && federated.units[federated.face[f.properties.f]]?.id === 'australia');
const paintedArea = painted.reduce((n, f) => n + geographicAreaKm2(f.geometry), 0);
assert(Math.abs(paintedArea / modernArea - 1) < .00001, 'Federated Australia covers the canonical modern land');
const coastVertices = new Set(mainland.flatMap(f => polygons(f.geometry).flat(2).map(String)));
const historyVertices = new Set(painted.flatMap(f => polygons(f.geometry).flat(2).map(String)));
const canonicalVertices = new Set(canonicalAustralia.faces.features.flatMap(f=>polygons(f.geometry).flat(2).map(String)));
assert([...historyVertices].filter(p=>canonicalVertices.has(p)).length / historyVertices.size > .999,
  'Australian overview coordinates come from the same canonical detailed mesh');
assert(data.coasts.some(r=>r.id==='australia'), 'Australian coastline is available on demand');
const coastFaces = new Set();
for (const region of data.coasts) {
  const bytes = fs.readFileSync(root + region.file);
  assert(bytes.length < 25 * 1024 * 1024, 'Regional coast file stays within the hosting limit');
  const detailed = await decodeData(bytes);
  assert.deepEqual(region.faces, detailed.affected);
  assert.deepEqual(detailed.faces.features.map(f=>f.properties.f).filter(f=>f>=0).sort((a,b)=>a-b), [...region.faces].sort((a,b)=>a-b));
  for (const f of region.faces) {
    assert(data.faces.features[f] && !coastFaces.has(f), 'Detailed geometry owns a single existing dated face');
    coastFaces.add(f);
  }
  if (region.id==='north-america') {
    const probes = [
      [1707,[-73.21,40.703],'atlantic-colonies'], [1707,[-70.2,41.7],'atlantic-colonies'],
      [1707,[-81.65,30.1],undefined], [1763,[-83.28,30.83],'atlantic-colonies'],
      [1763,[-81.65,30.1],'floridas'], [1763,[-89.5,31.7],'atlantic-colonies'],
      [1764,[-89.5,31.7],'floridas'], [1775,[-85.3,31.9],'floridas'],
      [1775,[-84.15,31.58],'atlantic-colonies'], [1775,[-88,31.001],'floridas'], [1775,[-88,32.45],'floridas'], [1775,[-88,32.5],'atlantic-colonies'], [1783,[-81.65,30.1],undefined],
      [1750,[-64.515,49.87],undefined], [1763,[-64.515,49.87],'canada'],
      [1791,[-64.515,49.87],'canada'], [1930,[-64.515,49.87],'canada'], [1931,[-64.515,49.87],undefined],
      [1763,[-63.62,44.65],'nova-scotia'], [1763,[-56,49],'newfoundland'],
      [1926,[-62,53],'canada'], [1927,[-62,53],'newfoundland']
    ];
    const indexed = detailed.faces.features.filter(f=>f.properties.f>=0)
      .map(f=>({f:f.properties.f,inside:landIndex(polygons(f.geometry).flat(1))}));
    for (const [year,point,expected] of probes) {
      const dated=config(year);
      const hits=indexed.filter(f=>f.inside(point)).map(f=>dated.units[dated.face[f.f]]?.id).filter(Boolean);
      assert.deepEqual(hits,expected?[expected]:[],year+' detailed coast assignment at '+point);
    }
  }
  if (region.id!=='australia') continue;
  const nsw = config(1851);
  const precise = landIndex(detailed.faces.features.filter(f=>nsw.units[nsw.face[f.properties.f]]?.id==='new-south-wales').flatMap(f=>polygons(f.geometry).flat()));
  assert(precise([151.231,-33.8724]) && !precise([151.285,-33.8836]), 'The detailed Sydney coast fixes both land omissions and overhangs');
  assert(detailed.faces.features.reduce((n,f)=>n+polygons(f.geometry).flat(2).length,0) > 20 * coastVertices.size, 'The close-zoom mesh retains the detailed Australian shore');
}
const covered=new Set();
for(const dated of data.configs) dated.face.forEach((index,f)=>{
  const p=data.faces.features[f].properties;
  if(index>=0 && (p.hostId||p.sharedSource||coastFaces.has(f))) covered.add(dated.units[index].id);
});
assert.deepEqual([...territories].filter(id=>!covered.has(id)).sort(),
  ['botswana','eswatini','malawi','uganda','zambia','zimbabwe'], 'Only landlocked units are outside coastline coverage');
check(1946, delhi, 'British Raj');
check(1947, delhi, undefined);
check(1842, hongKong, 'Hong Kong Island');
check(1842, [114.17, 22.295], undefined);
check(1860, [114.17, 22.295], undefined);
check(1859, [114.17, 22.312], undefined);
check(1860, [114.17, 22.312], 'Hong Kong Island and Kowloon');
check(1897, [114.20, 22.38], undefined);
check(1898, [114.20, 22.38], 'Hong Kong');
check(1996, hongKong, 'Hong Kong');
check(1997, hongKong, undefined);

const rotuma = [177.071, -12.502];
check(1880, rotuma, undefined);
check(1881, rotuma, 'Fiji');
check(1970, rotuma, undefined);
for (const island of [[46.2525, -9.4924], [53.6496, -5.7031], [51.1279, -10.225]]) {
  check(1964, island, 'Seychelles');
  check(1965, island, 'British Indian Ocean Territory');
  check(1975, island, 'British Indian Ocean Territory');
  check(1976, island, undefined);
}
check(1888, [-60.7996, 11.14], 'Tobago');
check(1889, [-60.7996, 11.14], 'Trinidad and Tobago');
check(1950, [-175.162, -21.26], 'Tonga');
check(1950, [184.838, -21.26], 'Tonga');

const ho = [.471, 6.611], buea = [9.24, 4.16], zanzibar = [39.26, -6.16];
check(1956, ho, 'British Togoland');
check(1957, ho, undefined);
check(1960, buea, 'Southern Cameroons');
check(1961, buea, undefined);
check(1962, zanzibar, 'Zanzibar Protectorate');
check(1963, zanzibar, undefined);
assert.equal(at(1922, buea)?.type, 'League of Nations mandate');
assert.equal(at(1946, buea)?.type, 'UN trust territory');
check(2025, [-57.85, -51.71], 'Falkland Islands');
check(2025, [72.408, -7.31], 'British Indian Ocean Territory (Chagos Archipelago)');
check(2025, [-65, -72], 'British Antarctic Territory');
assert(data.events[2025].some(change => change.name === 'Chagos agreement'));
assert(territories.size > 100);

console.log('UK history:', years.length, 'years,', data.configs.length, 'configurations and', territories.size,
  'territories validated, with interior labels, shared edges and historical transition probes.');
