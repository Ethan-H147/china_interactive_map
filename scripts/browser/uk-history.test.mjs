import assert from 'node:assert/strict';

const dock = '#united-kingdom-history-dock';
const readYear = `document.querySelector('${dock} .election-year strong')?.textContent`;
const fill = 'map.getLayer("united-kingdom-history-fill")';
const header = '#historical-snapshot';
const coast = 'united-kingdom-history-coast-detail';
const detailed = 'map.getLayer("'+coast+'")&&map.getPaintProperty("'+coast+'","fill-opacity")===1';
const hover = point => `currentAtlas().hoverAt(map.project(${JSON.stringify(point)}))?.en??null`;
const press = async (p, key, code) => {
  for (const type of ['keyDown', 'keyUp']) {
    await p.send('Input.dispatchKeyEvent', {type, key, code: key, windowsVirtualKeyCode: code});
  }
};
async function enter(p) {
  await p.evaluate(`void document.querySelector('${header}').click()`);
  await p.waitFor(`!!${fill}&&!!${readYear}`, {timeout: 60000});
  await p.settle();
}
async function year(p, value) {
  await p.evaluate(`void document.querySelector('${dock} [data-year="${value}"]').click()`);
  await p.waitFor(`${readYear}==="${value}"`);
  await p.waitFor('!currentAtlas().historicalMemory?.active&&!currentAtlas().historicalMemory?.queued',{timeout:35000});
  await p.settle();
}

export default [
  {
    name: 'UK annual snapshots, historical overseas search and map picking',
    options: {width: 1440, height: 960},
    async run(p, base) {
      await p.open(base, '#united-kingdom');
      assert(!await p.evaluate('performance.getEntriesByType("resource").some(r=>r.name.includes("/united-kingdom/history/borders.bin"))'));
      assert(await p.evaluate('document.querySelector("#map-view").hidden'));
      const homeLayer = 'united-kingdom-first-fill';
      const modernSource = await p.evaluate(`map.getLayer("${homeLayer}").source`);
      const modernColor = await p.evaluate(`map.getPaintProperty("${homeLayer}", "fill-color")`);
      await enter(p);
      assert.equal(await p.evaluate(`map.getLayer("${homeLayer}").source`), modernSource);
      assert(await p.evaluate(`JSON.stringify(map.getPaintProperty("${homeLayer}", "fill-color")).includes("GB-R-TLM")`));
      assert.equal(await p.evaluate(readYear), '1707');
      assert.equal(await p.evaluate('map.getLayer("united-kingdom-history-selected-fill").source'), 'united-kingdom-history-faces');
      assert(!await p.evaluate('!!map.getSource("united-kingdom-history-highlight")'));
      assert.match(await p.evaluate('map.getSource("united-kingdom-history-edges").serialize().data'), /adjacent=1/);
      assert(!await p.evaluate('performance.getEntriesByType("resource").some(r=>r.name.includes("united-kingdom/history/coasts/"))'));
      assert.equal(await p.evaluate(`document.querySelectorAll('${dock} [role="option"]').length`), 319);
      assert.equal(await p.evaluate(hover([-6.26, 53.35])), 'Kingdom of Ireland');
      assert.match(await p.evaluate('document.getElementById("gb-history-summary").textContent'), /Acts of Union/);
      await p.screenshot('uk-history-1707');

      await year(p, 1708);
      await p.evaluate(`document.querySelector('${dock} [aria-selected=true]').focus()`);
      await press(p, 'ArrowRight', 39);
      await p.waitFor(`${readYear}==="1709"`);
      assert.equal(await p.evaluate(`document.querySelector('${dock} .election-needed').textContent`), 'Same map as the previous year');

      await year(p, 1801);
      assert.equal(await p.evaluate(hover([-6.26, 53.35])), 'Ireland');
      await year(p, 1922);
      assert.equal(await p.evaluate(hover([-6.26, 53.35])), null);
      assert.equal(await p.evaluate(hover([-5.93, 54.6])), 'Northern Ireland');

      await year(p, 1946);
      await p.evaluate('void map.jumpTo({center:[78,23],zoom:3.1})');
      await p.settle();
      assert.equal(await p.evaluate(hover([77.22, 28.61])), 'British Raj');
      assert(!await p.evaluate('Array.from(document.querySelectorAll("[data-atlas-country-label]")).some(e=>e.textContent.startsWith("Bangladesh"))'));
      await p.screenshot('uk-history-1946-india');
      await year(p, 1947);
      assert.equal(await p.evaluate(hover([77.22, 28.61])), null);
      assert.match(await p.evaluate('document.getElementById("gb-history-summary").textContent'), /Partition and independence/);

      await year(p, 1851);
      await p.evaluate('void map.jumpTo({center:[151.235,-33.865],zoom:12})');
      await p.waitFor(detailed, {timeout: 90000});
      await p.settle();
      assert.equal(await p.evaluate(hover([151.21,-33.87])), 'New South Wales');
      assert.equal(await p.evaluate(hover([151.243,-33.857])), null);
      assert.equal(await p.evaluate(hover([151.231,-33.8724])), 'New South Wales');
      assert.equal(await p.evaluate(hover([151.285,-33.8836])), null);
      assert.deepEqual(await p.evaluate('map.getPaintProperty("united-kingdom-history-coast-water","fill-color")'),
        await p.evaluate('map.getPaintProperty("background","background-color")'));
      assert(!await p.evaluate('map.getSource("modern-context-detail")'), 'UK history keeps just its own detailed coast source');
      await p.screenshot('uk-history-1851-sydney-coast');
      const sydneyPixel = await p.evaluate('(()=>{const p=map.project([151.231,-33.8724]),r=map.getCanvas().getBoundingClientRect();return [r.x+p.x,r.y+p.y]})()');
      await p.tap(sydneyPixel);
      await p.waitFor('document.querySelector("#gb-name").textContent==="New South Wales"');
      await p.settle();
      await p.evaluate('void map.jumpTo({center:[151.235,-33.865],zoom:12})');
      await p.waitFor(detailed, {timeout: 90000});
      await p.settle();
      const outline = 'map.getSource("united-kingdom-history-selection").serialize().data';
      await p.waitFor('typeof '+outline+'==="string"&&'+outline+'.includes("prepared=1")',{timeout:35000});
      assert.match(await p.evaluate(outline), /transform=historical-outline/);
      assert.match(await p.evaluate(outline), /coastRegion=australia/);
      assert.equal(await p.evaluate('map.getLayer("united-kingdom-history-coast-selected-fill").source'), coast);
      assert(await p.evaluate('(()=>{const q=map.project([151.231,-33.8724]);const f=map.queryRenderedFeatures(q,{layers:["'+coast+'"]})[0];return f&&map.getFeatureState({source:f.source,id:f.id}).selected;})()'));
      await year(p, 1901);
      assert.equal(await p.evaluate(hover([151.231,-33.8724])), 'Commonwealth of Australia');
      // Year handoffs release blob URLs; compare the retained geometry itself.
      const outlineHash=()=>p.evaluate('(async()=>{const source='+outline+';const url=new URLSearchParams(source.slice(source.indexOf("?")+1)).get("url");const bytes=await (await fetch(url)).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).join(",");})()');
      const federationOutline = await outlineHash();
      await year(p, 1902);
      assert.equal(await outlineHash(), federationOutline, 'An unchanged selected territory retains identical outline geometry across years');
      await year(p, 1942);
      assert.equal(await p.evaluate(hover([151.231,-33.8724])), null);

      await year(p, 1950);
      await p.evaluate('void map.jumpTo({center:[103.77,1.3],zoom:11})');
      await p.waitFor(detailed, {timeout: 90000});
      await p.settle();
      assert.equal(await p.evaluate(hover([103.85,1.29])), 'Singapore');
      assert.equal(await p.evaluate('map.getLayer("'+coast+'").metadata.atlas.historicalCoast'),'malaya','The displayed detail comes from the Malaya coast, prepared in its worker');
      assert.equal(await p.evaluate(hover([103.64,1.23])), 'Singapore');
      await p.screenshot('uk-history-1950-singapore-coast');
      await year(p, 1963);
      assert.equal(await p.evaluate(hover([103.85,1.29])), null);

      await year(p, 1842);
      await p.evaluate('void map.jumpTo({center:[114.175,22.281],zoom:12})');
      await p.waitFor('!map.getLayer("'+coast+'")');
      await p.settle();
      assert.equal(await p.evaluate(hover([114.17,22.275])), 'Hong Kong Island');
      assert.equal(await p.evaluate(hover([114.17,22.295])), null);
      assert.equal(await p.evaluate(hover([114.17,22.312])), null);
      await p.screenshot('uk-history-1842-hong-kong-coast');

      const kowloon = [114.17, 22.312], newTerritories = [114.20, 22.38];
      await year(p, 1860);
      await p.evaluate('void map.jumpTo({center:[114.17,22.34],zoom:9})');
      await p.settle();
      assert.equal(await p.evaluate(hover(kowloon)), 'Hong Kong Island and Kowloon');
      assert.equal(await p.evaluate(hover(newTerritories)), null);
      await year(p, 1996);
      assert.equal(await p.evaluate(hover(kowloon)), 'Hong Kong');
      assert.equal(await p.evaluate(hover(newTerritories)), 'Hong Kong');
      await p.evaluate(`{
        const search = document.querySelector('#gb-search');
        search.value = 'Hong Kong';
        search.dispatchEvent(new Event('input'));
      }`);
      await p.waitFor('document.querySelector("#gb-search-results button")?.textContent==="Hong Kong"');
      await p.tap('#gb-search-results button');
      await p.waitFor('document.querySelector("#gb-name").textContent==="Hong Kong"');
      await p.settle();
      assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().active'), 'united-kingdom');
      await p.screenshot('uk-history-1996-hong-kong');
      const hongKong = [114.17, 22.275];
      const xy = await p.evaluate(`(()=>{
        const q=map.project(${JSON.stringify(hongKong)}),r=map.getCanvas().getBoundingClientRect();
        return [r.x+q.x,r.y+q.y];
      })()`);
      await p.tap(xy);
      await p.waitFor('document.querySelector("#gb-name").textContent==="Hong Kong"');
      assert.equal(await p.evaluate('AtlasCountryMemory.snapshot().active'), 'united-kingdom');
      await year(p, 1997);
      assert.equal(await p.evaluate(hover(hongKong)), null);
      assert.match(await p.evaluate('document.getElementById("gb-history-summary").textContent'), /1 July 1997, Hong Kong/);

      await p.evaluate(`void document.querySelector('${header}').click()`);
      await p.waitFor(`!${fill}`);
      assert.equal(await p.evaluate(`document.querySelector('${header}').textContent`), 'Historical snapshot');
      assert(!await p.evaluate('document.querySelector("#gb-province").hidden'));
      assert.deepEqual(await p.evaluate(`map.getPaintProperty("${homeLayer}", "fill-color")`), modernColor);
      assert(await p.evaluate('document.querySelector("#map-view").hidden'));
      assert(!await p.evaluate('document.querySelector("#map-selection").dataset.hidden'));
    }
  },
  {
    name: 'UK history keeps unrelated world frontiers through the zoom handoff',
    options: {width: 1280, height: 900},
    async run(p, base) {
      await p.send('Page.addScriptToEvaluateOnNewDocument', {source: "localStorage.setItem('boundary-atlas-globe-v1','true');"});
      await p.open(base, '#united-kingdom');
      await p.waitFor('AtlasGlobeOverviewController.snapshot().ready');
      const jump = async (point, zoom) => {
        await p.evaluate('void map.jumpTo({center:'+JSON.stringify(point)+',zoom:'+zoom+'})');
        await p.settle();
      };
      const frontiers = point => p.evaluate('(()=>{const p=map.project('+JSON.stringify(point)+
        ');return map.queryRenderedFeatures([[p.x-6,p.y-6],[p.x+6,p.y+6]]).filter(f=>f.layer.metadata?.atlasInternationalBorder).map(f=>({source:f.source,...f.properties}));})()');
      const rhine = [7.800197,48.581223], mongolia = [113.704781,44.786558];
      const probes = [
        ['France–Germany', rhine, f=>f.overviewOwner==='france', f=>f.previewLayer==='france-international'],
        ['China–Mongolia', mongolia, f=>f.neighbor==='mongolia', f=>f.neighbor==='mongolia'&&f.source==='shared-context-borders']
      ];
      const checkBorders = async stage => {
        for (const [name, point, coarse, precise] of probes) for (const zoom of [3.2,4.5,9]) {
          await jump(point, zoom);
          assert((await frontiers(point)).some(zoom<4?coarse:precise), name+' at zoom '+zoom+' '+stage);
        }
      };
      await checkBorders('in the modern map');
      await enter(p);
      await checkBorders('in the historical map');
      const ireland = [-7.18883,54.337649];
      for (const zoom of [3.2,7]) {
        await jump(ireland, zoom);
        assert(!(await frontiers(ireland)).some(f=>f.overviewOwner==='united-kingdom'||f.previewLayer==='united-kingdom-international'),
          'The modern Irish frontier stays hidden before partition');
      }
      const punjab = [74.580869,31.594254];
      await year(p, 1946);
      await jump(punjab, 7);
      assert(!(await frontiers(punjab)).some(f=>f.resolvedFrontier==='IND-PAK'), 'British India omits the modern Pakistan frontier');
      await year(p, 1947);
      assert((await frontiers(punjab)).some(f=>f.resolvedFrontier==='IND-PAK'), 'The Pakistan frontier returns after partition');
      await p.evaluate('void document.querySelector("#historical-snapshot").click()');
      await p.waitFor('!map.getLayer("united-kingdom-history-fill")');
      await jump(ireland, 7);
      assert((await frontiers(ireland)).some(f=>f.previewLayer==='united-kingdom-international'), 'Leaving history restores the original UK frontier');
    }
  },
  {
    name: 'UK historical controls fit a phone and reach both endpoint years',
    options: {width: 390, height: 844, mobile: true},
    async run(p, base) {
      await p.open(base, '#united-kingdom');
      await enter(p);
      assert(await p.evaluate(`(()=>{
        const r=document.querySelector('${dock}').getBoundingClientRect();
        return r.left>=0&&r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1;
      })()`));
      await p.evaluate(`document.querySelector('${dock} [aria-selected=true]').focus()`);
      await press(p, 'End', 35);
      await p.waitFor(`${readYear}==="2025"`);
      await p.waitFor(`(()=>{
        const selected=document.querySelector('${dock} [aria-selected=true]').getBoundingClientRect();
        const strip=document.querySelector('${dock} .election-strip').getBoundingClientRect();
        return selected.left>=strip.left&&selected.right<=strip.right;
      })()`);
      assert(await p.evaluate('JSON.stringify(map.getPaintProperty("united-kingdom-first-fill", "fill-color")).includes("GB-O-BM")'));
      await p.screenshot('uk-history-2025-phone');
      await press(p, 'Home', 36);
      await p.waitFor(`${readYear}==="1707"`);
    }
  }
];
