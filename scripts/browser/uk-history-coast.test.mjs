import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeData} from '../../dist/geo-pack.mjs';
import {landIndex, lineIndex, polygons} from '../geo-index.mjs';

const source = 'united-kingdom-history-coast-detail';
const dock = '#united-kingdom-history-dock';
const modern = await decodeData(fs.readFileSync('dist/data/europe/united-states/first.bin'));
const names = new Set(['US-NY', 'US-CT', 'US-RI', 'US-MA', 'US-NJ']);
const rings = modern.regions.features.filter(f => names.has(f.properties.id)).flatMap(f => polygons(f.geometry)).flat(1);
const land = landIndex(rings);
const nearCoast = lineIndex(rings);
const points = [];
for (let x = -73.8; x < -69.8; x += .031) for (let y = 40.5; y < 42.1; y += .029) {
  const distance = nearCoast([x, y]);
  if (distance > 500 && distance < 6000) points.push([x, y]);
}
points.push([-70.1, 41.285], [-71.57, 41.18], [-70.64, 41.385]);
const expected = points.map(p => land(p));

export default [{
  name: 'New England historical fill shares the modern coastline at regional and close zoom',
  options: {width: 1440, height: 960},
  async run(p, base) {
    await p.open(base, '#united-kingdom');
    await p.evaluate('void document.querySelector("#historical-snapshot").click()');
    await p.waitFor('!!map.getLayer("united-kingdom-history-fill")');
    await p.settle();
    for (const zoom of [6.4, 7.3]) {
      await p.evaluate('void map.jumpTo(' + JSON.stringify({center: [-71.8, 41.3], zoom}) + ')');
      if(zoom>=7)await p.waitFor('map.getLayer("' + source + '")&&map.getPaintProperty("' + source + '","fill-opacity")===1', {timeout: 90000});
      await p.settle();
      const actual = await p.evaluate('(' + (samples => samples.map(point =>
        currentAtlas().hoverAt(map.project(point))?.en === 'British American colonies')).toString() + ')(' + JSON.stringify(points) + ')');
      const missing = points.filter((point, i) => expected[i] && !actual[i]);
      const overhang = points.filter((point, i) => !expected[i] && actual[i]);
      assert.deepEqual(missing, [], 'Modern dry land retains its dated owner at zoom ' + zoom);
      assert.deepEqual(overhang, [], 'Historical color follows the modern water edge at zoom ' + zoom);
      assert(!await p.evaluate('!!map.getSource("modern-context-detail")'), 'The historical view holds one coastline source');
      assert(await p.evaluate('mapScene.assertOrder()'));
      await p.screenshot('uk-history-new-england-aligned-' + zoom);
    }
    await p.evaluate('void document.querySelector(' + JSON.stringify(dock + ' [data-year="1783"]') + ').click()');
    await p.waitFor('document.querySelector("' + dock + ' .election-year strong").textContent==="1783"');
    await p.settle();
    assert.equal(await p.evaluate('currentAtlas().hoverAt(map.project([-70.2,41.7]))?.en??null'), null, 'Former colonies leave the map in the selected historical year');
  }
}];
