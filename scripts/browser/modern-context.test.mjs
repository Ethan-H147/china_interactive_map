import assert from 'node:assert/strict';

const cape = [-70.2, 41.75];
const detail = 'modern-context-detail';
const portal = 'united-states-portal-fill';
const jump = async (p, center, zoom) => {
  await p.evaluate(`void map.jumpTo(${JSON.stringify({center, zoom})})`);
  await p.settle();
};
const loaded = (p, country) => p.waitFor(`modernContext.country === ${JSON.stringify(country)}`);
const sampled = (p, layer) => p.evaluate(`(() => {
  const center = map.project(${JSON.stringify(cape)}), points = [];
  for (let y = -145; y <= 145; y += 10) for (let x = -165; x <= 165; x += 10) {
    points.push(map.queryRenderedFeatures([center.x + x, center.y + y], {layers: [${JSON.stringify(layer)}]}).length > 0);
  }
  return points;
})()`);

export default [{
  name: 'Close background geography matches the selected map and releases on exit',
  async run(p, base) {
    await p.open(base, '#russia');
    await jump(p, cape, 7);
    assert.equal(await p.evaluate(`!!map.getSource('${detail}')`), false);
    assert(!p.requests.some(url => url.endsWith('/united-states/first.bin')), 'No modern US geometry at overview zoom');

    await jump(p, cape, 10);
    await loaded(p, 'united-states');
    assert.equal(await p.evaluate('AtlasEntry.current'), 'russia');
    assert.deepEqual(await p.evaluate(`map.getFilter('${portal}')`), ['literal', false]);
    const background = await sampled(p, detail);
    assert(background.includes(true) && background.includes(false), 'The sample crosses land and water');
    assert.equal(await p.evaluate("countryAt(map.project([-70.29,41.66]))?.country"), 'united-states');
    const source = await p.evaluate(`map.getSource('${detail}').serialize().data`);
    await jump(p, [-70.23, 41.77], 10);
    assert.equal(await p.evaluate(`map.getSource('${detail}').serialize().data`), source, 'A small pan keeps the same scoped source');
    await jump(p, [-70.23, 41.77], 7.5);
    assert.equal(await p.evaluate('modernContext.country'), null, 'Zooming beyond the loaded area restores the preview');
    await jump(p, cape, 10);
    await loaded(p, 'united-states');
    await jump(p, cape, 7);
    assert.equal(await p.evaluate(`!!map.getSource('${detail}')`), false);
    assert.notDeepEqual(await p.evaluate(`map.getFilter('${portal}')`), ['literal', false]);

    await p.evaluate("location.hash='#united-states'");
    await p.waitFor("AtlasEntry.current==='united-states'");
    await p.settle();
    await jump(p, cape, 10);
    assert.deepEqual(await sampled(p, 'united-states-first-fill'), background, 'Cape Cod uses the same land and water outline');
    assert.equal(await p.evaluate("modernContext.country==='united-states'"), false);
    assert(await p.evaluate('mapScene.assertOrder()'));
  }
}];
