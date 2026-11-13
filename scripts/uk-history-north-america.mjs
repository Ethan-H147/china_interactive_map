import assert from 'node:assert/strict';
import {geographicAreaKm2} from './geographic-area.mjs';
import {command, fc, geographicBounds} from './build-regional-dataset.mjs';
import {polygons,landIndex} from './geo-index.mjs';

const empty = () => ({type: 'MultiPolygon', coordinates: []});
const valid = data => fc(data.features.filter(f => polygons(f.geometry).length));
const exact = (data, instruction) => command(data, instruction, {precision: .0000001});
const dissolve = async features => features.length ? valid(await exact(fc(features), '-dissolve2')) : fc([]);
async function overlay(source, mask, operation, clean = false) {
  if (!source.features.length) return source;
  if (!mask.features.length) return operation === 'clip' ? fc([]) : source;
  return valid(await exact({'source.json': source, 'mask.json': mask}, (clean ? '-clean gap-width=0 allow-overlaps ' : '') + '-explode -' + operation + ' mask.json'));
}

// Matching extents use the modern atlas polygons. Dated interior limits remain
// in the ownership mesh, including the Labrador boundary before 1927.
export async function reconcileNorthAmerica({land, gray, faces, configs, years, features, load}) {
  let current = faces;
  const firstYear = new Map();
  for (const [year, entry] of Object.entries(years)) {
    if (!firstYear.has(entry.config)) firstYear.set(entry.config, +year);
  }
  const signatures = new Map();
  const signatureFor = f => configs.map(config => config.face[f] ?? -1);
  for (const {properties: {f}} of current.features) signatures.set(signatureFor(f).join(','), f);
  function faceFor(assignment) {
    if (assignment.every(index => index < 0)) return null;
    const signature = assignment.join(',');
    if (signatures.has(signature)) return signatures.get(signature);
    const f = features.length;
    features.push({type: 'Feature', properties: {f, sharedSource: true}, geometry: empty()});
    configs.forEach((config, i) => config.face.push(assignment[i]));
    signatures.set(signature, f);
    return f;
  }
  const indexOf = (config, id) => config.units.findIndex(unit => unit.id === id);
  const owner = (config, id) => id ? indexOf(config, id) : -1;

  async function replace(mask, assign, label) {
    if (!mask.features.length) return;
    console.log('Sharing modern geometry for', label);
    const boxes = mask.features.map(feature => geographicBounds(feature.geometry));
    const bounds = [
      [Math.min(...boxes.map(box=>box[0][0])),Math.min(...boxes.map(box=>box[0][1]))],
      [Math.max(...boxes.map(box=>box[1][0])),Math.max(...boxes.map(box=>box[1][1]))]
    ];
    const affected = [], untouched = [];
    for (const feature of current.features) {
      const box = geographicBounds(feature.geometry);
      const intersects = box[0][0]<=bounds[1][0]&&box[1][0]>=bounds[0][0]&&box[0][1]<=bounds[1][1]&&box[1][1]>=bounds[0][1];
      (intersects ? affected : untouched).push(feature);
    }
    const inside = await overlay(fc(affected), mask, 'clip');
    const outside = await overlay(fc(affected), mask, 'erase');
    const covered = await dissolve(inside.features);
    const missing = await overlay(mask, covered, 'erase');
    const assigned = [...inside.features, ...missing.features.map(f => ({...f, properties: {f: -1}}))]
      .flatMap(feature => {
        const original = signatureFor(feature.properties.f);
        const assignment = configs.map((config, i) => assign(config, firstYear.get(i), original[i]));
        const f = faceFor(assignment);
        return f === null ? [] : [{...feature, properties: {f}}];
      });
    current = fc([...untouched,...outside.features, ...assigned]);
  }

  const canada = (await load('europe/canada/first.bin')).regions;
  const province = id => fc(canada.features.filter(f => f.properties.id === id));
  const nl = (await load('europe/canada/second/CA-NL.bin')).regions;
  // The census divisions share the province's source coastline and separate
  // the island from Labrador without cutting either with a latitude rectangle.
  const islandDivisions = new Set(Array.from({length: 9}, (_, i) => 'CA-CD-100' + (i + 1)));
  const island = await overlay(await dissolve(nl.features.filter(f => islandDivisions.has(f.properties.id))), province('CA-NL'), 'clip');
  const labrador = await overlay(province('CA-NL'), island, 'erase');
  const ns = (await load('europe/canada/second/CA-NS.bin')).regions;
  const capeCounties = new Set(['CA-CD-1215', 'CA-CD-1216', 'CA-CD-1217', 'CA-CD-1218']);
  const cape = await overlay(await dissolve(ns.features.filter(f => capeCounties.has(f.properties.id))), province('CA-NS'), 'clip');
  const mainlandNS = await overlay(province('CA-NS'), cape, 'erase');

  const us = (await load('europe/united-states/first.bin')).regions;
  // East Florida shares the modern state's physical coast. Its dated owner
  // still comes from the timeline, so it leaves the overlay in 1783.
  await replace(fc(us.features.filter(f => f.properties.id === 'US-FL')),
    config => owner(config, 'floridas'), 'East Florida coastline');
  const ny = (await load('europe/united-states/second/US-NY.bin')).regions;
  const coastalNY = new Set(['US-COUNTY-36103', 'US-COUNTY-36059', 'US-COUNTY-36081', 'US-COUNTY-36047',
    'US-COUNTY-36085', 'US-COUNTY-36061', 'US-COUNTY-36005']);
  const newYork = await overlay(await dissolve(ny.features.filter(f => coastalNY.has(f.properties.id))),
    fc(us.features.filter(f => f.properties.id === 'US-NY')), 'clip');
  await replace(newYork, config => owner(config, 'atlantic-colonies'), 'New York coastal counties');
  await replace(fc(us.features.filter(f => f.properties.id === 'US-NJ')),
    config => owner(config, 'atlantic-colonies'), 'New Jersey and the Hudson shore');
  const atlantic = new Map();
  for (const config of configs) {
    const unit = indexOf(config,'atlantic-colonies');
    if (unit < 0) continue;
    const parts = current.features.filter(feature=>config.face[feature.properties.f]===unit);
    const key = parts.map(feature=>feature.properties.f).join(',');
    if (!atlantic.has(key)) atlantic.set(key,{parts,configs:new Set()});
    atlantic.get(key).configs.add(config);
  }
  for (const group of atlantic.values()) {
    const footprint = await dissolve(group.parts);
    const holes = fc(footprint.features.flatMap(feature=>polygons(feature.geometry).flatMap(polygon=>
      polygon.slice(1).map(ring=>({type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[ring]}})))));
    const dryHoles = await overlay(holes,land,'clip');
    await replace(dryHoles,(config,year,original)=>group.configs.has(config)&&original<0?
      owner(config,'atlantic-colonies'):original,'Atlantic interior gaps');
  }
  const anticosti=province('CA-QB').features.flatMap(f=>polygons(f.geometry)).find(p=>landIndex(p)([-63.2,49.5]));
  assert(anticosti,'Anticosti uses the modern Quebec island polygon');
  await replace(fc([{type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:anticosti}}]),
    (config,year)=>year>=1763?owner(config,'canada'):-1,'Anticosti Island');
  await replace(mainlandNS, (config, year) => owner(config, year < 1713 ? null : year < 1867 ? 'nova-scotia' : 'canada'), 'mainland Nova Scotia');
  await replace(cape, (config, year) => owner(config, year < 1763 ? null : year < 1784 ? 'nova-scotia' :
    year < 1820 ? 'cape-breton' : year < 1867 ? 'nova-scotia' : 'canada'), 'Cape Breton');
  await replace(province('CA-NB'), (config, year) => owner(config, year < 1763 ? null :
    year < 1784 ? 'nova-scotia' : year < 1867 ? 'new-brunswick' : 'canada'), 'New Brunswick');
  await replace(province('CA-PE'), (config, year) => owner(config, year < 1763 ? null :
    year < 1873 ? 'prince-edward-island' : 'canada'), 'Prince Edward Island');
  await replace(island, (config, year, original) => year < 1713 ? original : owner(config, 'newfoundland'), 'Newfoundland island');
  await replace(labrador, (config, year, original) => {
    if (year >= 1927) return owner(config, 'newfoundland');
    const unit = config.units[original];
    const includesLabrador = year >= 1763 && year < 1774 || year >= 1809;
    if (unit?.id !== 'newfoundland' || includesLabrador) return original;
    return year >= 1774 && year < 1809 ? owner(config, 'canada') : -1;
  }, 'Labrador');

  // After the 1927 ruling, the province's modern inland boundary is the dated
  // Newfoundland boundary. Remove remnants of the earlier generalization.
  const nlProvince = province('CA-NL');
  const insideNL = await overlay(current, nlProvince, 'clip');
  const outsideNL = await overlay(current, nlProvince, 'erase');
  current = fc([...insideNL.features, ...outsideNL.features.flatMap(feature => {
    const original = signatureFor(feature.properties.f);
    const assignment = configs.map((config, i) => firstYear.get(i) >= 1927 &&
      config.units[original[i]]?.id === 'newfoundland' ? owner(config, 'canada') : original[i]);
    const f = faceFor(assignment);
    return f === null ? [] : [{...feature, properties: {f}}];
  })]);
  // Repeated overlays can leave collapsed rings. Normalize those fragments
  // before the land intersection; they can otherwise invert the clip's fill.
  // No simplification or minimum-area filter is applied.
  const beforeClip = current.features.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0);
  current = await overlay(current, land, 'clip', true);
  const afterClip = current.features.reduce((n,f)=>n+geographicAreaKm2(f.geometry),0);
  assert(afterClip <= beforeClip + Math.max(.001,beforeClip*1e-8), 'Land clipping cannot grow historical coverage');
  const updated = new Set(['newfoundland','nova-scotia','cape-breton','new-brunswick','prince-edward-island']);
  const bounds = current.features.map(feature => ({f:feature.properties.f,bounds:geographicBounds(feature.geometry)}));
  for (const config of configs) for (const unit of config.units) {
    if (!updated.has(unit.id)) continue;
    const index = config.units.indexOf(unit);
    const parts = bounds.filter(part => config.face[part.f] === index);
    if (parts.length) unit.bounds = [
      [Math.min(...parts.map(part => part.bounds[0][0])),Math.min(...parts.map(part => part.bounds[0][1]))],
      [Math.max(...parts.map(part => part.bounds[1][0])),Math.max(...parts.map(part => part.bounds[1][1]))]
    ];
  }
  // Full modern water geometry also clears coarse river and inlet remnants
  // inside the historical footprint, rather than leaving gray patches.
  const cover = await dissolve([...gray, ...faces.features]);
  const water = await overlay(cover, land, 'erase');
  return {faces: current, water, neutral: land};
}
