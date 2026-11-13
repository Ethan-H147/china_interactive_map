import assert from 'node:assert/strict';

import {landIndex} from './geo-index.mjs';

const uk = 'united-kingdom';
const hongKong = 'china-mobile/provinces.bin';
const hongKongIsland = [114.17, 22.275];
const retained = {
  anguilla: 'AI', bermuda: 'BM', cayman: 'KY', chagos: 'IO',
  'cyprus-bases': 'SBA', gibraltar: 'GI', montserrat: 'MS',
  'south-georgia': 'GS', 'turks-caicos': 'TC', 'virgin-islands': 'VG'
};
const whole = {
  'antigua-barbuda': 'antigua-and-barbuda', bahamas: 'bahamas', barbados: 'barbados',
  belize: 'belize', dominica: 'dominica', grenada: 'grenada',
  jamaica: 'jamaica', malta: 'malta', mauritius: 'mauritius', nauru: 'nauru',
  'saint-lucia': 'saint-lucia', 'saint-vincent': 'saint-vincent-and-the-grenadines',
  tonga: 'tonga', tuvalu: 'tuvalu', vanuatu: 'vanuatu'
};
const inside = (coordinates, [w, s, e, n]) =>
  coordinates[0].every(([x, y]) => x >= w && x <= e && y >= s && y <= n);
const islandGroup = box => polygon => inside(polygon, box);
const detachedSeychelles = polygon => [
  [46.05, -9.92, 47.9, -8.95], // Aldabra group
  [50.8, -10.4, 51.5, -9.4],  // Farquhar group
  [53.57, -5.78, 53.76, -5.62] // Desroches
].some(box => inside(polygon, box));

// Each entry names a modern land source for a specific historical extent.
// Date limits select existing intervals in the chronology, including those
// where a change of status leaves the same geometry in use.
const references = [
  ...Object.entries(retained).map(([unit, code]) => ({unit, country: uk, id: 'GB-O-' + code, host: true})),
  ...Object.entries(whole).map(([unit, country]) => ({unit, country})),
  {unit: 'gambia', country: 'gambia', from: 1889},
  {unit: 'sierra-leone', country: 'sierra-leone', from: 1896},
  {unit: 'falklands', country: uk, id: 'GB-O-FK', from: 1833, host: true},
  {unit: 'pitcairn', country: uk, id: 'GB-O-PN', from: 1902, host: true},
  {unit: 'pitcairn', country: uk, id: 'GB-O-PN', until: 1902, part: islandGroup([-130.2, -25.2, -129.9, -24.9])},
  {unit: 'saint-helena', country: uk, id: 'GB-O-SH', part: islandGroup([-6.1, -16.2, -5.5, -15.8])},
  {unit: 'ascension', country: uk, id: 'GB-O-SH', part: islandGroup([-14.6, -8.2, -14, -7.6])},
  {unit: 'tristan', country: uk, id: 'GB-O-SH', part: islandGroup([-14, -41, -9, -36])},
  {unit: 'kitts-nevis', country: 'saint-kitts-and-nevis', until: 1713,
    ids: id => ['KN-04', 'KN-05', 'KN-07', 'KN-10', 'KN-12'].includes(id)},
  {unit: 'kitts-nevis', country: 'saint-kitts-and-nevis', from: 1713},
  {unit: 'trinidad', country: 'trinidad-and-tobago', until: 1889, ids: id => id !== 'TT90'},
  {unit: 'tobago', country: 'trinidad-and-tobago', id: 'TT90'},
  {unit: 'trinidad', country: 'trinidad-and-tobago', from: 1889},
  {unit: 'norfolk', file: 'europe/australia/context.bin', id: 'AU-NFK'},
  {unit: 'ceylon', country: 'sri-lanka', from: 1815},
  {unit: 'hong-kong', file: hongKong, id: '810000', until: 1860, extent: 'island'},
  {unit: 'hong-kong', file: hongKong, id: '810000', from: 1860, until: 1898, extent: 'kowloon'},
  {unit: 'hong-kong', file: hongKong, id: '810000', from: 1898},
  {unit: 'fiji', country: 'fiji', ids: id => id !== 'FJ-ROT'},
  {unit: 'fiji', country: 'fiji', id: 'FJ-ROT', from: 1881},
  {unit: 'seychelles', country: 'seychelles', until: 1965},
  {unit: 'seychelles', country: 'seychelles', from: 1965, part: polygon => !detachedSeychelles(polygon)},
  {unit: 'chagos', country: 'seychelles', from: 1965, until: 1976, part: detachedSeychelles}
];

export async function sharedOverseasLand(versions, {load, topology, merge, polygons, fc, cut, box}) {
  const files = new Map();
  const shared = [];
  for (const ref of references) {
    const file = ref.file || 'europe/' + ref.country + '/first.bin';
    if (!files.has(file)) files.set(file, await load(file));
    const data = files.get(file);
    const cells = (data.regions || data).features.filter(({properties}) => {
      const id = String(properties.id ?? properties.adcode ?? properties.region);
      return ref.ids ? ref.ids(id) : !ref.id || ref.id === id;
    });
    assert(cells.length, 'Missing modern land for ' + ref.unit);
    const geometry = cells.length === 1 ? cells[0].geometry : (() => {
      const mesh = topology({cells: fc(cells)});
      return merge(mesh, mesh.objects.cells.geometries);
    })();
    const parts = polygons(geometry);
    let coordinates = ref.part ? parts.filter(ref.part) : parts;
    if (ref.extent) {
      const island = parts.find(p => landIndex(p)(hongKongIsland));
      assert(island, 'Hong Kong Island is available in the modern coast');
      coordinates = [island];
      if (ref.extent === 'kowloon') {
        // Boundary Street and the former Stonecutters Island are approximated
        // on today's land. Offshore islands stay out until the 1898 lease.
        const mainland = parts.find(p => landIndex(p)([114.17, 22.312]));
        assert(mainland, 'Kowloon is available in the modern coast');
        coordinates.push(...cut([mainland], box(114.13, 22.299, 114.21, 22.3267)));
      }
    }
    assert(coordinates.length, 'Empty modern land for ' + ref.unit);
    const owners = versions.flatMap((v, i) => v.id === ref.unit &&
      v.from >= (ref.from ?? -Infinity) && v.until <= (ref.until ?? Infinity) ? [i] : []);
    assert(owners.length, 'No historical interval for ' + ref.unit);
    shared.push({
      owners,
      geometry: ref.part || ref.extent ? {type: 'MultiPolygon', coordinates} : geometry,
      properties: {sharedSource: file, ...(ref.host ? {hostId: ref.id} : {}), ...(ref.extent ? {historicalExtent: ref.extent} : {})}
    });
  }
  return shared;
}
